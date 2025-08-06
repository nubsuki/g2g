import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler
from sklearn.ensemble import VotingRegressor, RandomForestRegressor
from sklearn.feature_selection import SelectKBest, f_regression
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import joblib
import warnings
warnings.filterwarnings('ignore')
import os
import shutil
from credentials import get_firestore_client
from datetime import datetime

print("Loading datasets...")
# Load datasets
cpu = pd.read_csv('cpu_benchmarks.csv')
gpu = pd.read_csv('gpu_benchmarks.csv')
req = pd.read_csv('game_requirements.csv')
bench = pd.read_csv('game_benchmarks.csv')

print("Preprocessing data...")
# CPU preprocessing
cpu_mc = cpu[cpu['Test_Type'] == 'Multi-core'][['Processor', 'Score', 'GHz', 'Cores']].rename(
    columns={'Processor': 'CPU', 'Score': 'CPU_Score', 'GHz': 'CPU_GHz', 'Cores': 'CPU_Cores'})

# GPU preprocessing
gpu_scores = gpu[['GPU', 'Score', 'VRAM']].rename(columns={'Score': 'GPU_Score', 'VRAM': 'VRAM_GB'})

# Game requirements preprocessing
req = req[['Game_Name', 'CPU', 'GPU', 'RAM', 'File_size']].copy()
req['Min_RAM_GB'] = req['RAM'].astype(int)
req['Min_File_Size_GB'] = req['File_size'].astype(int)
req['CPU'] = req['CPU'].str.strip()
req['GPU'] = req['GPU'].str.replace(r'\s*\d+GB', '', regex=True).str.strip()

# Merge requirements with hardware specs
req = req.merge(cpu_mc.rename(columns={'CPU': 'CPU', 'CPU_Score': 'Min_CPU_Score', 
                                      'CPU_GHz': 'Min_CPU_GHz', 'CPU_Cores': 'Min_CPU_Cores'}), 
                on='CPU', how='left')
req = req.merge(gpu_scores.rename(columns={'GPU': 'GPU', 'GPU_Score': 'Min_GPU_Score'}), 
                on='GPU', how='left')

# Fill missing values with medians
req['Min_CPU_Score'] = req['Min_CPU_Score'].fillna(req['Min_CPU_Score'].median())
req['Min_GPU_Score'] = req['Min_GPU_Score'].fillna(req['Min_GPU_Score'].median())
req['Min_CPU_GHz'] = req['Min_CPU_GHz'].fillna(req['Min_CPU_GHz'].median())
req['Min_CPU_Cores'] = req['Min_CPU_Cores'].fillna(req['Min_CPU_Cores'].median())

req = req[['Game_Name', 'Min_CPU_Score', 'Min_GPU_Score', 'Min_RAM_GB', 'Min_File_Size_GB', 
           'Min_CPU_GHz', 'Min_CPU_Cores']]

print("Preparing training data...")
# Training data preparation
df = bench.copy()

# Parse VRAM from game_benchmarks.csv but also merge with cleaner GPU data
df['VRAM_GB_from_bench'] = pd.to_numeric(df['VRAM'], errors='coerce')
df['RAM_GB_user'] = df['RAM']

# Parse resolution
df[['Res_W', 'Res_H']] = df['Resolution'].str.split('x', expand=True).astype(int)

# Merge with CPU data
df = df.merge(cpu_mc.rename(columns={'CPU': 'CPU', 'CPU_Score': 'CPU_Score_user', 
                                    'CPU_GHz': 'CPU_GHz_user', 'CPU_Cores': 'CPU_Cores_user'}), 
              on='CPU', how='left')

# Merge with GPU data
df = df.merge(gpu_scores.rename(columns={'GPU': 'GPU', 'GPU_Score': 'GPU_Score_user', 'VRAM_GB': 'VRAM_GB_clean'}), 
              on='GPU', how='left')

# Merge with requirements
df = df.merge(req, on='Game_Name', how='left')

