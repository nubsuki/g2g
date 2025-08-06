import pandas as pd
import joblib
import numpy as np
import warnings

# Suppress sklearn warnings
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
warnings.filterwarnings('ignore', message='X does not have valid feature names')

# Load the model and metadata
try:
    pipeline = joblib.load('fps_predictor.pkl')
    metadata = joblib.load('model_metadata.pkl')
    selected_features = metadata['selected_features']
    feature_selector = metadata['feature_selector']
    
    # Calculate percentage accuracy based on typical gaming FPS (60 FPS baseline)
    mae = metadata['model_performance']['mae']
    r2 = metadata['model_performance']['r2']
    
    # Using 60 FPS as baseline (typical smooth gaming target)
    accuracy_percentage = max(0, (1 - mae / 60) * 100)
    
    print("FPS Predictor loaded!")
    print(f"Model Accuracy: ±{mae:.1f} FPS ({accuracy_percentage:.1f}% accurate)")
    print(f"Reliability: {r2*100:.1f}% variance explained")
    
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

# Load lookup tables
print("Loading hardware databases...")
cpu = pd.read_csv('dataset/cpu_benchmarks.csv')
gpu = pd.read_csv('dataset/gpu_benchmarks.csv')
req = pd.read_csv('dataset/game_requirements.csv')
bench = pd.read_csv('dataset/game_benchmarks.csv')

# Build lookup tables
cpu_mc = cpu[cpu['Test_Type'] == 'Multi-core'][['Processor', 'Score', 'GHz', 'Cores']].rename(
    columns={'Processor': 'CPU', 'Score': 'CPU_Score', 'GHz': 'CPU_GHz', 'Cores': 'CPU_Cores'})

# GPU scores loading
gpu_scores = gpu[['GPU', 'Score', 'VRAM']].rename(columns={'Score': 'GPU_Score', 'VRAM': 'VRAM_GB'})

# Game requirements
req = req[['Game_Name', 'CPU', 'GPU', 'RAM', 'File_size']].copy()
req['Min_RAM_GB'] = req['RAM'].astype(int)
req['Min_File_Size_GB'] = req['File_size'].astype(int)
req['CPU'] = req['CPU'].str.strip()
req['GPU'] = req['GPU'].str.replace(r'\s*\d+GB', '', regex=True).str.strip()

req = req.merge(cpu_mc.rename(columns={'CPU': 'CPU', 'CPU_Score': 'Min_CPU_Score', 
                                      'CPU_GHz': 'Min_CPU_GHz', 'CPU_Cores': 'Min_CPU_Cores'}), 
                on='CPU', how='left')
req = req.merge(gpu_scores.rename(columns={'GPU': 'GPU', 'GPU_Score': 'Min_GPU_Score'}), 
                on='GPU', how='left')

# Fill missing values
req['Min_CPU_Score'] = req['Min_CPU_Score'].fillna(req['Min_CPU_Score'].median())
req['Min_GPU_Score'] = req['Min_GPU_Score'].fillna(req['Min_GPU_Score'].median())
req['Min_CPU_GHz'] = req['Min_CPU_GHz'].fillna(req['Min_CPU_GHz'].median())
req['Min_CPU_Cores'] = req['Min_CPU_Cores'].fillna(req['Min_CPU_Cores'].median())

def find_best_cpu_match(cpu_name):
    """Find the best CPU match with priority for exact matches"""
    # First try exact match
    exact_match = cpu_mc[cpu_mc['CPU'].str.lower() == cpu_name.lower()]
    if not exact_match.empty:
        return exact_match.iloc[0]
    
    # Then try contains match, but sort by length
    contains_match = cpu_mc[cpu_mc['CPU'].str.contains(cpu_name, case=False, na=False)]
    if not contains_match.empty:
        # Sort by length of CPU name
        contains_match = contains_match.sort_values('CPU', key=lambda x: x.str.len())
        return contains_match.iloc[0]
    
    # Finally try partial matching with first word
    partial_match = cpu_mc[cpu_mc['CPU'].str.contains(cpu_name.split()[0], case=False, na=False)]
    if not partial_match.empty:
        partial_match = partial_match.sort_values('CPU', key=lambda x: x.str.len())
        return partial_match.iloc[0]
    
    raise ValueError(f"CPU '{cpu_name}' not found")

