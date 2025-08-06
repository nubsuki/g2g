import os
import shutil
from datetime import datetime
import pandas as pd
from credentials import get_firestore_client

# Initialize Firestore client
db = get_firestore_client()

# Define collections <-> CSVs
collections = {
    'cpu_benchmarks':       'dataset/cpu_benchmarks.csv',
    'gpu_benchmarks':       'dataset/gpu_benchmarks.csv',
    'game_requirements':    'dataset/game_requirements.csv',
    'game_benchmarks':      'dataset/game_benchmarks.csv',
}

# (Optional) existing column-order mapping
column_orders = {
    'dataset/cpu_benchmarks.csv':       ['Processor', 'GHz', 'Cores','Test_Type', 'Score'],
    'dataset/gpu_benchmarks.csv':       ['GPU', 'Score', 'API', 'VRAM'],
    'dataset/game_requirements.csv':    ['Game_Name', 'CPU', 'GPU', 'RAM', 'File_size', 'OS'],
    'dataset/game_benchmarks.csv':      ['Game_Name', 'CPU', 'GPU', 'VRAM', 'Mode', 'Resolution', 'RAM', 'FPS'],
}

# Make a timestamped backup folder
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = os.path.join('backup', 'data', timestamp)
os.makedirs(backup_dir, exist_ok=True)

# Move any old CSVs into backup/
for csv_file in collections.values():
    if os.path.exists(csv_file):
        shutil.move(csv_file, os.path.join(backup_dir, csv_file))
        print(f"Backed up `{csv_file}` -> `{backup_dir}`")

# Fetch, drop `id`, reorder, and rewrite each CSV
for coll_name, csv_file in collections.items():
    print(f"\nExporting collection '{coll_name}' -> {csv_file}...")
    # pull all docs
    records = [doc.to_dict() for doc in db.collection(coll_name).stream()]
    df = pd.DataFrame(records)

    # Drop the helper 'id' field if it exists
    df.drop(columns=['id'], errors='ignore', inplace=True)

    # Apply custom column order
    if csv_file in column_orders:
        desired = column_orders[csv_file]
        existing = df.columns.tolist()
        front = [c for c in desired if c in existing]
        rest  = [c for c in existing if c not in front]
        df = df[front + rest]

    # Write out the clean CSV
    df.to_csv(csv_file, index=False)
    print(f"  -> Wrote {len(df)} rows to {csv_file}")

print("\nAll done!")
