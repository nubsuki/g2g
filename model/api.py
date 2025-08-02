from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import numpy as np
import warnings
import subprocess
import sys
import threading
import time
from datetime import datetime
import requests
import re
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Suppress sklearn warnings
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
warnings.filterwarnings('ignore', message='X does not have valid feature names')

# Add these imports at the top
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize limiter
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

# Global variables to store loaded data
pipeline = None
metadata = None
selected_features = None
feature_selector = None
cpu_mc = None
gpu_scores = None
req = None
mae = None
r2 = None
accuracy_percentage = None

# Training status tracker
training_status = {
    'is_training': False,
    'start_time': None,
    'status': 'idle',
    'message': '',
    'output': '',
    'error': '',
    'progress': 0
}

def load_model_and_data():
    """Load model and data once when server starts"""
    global pipeline, metadata, selected_features, feature_selector
    global cpu_mc, gpu_scores, req, mae, r2, accuracy_percentage
    
    try:
        # Load the model and metadata
        pipeline = joblib.load('fps_predictor.pkl')
        metadata = joblib.load('model_metadata.pkl')
        selected_features = metadata['selected_features']
        feature_selector = metadata['feature_selector']
        
        # Calculate accuracy metrics
        mae = metadata['model_performance']['mae']
        r2 = metadata['model_performance']['r2']
        accuracy_percentage = max(0, (1 - mae / 60) * 100)
        
        print("FPS Predictor loaded!")
        print(f"Model Accuracy: ±{mae:.1f} FPS ({accuracy_percentage:.1f}% accurate)")
        print(f"Reliability: {r2*100:.1f}% variance explained")
        
        # Load lookup tables
        print("Loading hardware databases...")
        cpu = pd.read_csv('cpu_benchmarks.csv')
        gpu = pd.read_csv('gpu_benchmarks.csv')
        req_data = pd.read_csv('game_requirements.csv')
        
        # Build lookup tables (same as test.py)
        cpu_mc = cpu[cpu['Test_Type'] == 'Multi-core'][['Processor', 'Score', 'GHz', 'Cores']].rename(
            columns={'Processor': 'CPU', 'Score': 'CPU_Score', 'GHz': 'CPU_GHz', 'Cores': 'CPU_Cores'})

        gpu_scores = gpu[['GPU', 'Score', 'VRAM']].rename(columns={'Score': 'GPU_Score', 'VRAM': 'VRAM_GB'})

        # Game requirements
        req = req_data[['Game_Name', 'CPU', 'GPU', 'RAM', 'File_size']].copy()
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
        
        print("Hardware databases loaded successfully!")
        
    except Exception as e:
        print(f"Error loading model: {e}")
        return False
    return True

def find_best_cpu_match(cpu_name):
    """Find the best CPU match with priority for exact matches"""
    # First try exact match
    exact_match = cpu_mc[cpu_mc['CPU'].str.lower() == cpu_name.lower()]
    if not exact_match.empty:
        return exact_match.iloc[0]
    
    # Then try contains match, but sort by length
    contains_match = cpu_mc[cpu_mc['CPU'].str.contains(cpu_name, case=False, na=False)]
    if not contains_match.empty:
        contains_match = contains_match.sort_values('CPU', key=lambda x: x.str.len())
        return contains_match.iloc[0]
    
    # Finally try partial matching with first word
    try:
        partial_match = cpu_mc[cpu_mc['CPU'].str.contains(cpu_name.split()[0], case=False, na=False)]
        if not partial_match.empty:
            partial_match = partial_match.sort_values('CPU', key=lambda x: x.str.len())
            return partial_match.iloc[0]
    except:
        pass
    
    raise ValueError(f"CPU '{cpu_name}' not found")

