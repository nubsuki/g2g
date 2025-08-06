import os
import shutil
from datetime import datetime
import pandas as pd
from credentials import get_firestore_client

def get_collections_config():
    """Get the collections and column order configuration"""
    # Define collections <-> CSVs
    collections = {
        'cpu_benchmarks':       'dataset/cpu_benchmarks.csv',
        'gpu_benchmarks':       'dataset/gpu_benchmarks.csv',
        'game_requirements':    'dataset/game_requirements.csv',
        'game_benchmarks':      'dataset/game_benchmarks.csv',
    }

    # Define which columns to keep for each collection (ignore unwanted fields)
    column_filters = {
        'cpu_benchmarks': [
            'Processor', 'GHz', 'Cores', 'Test_Type', 'Score'
        ],
        'gpu_benchmarks': [
            'GPU', 'Score', 'API', 'VRAM'
        ],
        'game_requirements': [
            'Game_Name', 'CPU', 'GPU', 'RAM', 'File_size', 'OS', 'Steam_AppID'
        ],
        'game_benchmarks': [
            'Game_Name', 'CPU', 'GPU', 'VRAM', 'Mode', 'Resolution', 'RAM', 'FPS'
        ],
    }

    # Column-order mapping
    column_orders = {
        'dataset/cpu_benchmarks.csv':       ['Processor', 'GHz', 'Cores','Test_Type', 'Score'],
        'dataset/gpu_benchmarks.csv':       ['GPU', 'Score', 'API', 'VRAM'],
        'dataset/game_requirements.csv':    ['Game_Name', 'CPU', 'GPU', 'RAM', 'File_size', 'OS', 'Steam_AppID'],
        'dataset/game_benchmarks.csv':      ['Game_Name', 'CPU', 'GPU', 'VRAM', 'Mode', 'Resolution', 'RAM', 'FPS'],
    }

    return collections, column_orders, column_filters

def backup_existing_data(collections, progress_callback=None):
    """Backup existing CSV files before fetching new data"""
    if progress_callback:
        progress_callback(10, "Creating backup of existing data...")
    
    # Make a timestamped backup folder
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join('backup', 'data', timestamp)
    os.makedirs(backup_dir, exist_ok=True)
    
    backed_up_files = []
    
    # Move any old CSVs into backup/
    for csv_file in collections.values():
        if os.path.exists(csv_file):
            # Extract just the filename for backup (remove dataset/ prefix)
            filename = os.path.basename(csv_file)
            backup_path = os.path.join(backup_dir, filename)
            shutil.move(csv_file, backup_path)
            backed_up_files.append(csv_file)
            print(f"Backed up `{csv_file}` -> `{backup_path}`")
    
    if progress_callback:
        progress_callback(20, f"Backed up {len(backed_up_files)} files")
    
    return backup_dir, backed_up_files

def fetch_collection_data(db, collection_name, column_filter, progress_callback=None):
    """Fetch data from a single Firestore collection with column filtering"""
    if progress_callback:
        progress_callback(-1, f"Fetching {collection_name}...")
    
    print(f"Fetching collection '{collection_name}'...")
    records = [doc.to_dict() for doc in db.collection(collection_name).stream()]
    df = pd.DataFrame(records)
    
    # Drop unwanted columns (like 'id', 'timestamp', etc.)
    unwanted_columns = ['id', 'timestamp', 'created_at', 'updated_at', 'firestore_id']
    
    # Remove unwanted columns if they exist
    for col in unwanted_columns:
        if col in df.columns:
            df.drop(columns=[col], inplace=True)
            print(f"  -> Removed unwanted column: {col}")
    
    # Filter to only keep the columns we want
    available_columns = [col for col in column_filter if col in df.columns]
    missing_columns = [col for col in column_filter if col not in df.columns]
    
    if missing_columns:
        print(f"  -> Warning: Missing columns in {collection_name}: {missing_columns}")
    
    # Keep only the columns we want
    df = df[available_columns]
    
    print(f"  -> Fetched {len(df)} records from {collection_name}")
    print(f"  -> Kept columns: {list(df.columns)}")
    
    return df

def apply_column_order(df, csv_file, column_orders):
    """Apply custom column ordering to the dataframe"""
    if csv_file in column_orders:
        desired = column_orders[csv_file]
        existing = df.columns.tolist()
        front = [c for c in desired if c in existing]
        rest = [c for c in existing if c not in front]
        df = df[front + rest]
    return df

def fetch_data_from_firestore(progress_callback=None):
    """Main function to fetch data from Firestore and save as CSV files"""
    try:
        if progress_callback:
            progress_callback(5, "Initializing Firestore client...")
        
        # Initialize Firestore client
        db = get_firestore_client()
        
        # Get configuration
        collections, column_orders, column_filters = get_collections_config()
        
        if progress_callback:
            progress_callback(10, "Backing up existing data...")
        
        # Backup existing files
        backup_dir, backed_up_files = backup_existing_data(collections, progress_callback)
        
        if progress_callback:
            progress_callback(20, "Starting data fetch from Firestore...")
        
        # Ensure dataset directory exists
        os.makedirs('dataset', exist_ok=True)
        
        # Track progress through collections
        total_collections = len(collections)
        fetched_data = {}
        
        # Fetch, drop `id`, reorder, and rewrite each CSV
        for i, (coll_name, csv_file) in enumerate(collections.items()):
            # Calculate progress (20% to 80% for fetching)
            fetch_progress = 20 + int((i / total_collections) * 60)
            
            if progress_callback:
                progress_callback(fetch_progress, f"Fetching {coll_name}...")
            
            print(f"\nExporting collection '{coll_name}' -> {csv_file}...")
            
            # Get column filter for this collection
            column_filter = column_filters.get(coll_name, [])

            # Fetch data from collection with column filtering
            df = fetch_collection_data(db, coll_name, column_filter, progress_callback)
            
            # Apply custom column order
            df = apply_column_order(df, csv_file, column_orders)
            
            # Write out the clean CSV
            df.to_csv(csv_file, index=False)
            print(f"  -> Wrote {len(df)} rows to {csv_file}")
            
            fetched_data[coll_name] = {
                'file': csv_file,
                'records': len(df),
                'columns': list(df.columns),
                'filtered_columns': column_filter
            }
        
        if progress_callback:
            progress_callback(90, "Data fetch completed successfully!")
        
        print("\nAll done!")
        
        # Calculate total records
        total_records = sum(data['records'] for data in fetched_data.values())
        
        if progress_callback:
            progress_callback(100, f"Fetched {total_records} total records")
        
        return {
            'success': True,
            'backup_dir': backup_dir,
            'backed_up_files': len(backed_up_files),
            'fetched_data': fetched_data,
            'total_records': total_records,
            'collections_updated': list(collections.keys())
        }
        
    except Exception as e:
        error_msg = f"Data fetch failed: {str(e)}"
        print(error_msg)
        if progress_callback:
            progress_callback(-1, error_msg)
        return {
            'success': False,
            'error': str(e)
        }

# Keep this for backward compatibility if someone runs the file directly
if __name__ == '__main__':
    result = fetch_data_from_firestore()
    if result['success']:
        print(f"\nSuccessfully fetched {result['total_records']} records")
        print(f"Backup created: {result['backup_dir']}")
    else:
        print(f"\nFetch failed: {result['error']}")