# Fill missing values
df['CPU_Score_user'] = df['CPU_Score_user'].fillna(df['CPU_Score_user'].median())
df['GPU_Score_user'] = df['GPU_Score_user'].fillna(df['GPU_Score_user'].median())
df['CPU_GHz_user'] = df['CPU_GHz_user'].fillna(df['CPU_GHz_user'].median())
df['CPU_Cores_user'] = df['CPU_Cores_user'].fillna(df['CPU_Cores_user'].median())

# Use clean VRAM data from gpu_benchmarks.csv, fallback to game_benchmarks.csv
df['VRAM_GB'] = df['VRAM_GB_clean'].fillna(df['VRAM_GB_from_bench'])
df['VRAM_GB'] = df['VRAM_GB'].fillna(df['VRAM_GB'].median())

print("Engineering features...")
# Feature engineering
df['cpu_score_ratio'] = df['CPU_Score_user'] / df['Min_CPU_Score']
df['gpu_score_ratio'] = df['GPU_Score_user'] / df['Min_GPU_Score']
df['ram_ratio'] = df['RAM_GB_user'] / df['Min_RAM_GB']
df['cpu_ghz_ratio'] = df['CPU_GHz_user'] / df['Min_CPU_GHz']
df['cpu_cores_ratio'] = df['CPU_Cores_user'] / df['Min_CPU_Cores']

# Additional features
df['Total_Pixels'] = df['Res_W'] * df['Res_H']
df['Pixel_Density'] = df['Total_Pixels'] / 1000000  # In megapixels
df['Aspect_Ratio'] = df['Res_W'] / df['Res_H']

# Performance indicators
df['CPU_Performance_Index'] = df['CPU_Score_user'] * df['CPU_GHz_user'] * df['CPU_Cores_user']
df['GPU_Performance_Index'] = df['GPU_Score_user'] * df['VRAM_GB']
df['Overall_Performance_Index'] = df['CPU_Performance_Index'] + df['GPU_Performance_Index']

# Bottleneck detection
df['cpu_gpu_balance'] = df['CPU_Score_user'] / df['GPU_Score_user']
df['potential_bottleneck'] = np.where(df['cpu_gpu_balance'] < 0.5, 'GPU_Bottleneck',
                                     np.where(df['cpu_gpu_balance'] > 2.0, 'CPU_Bottleneck', 'Balanced'))

# Memory efficiency
df['vram_efficiency'] = df['VRAM_GB'] / (df['Total_Pixels'] / 1000000)
df['ram_efficiency'] = df['RAM_GB_user'] / df['Min_File_Size_GB']

# VRAM adequacy features (using cleaner VRAM data)
df['vram_adequacy'] = df['VRAM_GB'] / (df['Total_Pixels'] / 1000000)  # VRAM per megapixel
df['vram_to_filesize_ratio'] = df['VRAM_GB'] / df['Min_File_Size_GB']

# Filter data - more lenient filtering
df_train = df[(df['cpu_score_ratio'] >= 0.8) & (df['gpu_score_ratio'] >= 0.8) & 
              (df['ram_ratio'] >= 0.8)].copy()

print(f"Training data size after filtering: {len(df_train)} rows")
print(f"VRAM data quality: {(1 - df_train['VRAM_GB'].isna().sum() / len(df_train)) * 100:.1f}% complete")

# Outlier removal using IQR
def remove_outliers(df, column, factor=1.5):
    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - factor * IQR
    upper_bound = Q3 + factor * IQR
    return df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]

df_train = remove_outliers(df_train, 'FPS', factor=2.0)  # More lenient outlier removal

print(f"Training data size after outlier removal: {len(df_train)} rows")

# Enhanced feature set
feature_cols = [
    'GPU_Score_user', 'CPU_Score_user', 'VRAM_GB', 'RAM_GB_user', 'CPU_GHz_user', 'CPU_Cores_user',
    'cpu_score_ratio', 'gpu_score_ratio', 'ram_ratio', 'cpu_ghz_ratio', 'cpu_cores_ratio',
    'Total_Pixels', 'Pixel_Density', 'Aspect_Ratio',
    'CPU_Performance_Index', 'GPU_Performance_Index', 'Overall_Performance_Index',
    'cpu_gpu_balance', 'vram_efficiency', 'ram_efficiency',
    'vram_adequacy', 'vram_to_filesize_ratio'
]

