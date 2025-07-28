import os
import shutil
from datetime import datetime
import pandas as pd
from google.cloud import firestore

# 1) Point to your service account key
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'account.json'

# 2) Initialize Firestore client
db = firestore.Client()

# 3) Define your collections <-> CSVs
collections = {
    'cpu_benchmarks':       'cpu_benchmarks.csv',
    'gpu_benchmarks':       'gpu_benchmarks.csv',
    'game_requirements':    'game_requirements.csv',
    'game_benchmarks':      'game_benchmarks.csv',
}

# 4) (Optional) Your existing column-order mapping
column_orders = {
    'cpu_benchmarks.csv':       ['Processor', 'GHz', 'Cores','Test_Type', 'Score'],
    'gpu_benchmarks.csv':       ['GPU', 'Score', 'API', 'VRAM'],
    'game_requirements.csv':    ['Game_Name', 'CPU', 'GPU', 'RAM', 'File_size', 'OS'],
    'game_benchmarks.csv':      ['Game_Name', 'CPU', 'GPU', 'VRAM', 'Mode', 'Resolution', 'RAM', 'FPS'],
}

# 5) Make a timestamped backup folder
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = os.path.join('backup', timestamp)
os.makedirs(backup_dir, exist_ok=True)

# 6) Move any old CSVs into backup/
for csv_file in collections.values():
    if os.path.exists(csv_file):
        shutil.move(csv_file, os.path.join(backup_dir, csv_file))
        print(f"Backed up `{csv_file}` -> `{backup_dir}`")

# 7) Fetch, drop `id`, reorder, and rewrite each CSV
for coll_name, csv_file in collections.items():
    print(f"\nExporting collection '{coll_name}' -> {csv_file}...")
    # pull all docs
    records = [doc.to_dict() for doc in db.collection(coll_name).stream()]
    df = pd.DataFrame(records)

    # Drop the helper 'id' field if it exists
    df.drop(columns=['id'], errors='ignore', inplace=True)

    # Apply your custom column order if you have one for this file
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