def find_best_gpu_match(gpu_name):
    """Find the best GPU match with priority for exact matches"""
    # Clean GPU name (remove VRAM info if present)
    gpu_clean = gpu_name.replace(' (', '(').split('(')[0].strip()
    
    # First try exact match (case insensitive)
    exact_match = gpu_scores[gpu_scores['GPU'].str.lower() == gpu_clean.lower()]
    if not exact_match.empty:
        return exact_match.iloc[0]
    
    # Then try contains match, but sort by length
    contains_match = gpu_scores[gpu_scores['GPU'].str.contains(gpu_clean, case=False, na=False)]
    if not contains_match.empty:
        contains_match = contains_match.sort_values('GPU', key=lambda x: x.str.len())
        return contains_match.iloc[0]
    
    # Finally try partial matching with first word
    try:
        partial_match = gpu_scores[gpu_scores['GPU'].str.contains(gpu_clean.split()[0], case=False, na=False)]
        if not partial_match.empty:
            partial_match = partial_match.sort_values('GPU', key=lambda x: x.str.len())
            return partial_match.iloc[0]
    except:
        pass
    
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
        raise ValueError(f"Game '{game_name}' not found")
    
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
    
    vram_adequacy = vram_gb / (total_pixels / 1000000)
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
        'fps': round(float(fps_pred), 1),
        'matched_cpu': cpu_row['CPU'],
        'matched_gpu': matched_gpu,
        'matched_game': req_row['Game_Name'],
        'vram_gb': float(vram_gb),
        'cpu_score': float(cpu_score),
        'gpu_score': float(gpu_score)
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
    if fps_pred >= 60:
        confidence = max(0, (1 - mae / fps_pred) * 100)
    else:
        confidence = max(0, (1 - mae / 60) * 100)
    
    return min(confidence, 99.9)

def run_training_background():
    """Background function to run model training"""
    global training_status
    
    try:
        training_status.update({
            'status': 'training',
            'message': 'Model training in progress...',
            'start_time': datetime.now().isoformat(),
            'progress': 10
        })
        
        # Run model.py as subprocess
        process = subprocess.Popen([sys.executable, 'model.py'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE, 
                                 text=True)
        
        # Monitor progress (simple progress simulation)
        progress_steps = [20, 30, 50, 70, 85, 95]
        step_duration = 120  # 2 minutes per major step
        
        for i, progress in enumerate(progress_steps):
            time.sleep(step_duration)
            if process.poll() is not None:  # Process finished early
                break
            training_status['progress'] = progress
            training_status['message'] = f'Training in progress... ({progress}%)'
        
        # Wait for completion
        stdout, stderr = process.communicate()
        
        if process.returncode == 0:
            training_status.update({
                'status': 'completed',
                'message': 'Model training completed successfully!',
                'output': stdout,
                'progress': 100,
                'is_training': False
            })
        else:
            training_status.update({
                'status': 'failed',
                'message': 'Model training failed',
                'error': stderr,
                'is_training': False
            })
            
    except Exception as e:
        training_status.update({
            'status': 'failed',
            'message': 'Training failed with exception',
            'error': str(e),
            'is_training': False
        })

@app.route('/train-model', methods=['POST'])
@limiter.limit("1 per hour")
def train_model():
    """Start model training in background"""
    global training_status
    
    if training_status['is_training']:
        return jsonify({
            'success': False,
            'error': 'Model training is already in progress'
        }), 400
    
    # Reset status
    training_status = {
        'is_training': True,
        'start_time': datetime.now().isoformat(),
        'status': 'starting',
        'message': 'Starting model training...',
        'output': '',
        'error': '',
        'progress': 0
    }
    
    # Start training in background thread
    thread = threading.Thread(target=run_training_background)
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True,
        'message': 'Model training started in background',
        'training_id': training_status['start_time']
    })

@app.route('/training-status', methods=['GET'])
@limiter.limit("30 per minute")
def get_training_status():
    """Get current training status"""
    global training_status
    
    # Calculate elapsed time if training
    elapsed_time = None
    if training_status['start_time']:
        start = datetime.fromisoformat(training_status['start_time'])
        elapsed_time = str(datetime.now() - start).split('.')[0]  # Remove microseconds
    
    return jsonify({
        'status': training_status['status'],
        'is_training': training_status['is_training'],
        'message': training_status['message'],
        'progress': training_status['progress'],
        'elapsed_time': elapsed_time,
        'output': training_status['output'][:500] if training_status['output'] else '',  # First 500 chars
        'error': training_status['error'][:500] if training_status['error'] else ''
    })