# Add bottleneck indicator as encoded feature
df_train['bottleneck_gpu'] = (df_train['potential_bottleneck'] == 'GPU_Bottleneck').astype(int)
df_train['bottleneck_cpu'] = (df_train['potential_bottleneck'] == 'CPU_Bottleneck').astype(int)
feature_cols.extend(['bottleneck_gpu', 'bottleneck_cpu'])

X = df_train[feature_cols].fillna(0)
y = df_train['FPS'].clip(upper=300)  # upper limit

print(f"Feature set size: {len(feature_cols)} features")
print(f"Target range: {y.min():.1f} - {y.max():.1f} FPS")

# Feature selection
selector = SelectKBest(score_func=f_regression, k=16)  # 16 features
X_selected = selector.fit_transform(X, y)
selected_features = [feature_cols[i] for i in selector.get_support(indices=True)]

print("Selected features:")
for i, feature in enumerate(selected_features):
    print(f"{i+1}. {feature}")

# stratified split - Added duplicates='drop' parameter
try:
    df_train['CPU_Tier'] = pd.qcut(df_train['CPU_Score_user'], q=4, labels=['Low', 'Mid', 'High', 'Ultra'], duplicates='drop')
    df_train['GPU_Tier'] = pd.qcut(df_train['GPU_Score_user'], q=4, labels=['Low', 'Mid', 'High', 'Ultra'], duplicates='drop')
    df_train['Combined_Tier'] = df_train['CPU_Tier'].astype(str) + '_' + df_train['GPU_Tier'].astype(str)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_selected, y, test_size=0.2, random_state=42, stratify=df_train['Combined_Tier']
    )
except Exception as e:
    print(f"Stratified split failed: {e}")
    print("Using random split instead...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_selected, y, test_size=0.2, random_state=42
    )

print("Training ensemble model...")
# Create ensemble with multiple algorithms
xgb_model = XGBRegressor(
    n_estimators=300, 
    learning_rate=0.03, 
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)

lgb_model = LGBMRegressor(
    n_estimators=300,
    learning_rate=0.03,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbose=-1
)

rf_model = RandomForestRegressor(
    n_estimators=200,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42
)

# Create ensemble
ensemble = VotingRegressor([
    ('xgb', xgb_model),
    ('lgb', lgb_model),
    ('rf', rf_model)
])

# Create pipeline with scaling
pipeline = Pipeline([
    ('scaler', RobustScaler()),
    ('model', ensemble)
])

# Simplified hyperparameter tuning
param_grid = {
    'model__xgb__n_estimators': [200, 300],
    'model__xgb__learning_rate': [0.01, 0.03],
    'model__xgb__max_depth': [5, 6],
    'model__lgb__n_estimators': [200, 300],
    'model__lgb__learning_rate': [0.01, 0.03],
    'model__rf__n_estimators': [150, 200]
}

print("Performing hyperparameter tuning...")
grid_search = GridSearchCV(
    pipeline, param_grid, cv=3, scoring='neg_mean_absolute_error', n_jobs=-1, verbose=2
)

# Use log transformation for better performance
y_train_log = np.log1p(y_train)
y_test_log = np.log1p(y_test)

grid_search.fit(X_train, y_train_log)
print("Best parameters:", grid_search.best_params_)
pipeline = grid_search.best_estimator_

# Evaluate model
y_pred_log = pipeline.predict(X_test)
y_pred = np.expm1(y_pred_log)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print(f"\nModel Performance:")
print(f"Test MAE: {mae:.2f} FPS")
print(f"Test RMSE: {rmse:.2f} FPS")
print(f"Test R²: {r2:.4f}")

