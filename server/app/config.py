import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    DATABASE_USER = os.getenv('DATABASE_USER')
    DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD')
    DATABASE_HOST = os.getenv('DATABASE_HOST')
    DATABASE_PORT = os.getenv('DATABASE_PORT')
    DATABASE_NAME = os.getenv('DATABASE_NAME')
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
    )

    JWT_TOKEN_LOCATION = ["headers"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    JWT_REFRESH_COOKIE_PATH = "/api/auth/refresh"
    JWT_COOKIE_SECURE = os.getenv('FLASK_ENV') == 'production'
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_HTTPONLY = True

    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']

    DARAJA_ENVIRONMENT = os.getenv('DARAJA_ENVIRONMENT', 'sandbox')
    DARAJA_CONSUMER_KEY = os.getenv('DARAJA_CONSUMER_KEY')
    DARAJA_CONSUMER_SECRET = os.getenv('DARAJA_CONSUMER_SECRET')
    DARAJA_SHORTCODE = os.getenv('DARAJA_SHORTCODE')
    DARAJA_PASSKEY = os.getenv('DARAJA_PASSKEY')
    DARAJA_TRANSACTION_TYPE = os.getenv('DARAJA_TRANSACTION_TYPE', 'CustomerPayBillOnline')
    DARAJA_CALLBACK_URL_BASE = os.getenv('DARAJA_CALLBACK_URL_BASE')

    if DARAJA_ENVIRONMENT == 'production':
        DARAJA_AUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        DARAJA_STK_PUSH_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    else:
        DARAJA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        DARAJA_STK_PUSH_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

    DARAJA_CALLBACK_URL = f"{DARAJA_CALLBACK_URL_BASE.rstrip('/')}/api/payments/callback"


    if not all([DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE, DARAJA_PASSKEY, DARAJA_CALLBACK_URL_BASE]):
        print("WARNING: Essential Daraja configuration missing in environment variables!")

    APP_ROOT = os.path.dirname(os.path.abspath(__file__))
    MEDIA_FOLDER = os.path.join(APP_ROOT, '..', 'media')
    UPLOAD_FOLDER = os.path.join(MEDIA_FOLDER, 'artwork_images')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}