@app.route('/predict', methods=['POST'])
@limiter.limit("10 per minute")
def predict():
    """Main prediction endpoint"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['game_name', 'cpu_name', 'gpu_name', 'ram_gb', 'resolution']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Extract data
        game_name = data['game_name']
        cpu_name = data['cpu_name']
        gpu_name = data['gpu_name']
        ram_gb = float(data['ram_gb'].replace('GB', ''))  # Handle "16GB" format
        resolution = data['resolution']
        
        # Make prediction
        result = predict_fps(game_name, cpu_name, gpu_name, ram_gb, resolution)
        
        # Add additional metrics
        fps = result['fps']
        performance_rating = get_performance_rating(fps)
        confidence = calculate_prediction_confidence(fps)
        
        response = {
            'success': True,
            'prediction': {
                'fps': fps,
                'performance_rating': performance_rating,
                'confidence': round(confidence, 1),
                'matched_cpu': result['matched_cpu'],
                'matched_gpu': result['matched_gpu'],
                'matched_game': result['matched_game'],
                'vram_gb': result['vram_gb'],
                'cpu_score': result['cpu_score'],
                'gpu_score': result['gpu_score']
            },
            'model_info': {
                'accuracy': round(accuracy_percentage, 1),
                'mae': round(mae, 1),
                'r2': round(r2 * 100, 1)
            }
        }
        
        return jsonify(response)
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/fetch-data', methods=['POST'])
@limiter.limit("1 per hour")
def fetch_data():
    """Trigger fetch.py to fetch data from Firestore"""
    try:
        # Run fetch.py as a subprocess
        result = subprocess.run([sys.executable, 'fetch.py'], 
                              capture_output=True, 
                              text=True, 
                              timeout=300)  # 5 minute timeout
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'message': 'Data fetched successfully',
                'output': result.stdout
            })
        else:
            return jsonify({
                'success': False,
                'error': f'fetch.py failed: {result.stderr}'
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Fetch operation timed out (>5 minutes)'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/games', methods=['GET'])
@limiter.limit("60 per minute")
def get_games():
    """Get list of available games"""
    try:
        games = req['Game_Name'].unique().tolist()
        games.sort()
        return jsonify({'games': games})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def scrape_protondb_with_selenium(app_id):
    """Use Selenium to scrape ProtonDB page with JavaScript execution"""
    driver = None
    try:
        print(f"Starting Selenium scraper for AppID: {app_id}")
        
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # Run in background
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Setup ChromeDriver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Navigate to ProtonDB page
        protondb_url = f"https://www.protondb.com/app/{app_id}"
        print(f"Navigating to: {protondb_url}")
        
        driver.get(protondb_url)
        
        # Wait for the page to load and find the rating
        print("Waiting for rating element to load...")
        
        try:
            # Method 1: Wait for div with alt="Rating: ..." 
            rating_element = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//div[contains(@alt, 'Rating:')]"))
            )
            
            alt_text = rating_element.get_attribute('alt')
            print(f"Found rating via alt attribute: {alt_text}")
            
            # Extract rating from alt text like "Rating: Gold"
            if 'Rating:' in alt_text:
                rating = alt_text.split('Rating:')[1].strip().lower()
                if rating in ['platinum', 'gold', 'silver', 'bronze', 'borked']:
                    print(f"Successfully extracted rating: {rating}")
                    return {
                        'tier': rating,
                        'confidence': 'high',
                        'source': 'selenium_alt'
                    }
            
        except Exception as e:
            print(f"Method 1 (Rating:) failed: {e}")
        
        try:
            # Method 2: Look for alt="Native" (for games with native Linux support)
            native_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//div[@alt='Native']"))
            )
            
            print("Found Native rating")
            return {
                'tier': 'native',
                'confidence': 'high',
                'source': 'selenium_native',
                'message': 'Game has native Linux support'
            }
            
        except Exception as e:
            print(f"Method 2 (Native) failed: {e}")
        
        try:
            # Method 3: Look for MedalSummary ExpandingSpan (fallback)
            span_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "span.MedalSummary__ExpandingSpan-sc-1fjwtnh-1, span[class*='ExpandingSpan']"))
            )
            
            span_text = span_element.text.strip().lower()
            print(f"Found rating via span text: {span_text}")
            
            if span_text == 'native':
                return {
                    'tier': 'native',
                    'confidence': 'high',
                    'source': 'selenium_span_native',
                    'message': 'Game has native Linux support'
                }
            elif span_text in ['platinum', 'gold', 'silver', 'bronze', 'borked']:
                return {
                    'tier': span_text,
                    'confidence': 'high',
                    'source': 'selenium_span'
                }
                
        except Exception as e:
            print(f"Method 3 failed: {e}")
        
        try:
            # Method 4: General search for any element containing tier words or "native"
            search_terms = ['platinum', 'gold', 'silver', 'bronze', 'borked', 'native']
            for term in search_terms:
                try:
                    element = driver.find_element(By.XPATH, f"//*[contains(text(), '{term.title()}')]")
                    if element:
                        print(f"Found term '{term}' in element: {element.tag_name}")
                        
                        if term == 'native':
                            return {
                                'tier': 'native',
                                'confidence': 'medium',
                                'source': 'selenium_text_search',
                                'message': 'Game has native Linux support'
                            }
                        else:
                            return {
                                'tier': term,
                                'confidence': 'medium',
                                'source': 'selenium_text_search'
                            }
                except:
                    continue
                    
        except Exception as e:
            print(f"Method 4 failed: {e}")
        
        print("Could not find rating with any method")
        return {
            'tier': 'unknown',
            'confidence': 'no data',
            'message': 'Could not find rating on ProtonDB page'
        }
        
    except Exception as e:
        print(f"Selenium scraping error: {e}")
        return None
        
    finally:
        if driver:
            driver.quit()
            print("Selenium driver closed")

@app.route('/protondb/<game_name>/<app_id>', methods=['GET'])
@limiter.limit("5 per minute")
def get_protondb_data_with_appid(game_name, app_id):
    """Get ProtonDB compatibility data using provided AppID"""
    try:
        print(f"Fetching ProtonDB data for: {game_name} with AppID: {app_id}")
        
        if app_id and app_id != 'null' and app_id != 'undefined' and app_id.strip():
            if app_id.isdigit():
                print(f"Using Steam AppID: {app_id}")
                
                # Try Selenium scraping first (most accurate)
                compatibility_data = scrape_protondb_with_selenium(app_id)
                
                if compatibility_data and compatibility_data.get('tier') != 'unknown':
                    return jsonify({
                        'success': True,
                        'data': {
                            'appId': app_id,
                            'title': game_name,
                            'tier': compatibility_data['tier'],
                            'confidence': compatibility_data.get('confidence', 'unknown'),
                            'source': compatibility_data.get('source', 'selenium'),
                            'message': compatibility_data.get('message')
                        }
                    })
                
                # Fallback to API if Selenium fails
                try:
                    api_url = f"https://protondb.max-p.me/games/{app_id}/reports"
                    api_response = requests.get(api_url, timeout=10)
                    if api_response.status_code == 200:
                        reports_data = api_response.json()
                        if reports_data and len(reports_data) > 0:
                            compatibility_data = process_protondb_reports(reports_data)
                            return jsonify({
                                'success': True,
                                'data': {
                                    'appId': app_id,
                                    'title': game_name,
                                    'tier': compatibility_data['tier'],
                                    'confidence': compatibility_data['confidence'],
                                    'total': compatibility_data['total_reports'],
                                    'breakdown': compatibility_data.get('breakdown', {}),
                                    'source': 'api_fallback'
                                }
                            })
                except Exception as e:
                    print(f"API fallback failed: {e}")
            
            # Handle special cases (non-numeric AppIDs)
            else:
                special_cases = {
                    "Anticheat": "Not compatible (Anti-cheat)",
                    "Riot-Anticheat": "Not compatible (Riot Vanguard)",
                    "Hoyoverse-Anticheat": "Not compatible (Hoyoverse Anti-cheat)",
                    "miHoYo-Anticheat": "Not compatible (miHoYo Anti-cheat)", 
                    "Epic": "Check Epic Games compatibility", 
                    "Origin": "Check Origin compatibility",
                    "Ubisoft": "Check Ubisoft Connect compatibility",
                    "Console-Only": "No PC version available",
                    "N/A": "Not available on Steam"
                }
                
                message = special_cases.get(app_id, f"Non-Steam game ({app_id})")
                tier = 'borked' if 'Anticheat' in app_id else 'unknown'
                
                return jsonify({
                    'success': True,
                    'data': {
                        'tier': tier,
                        'message': message,
                        'source': 'special_case'
                    }
                })
        
        return jsonify({
            'success': True,
            'data': {
                'tier': 'unknown',
                'message': 'No Steam AppID available'
            }
        })
        
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting FPS Predictor API...")
    
    # Load model and data
    if load_model_and_data():
        print("API ready to serve predictions!")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("Failed to start API - model loading failed") 