def find_best_gpu_match(gpu_name):
    """Find the best GPU match with priority for exact matches"""
    # First try exact match (case insensitive)
    exact_match = gpu_scores[gpu_scores['GPU'].str.lower() == gpu_name.lower()]
    if not exact_match.empty:
        return exact_match.iloc[0]
    
    # Then try contains match, but sort by length
    contains_match = gpu_scores[gpu_scores['GPU'].str.contains(gpu_name, case=False, na=False)]
    if not contains_match.empty:
        # Sort by length of GPU name
        contains_match = contains_match.sort_values('GPU', key=lambda x: x.str.len())
        return contains_match.iloc[0]
    
    # Finally try partial matching with first word
    partial_match = gpu_scores[gpu_scores['GPU'].str.contains(gpu_name.split()[0], case=False, na=False)]
    if not partial_match.empty:
        partial_match = partial_match.sort_values('GPU', key=lambda x: x.str.len())
        return partial_match.iloc[0]
    
    raise ValueError(f"GPU '{gpu_name}' not found")

def predict_fps(game_name, cpu_name, gpu_name, ram_gb, resolution):
    """FPS prediction with automatic VRAM detection"""
    
    # Parse resolution
    try:
        res_w, res_h = map(int, resolution.split('x'))
    except ValueError:
        raise ValueError("Resolution must be in format 'widthxheight' (e.g., '1920x1080')")
    
    # Lookup hardware scores
    cpu_row = find_best_cpu_match(cpu_name)
    cpu_score = cpu_row['CPU_Score']
    cpu_ghz = cpu_row['CPU_GHz']
    cpu_cores = cpu_row['CPU_Cores']
    
    gpu_row = find_best_gpu_match(gpu_name)
    matched_gpu = gpu_row['GPU']
    gpu_score = gpu_row['GPU_Score']
    vram_gb = gpu_row['VRAM_GB']
    
    # Lookup game requirements
    game_match = req[req['Game_Name'].str.contains(game_name, case=False, na=False)]
    if game_match.empty:
        raise ValueError(f"Game '{game_name}' not found. Available: {', '.join(req['Game_Name'])}")
    
    req_row = game_match.iloc[0]
    min_cpu_score = req_row['Min_CPU_Score']
    min_gpu_score = req_row['Min_GPU_Score']
    min_ram_gb = req_row['Min_RAM_GB']
    min_file_size_gb = req_row['Min_File_Size_GB']
    min_cpu_ghz = req_row['Min_CPU_GHz']
    min_cpu_cores = req_row['Min_CPU_Cores']
    
    # Calculate all features
    cpu_score_ratio = cpu_score / min_cpu_score
    gpu_score_ratio = gpu_score / min_gpu_score
    ram_ratio = ram_gb / min_ram_gb
    cpu_ghz_ratio = cpu_ghz / min_cpu_ghz
    cpu_cores_ratio = cpu_cores / min_cpu_cores
    
    total_pixels = res_w * res_h
    pixel_density = total_pixels / 1000000
    aspect_ratio = res_w / res_h
    
    cpu_performance_index = cpu_score * cpu_ghz * cpu_cores
    gpu_performance_index = gpu_score * vram_gb
    overall_performance_index = cpu_performance_index + gpu_performance_index
    
    cpu_gpu_balance = cpu_score / gpu_score
    vram_efficiency = vram_gb / (total_pixels / 1000000)
    ram_efficiency = ram_gb / min_file_size_gb
    
    vram_adequacy = vram_gb / (total_pixels / 1000000)  # VRAM per megapixel
    vram_to_filesize_ratio = vram_gb / min_file_size_gb
    
    bottleneck_gpu = 1 if cpu_gpu_balance < 0.5 else 0
    bottleneck_cpu = 1 if cpu_gpu_balance > 2.0 else 0
    
    # Create feature vector
    features = {
        'GPU_Score_user': gpu_score,
        'CPU_Score_user': cpu_score,
        'VRAM_GB': vram_gb,
        'RAM_GB_user': ram_gb,
        'CPU_GHz_user': cpu_ghz,
        'CPU_Cores_user': cpu_cores,
        'cpu_score_ratio': cpu_score_ratio,
        'gpu_score_ratio': gpu_score_ratio,
        'ram_ratio': ram_ratio,
        'cpu_ghz_ratio': cpu_ghz_ratio,
        'cpu_cores_ratio': cpu_cores_ratio,
        'Total_Pixels': total_pixels,
        'Pixel_Density': pixel_density,
        'Aspect_Ratio': aspect_ratio,
        'CPU_Performance_Index': cpu_performance_index,
        'GPU_Performance_Index': gpu_performance_index,
        'Overall_Performance_Index': overall_performance_index,
        'cpu_gpu_balance': cpu_gpu_balance,
        'vram_efficiency': vram_efficiency,
        'ram_efficiency': ram_efficiency,
        'vram_adequacy': vram_adequacy,
        'vram_to_filesize_ratio': vram_to_filesize_ratio,
        'bottleneck_gpu': bottleneck_gpu,
        'bottleneck_cpu': bottleneck_cpu
    }
    
    # Create DataFrame and select features
    X_full = pd.DataFrame([features])
    X_selected = feature_selector.transform(X_full)
    
    # Predict
    fps_pred_log = pipeline.predict(X_selected)[0]
    fps_pred = np.expm1(fps_pred_log)
    
    return {
        'fps': fps_pred,
        'matched_cpu': cpu_row['CPU'],
        'matched_gpu': matched_gpu,
        'matched_game': req_row['Game_Name'],
        'vram_gb': vram_gb
    }

