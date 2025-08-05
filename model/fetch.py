import os
import shutil
from datetime import datetime
import pandas as pd
from google.cloud import firestore
from google.oauth2 import service_account
from dotenv import load_dotenv
load_dotenv()

# 1) Point to your service account key
def get_google_credentials():
    if all(key in os.environ for key in ['GOOGLE_PROJECT_ID', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL']):
        service_account_info = {
            "type": os.environ.get('GOOGLE_SERVICE_ACCOUNT_TYPE', 'service_account'),
            "project_id": os.environ['GOOGLE_PROJECT_ID'],
            "private_key_id": os.environ.get('GOOGLE_PRIVATE_KEY_ID'),
            "private_key": os.environ['GOOGLE_PRIVATE_KEY'].replace('\\n', '\n'),
            "client_email": os.environ['GOOGLE_CLIENT_EMAIL'],
            "client_id": os.environ.get('GOOGLE_CLIENT_ID'),
            "auth_uri": os.environ.get('GOOGLE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
            "token_uri": os.environ.get('GOOGLE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
            "auth_provider_x509_cert_url": os.environ.get('GOOGLE_AUTH_PROVIDER_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
            "client_x509_cert_url": os.environ.get('GOOGLE_CLIENT_CERT_URL'),
            "universe_domain": os.environ.get('GOOGLE_UNIVERSE_DOMAIN', 'googleapis.com')
        }
        return service_account.Credentials.from_service_account_info(service_account_info)

# 2) Initialize Firestore client
credentials = get_google_credentials()
if credentials:
    db = firestore.Client(credentials=credentials, project=os.environ['GOOGLE_PROJECT_ID'])
else:
    raise ValueError("Missing required Google Cloud environment variables: GOOGLE_PROJECT_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL")

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
