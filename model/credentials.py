import os
from google.oauth2 import service_account
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

def get_google_credentials():
    """
    Get Google Cloud credentials from environment variables.
    Returns service account credentials if all required env vars are present.
    """
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
    return None

def get_firestore_client():
    """
    Initialize and return a Firestore client using the credentials.
    Raises ValueError if required environment variables are missing.
    """
    credentials = get_google_credentials()
    if credentials:
        return firestore.Client(credentials=credentials, project=os.environ['GOOGLE_PROJECT_ID'])
    else:
        raise ValueError("Missing required Google Cloud environment variables: GOOGLE_PROJECT_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL")