def get_performance_rating(fps):
    """Get performance rating based on FPS"""
    if fps >= 60:
        return "🟢 Excellent"
    elif fps >= 45:
        return "🟡 Good"
    elif fps >= 30:
        return "🟠 Acceptable"
    else:
        return "🔴 Poor"

def calculate_prediction_confidence(fps_pred):
    """Calculate confidence percentage based on FPS prediction"""
    # Calculate confidence based on the predicted FPS value
    if fps_pred >= 60:
        confidence = max(0, (1 - mae / fps_pred) * 100)
    else:
        confidence = max(0, (1 - mae / 60) * 100)
    
    return min(confidence, 99.9)  # Cap at 99.9%

def main():
    """Main interactive prediction"""
    print("\n" + "=" * 50)
    
    print("\nhardware configuration:")
    
    while True:
        try:
            game = input("\nGame: ").strip()
            if not game:
                break
                
            cpu = input("CPU: ").strip()
            gpu = input("GPU: ").strip()
            ram = float(input("RAM (GB): "))
            resolution = input("Resolution (e.g., 1920x1080): ").strip()
            
            result = predict_fps(game, cpu, gpu, ram, resolution)
            rating = get_performance_rating(result['fps'])
            confidence = calculate_prediction_confidence(result['fps'])
            
            print(f"\n=== PREDICTION RESULT ===")
            print(f"Game: {result['matched_game']}")
            print(f"CPU: {result['matched_cpu']}")
            print(f"GPU: {result['matched_gpu']} ({result['vram_gb']}GB VRAM)")
            print(f"Resolution: {resolution}")
            print(f"Predicted FPS: {result['fps']:.1f}")
            print(f"Performance: {rating}")
            
            print(f"\n=== ACCURACY METRICS ===")
            print(f"Model Accuracy: {accuracy_percentage:.1f}% (±{mae:.1f} FPS)")
            print(f"Prediction Confidence: {confidence:.1f}%")
            print(f"Model Reliability: {r2*100:.1f}%")
            
            # if user wants to try another prediction
            again = input("\nTry another prediction? (y/n): ").strip().lower()
            if again not in ['y', 'yes']:
                break
                
        except KeyboardInterrupt:
            print("\nBobaclat")
            break
        except Exception as e:
            print(f"Error: {e}")
            print("Try again or press Ctrl+C to exit.")

if __name__ == "__main__":
    main()