# Cross-validation
cv_scores = cross_val_score(pipeline, X_selected, np.log1p(y), cv=5, scoring='neg_mean_absolute_error')
print(f"Cross-validated MAE: {-cv_scores.mean():.2f} ± {cv_scores.std():.2f}")

# Feature importance from XGBoost
xgb_importances = pipeline.named_steps['model'].named_estimators_['xgb'].feature_importances_
print(f"\nTop 10 Feature Importances (XGBoost):")
importance_df = pd.DataFrame({
    'feature': selected_features,
    'importance': xgb_importances
}).sort_values('importance', ascending=False)

for i, (_, row) in enumerate(importance_df.head(10).iterrows()):
    print(f"{i+1}. {row['feature']}: {row['importance']:.3f}")

# Save model and metadata
model_metadata = {
    'selected_features': selected_features,
    'feature_selector': selector,
    'model_performance': {
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'cv_mae': -cv_scores.mean()
    },
    'data_quality': {
        'vram_completeness': (1 - df_train['VRAM_GB'].isna().sum() / len(df_train)) * 100,
        'training_samples': len(df_train),
        'feature_count': len(selected_features)
    }
}

# Create backup before saving new model
print("\nBacking up existing model files...")
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = os.path.join('backup', timestamp)
os.makedirs(backup_dir, exist_ok=True)

# List of model files to backup
model_files = ['fps_predictor.pkl', 'model_metadata.pkl']

# Move old model files to backup if they exist
for model_file in model_files:
    if os.path.exists(model_file):
        shutil.move(model_file, os.path.join(backup_dir, model_file))
        print(f"Backed up `{model_file}` -> `{backup_dir}`")

# Save new model and metadata
joblib.dump(pipeline, 'fps_predictor.pkl')
joblib.dump(model_metadata, 'model_metadata.pkl')
print("\nModel saved as 'fps_predictor.pkl'")
print("Model metadata saved as 'model_metadata.pkl'")

print("\nSaving model statistics to database...")


# Initialize Firestore client
db = get_firestore_client()

# Calculate total benchmark data amount
total_cpu_data = len(cpu)
total_gpu_data = len(gpu) 
total_game_benchmark_data = len(bench)
total_benchmark_data = total_cpu_data + total_gpu_data + total_game_benchmark_data

# Calculate number of unique games
total_games_count = len(req['Game_Name'].unique())

# Calculate model accuracy percentage
model_accuracy_percentage = r2 * 100

# Calculate training data amount
training_data_amount = len(df_train)

# Prepare the statistics document
model_stats = {
    'timestamp': datetime.now(),
    'training_data_amount': training_data_amount,
    'model_accuracy_percentage': round(model_accuracy_percentage, 2),
    'total_benchmark_data': total_benchmark_data,
    'total_games_count': total_games_count,
    'breakdown': {
        'cpu_benchmark_records': total_cpu_data,
        'gpu_benchmark_records': total_gpu_data,
        'game_benchmark_records': total_game_benchmark_data,
        'unique_games': total_games_count
    },
    'model_metrics': {
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'r2_score': round(r2, 4),
        'cv_mae': round(-cv_scores.mean(), 2)
    },
    'model_info': {
        'selected_features_count': len(selected_features),
        'model_type': 'Ensemble (XGBoost + LightGBM + RandomForest)',
        'scaling_method': 'RobustScaler'
    }
}

# Save to Firestore
try:
    # Save as 'latest' (overwrites)
    doc_ref_latest = db.collection('model_stats').document('latest')
    doc_ref_latest.set(model_stats)
    
    # Also save with timestamp (for history)
    timestamp_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    doc_ref_history = db.collection('model_stats').document(timestamp_id)
    doc_ref_history.set(model_stats)
    
    print(f"✅ Model statistics saved to database successfully!")
    print(f"Latest stats updated, history saved as: {timestamp_id}")
    
except Exception as e:
    print(f"Error saving to database: {e}")
    print("Model files saved locally, but database update failed.")

print("\n Training completed successfully!")