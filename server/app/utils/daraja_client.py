import base64
import requests
from datetime import datetime
from flask import current_app, jsonify
import time

token_cache = {}

def get_daraja_access_token():
    """Fetches a new Daraja access token or returns a cached one."""
    global token_cache
    current_time = time.time()

    if token_cache and token_cache.get('expires_at', 0) > current_time:
        print("DEBUG: Using cached Daraja token")
        return token_cache['token']

    print("DEBUG: Fetching new Daraja token")
    consumer_key = current_app.config['DARAJA_CONSUMER_KEY']
    consumer_secret = current_app.config['DARAJA_CONSUMER_SECRET']
    auth_url = current_app.config['DARAJA_AUTH_URL']

    if not consumer_key or not consumer_secret:
        print("ERROR: Daraja consumer key or secret not configured.")
        return None

    try:
        response = requests.get(auth_url, auth=(consumer_key, consumer_secret))
        response.raise_for_status()
        token_data = response.json()

        expires_in = int(token_data.get('expires_in', 3599))
        token_cache = {
            'token': token_data['access_token'],
            'expires_at': current_time + expires_in - 60
        }
        print("DEBUG: Fetched and cached new Daraja token.")
        return token_data['access_token']
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Failed to get Daraja access token: {e}")
        print(f"Response status: {response.status_code if 'response' in locals() else 'N/A'}")
        print(f"Response text: {response.text if 'response' in locals() else 'N/A'}")
        return None
    except KeyError:
        print(f"ERROR: 'access_token' or 'expires_in' not found in Daraja auth response: {token_data}")
        return None


def generate_daraja_password(shortcode, passkey, timestamp):
    """Generates the Base64 encoded password for Daraja API calls."""
    password_str = f"{shortcode}{passkey}{timestamp}"
    password_bytes = password_str.encode('utf-8')
    encoded_password = base64.b64encode(password_bytes).decode('utf-8')
    return encoded_password


def initiate_stk_push(phone_number, amount, order_id, description="Shoply Purchase"):
    """Initiates an STK Push request."""
    access_token = get_daraja_access_token()
    if not access_token:
        return {"error": "Failed to obtain Daraja access token"}, 500

    stk_push_url = current_app.config['DARAJA_STK_PUSH_URL']
    shortcode = current_app.config['DARAJA_SHORTCODE']
    passkey = current_app.config['DARAJA_PASSKEY']
    callback_url = current_app.config['DARAJA_CALLBACK_URL']
    transaction_type = current_app.config['DARAJA_TRANSACTION_TYPE']

    amount = int(round(float(amount)))
    if not phone_number.startswith('254') or not phone_number.isdigit() or len(phone_number) != 12:
         print(f"ERROR: Invalid phone number format: {phone_number}")
         return {"error": "Invalid phone number format. Use 254XXXXXXXXX."}, 400

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_daraja_password(shortcode, passkey, timestamp)

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": transaction_type,
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": callback_url,
        "AccountReference": str(order_id),
        "TransactionDesc": description
    }

    print(f"DEBUG: Initiating STK Push with payload: {payload}")

    try:
        response = requests.post(stk_push_url, json=payload, headers=headers)
        response.raise_for_status()
        response_data = response.json()
        print(f"DEBUG: STK Push Response: {response_data}")
        return response_data, 200
    except requests.exceptions.RequestException as e:
        print(f"ERROR: STK Push request failed: {e}")
        print(f"Response status: {response.status_code if 'response' in locals() else 'N/A'}")
        print(f"Response text: {response.text if 'response' in locals() else 'N/A'}")
        error_message = "Failed to initiate payment."
        try:
            error_details = response.json()
            error_message = error_details.get('errorMessage', error_message)
        except:
            pass
        return {"error": error_message}, getattr(response, 'status_code', 500)
    except Exception as e:
        print(f"ERROR: Unexpected error during STK Push: {e}")
        return {"error": "An unexpected error occurred during payment initiation."}, 500