# === ./server/app/__init__.py ===
import os
from flask import Flask, jsonify, send_from_directory, abort, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
ma = Marshmallow()
cors = CORS()

BLOCKLIST = set()

@jwt.token_in_blocklist_loader
def check_if_token_in_blocklist(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return jti in BLOCKLIST


@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({"description": "Request does not contain an access token.", "error": "authorization_required"}), 401

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    print(f"DEBUG: Connecting to DB: {app.config['SQLALCHEMY_DATABASE_URI']}")

    # Define the media folder path relative to the app's root path
    # app.root_path is typically ./server/app, so '../media' goes up one level
    # and then into 'media', resulting in ./server/media
    MEDIA_FOLDER = os.path.join(app.root_path, '..', 'media')
    app.config['MEDIA_FOLDER'] = MEDIA_FOLDER
    print(f"DEBUG: Media folder set to: {app.config['MEDIA_FOLDER']}") # Add this debug print

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    # Allow requests to /media/ path as well
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}, r"/media/*": {"origins": "*"}}) # Updated CORS

    from . import models

    # --- Add Media Serving Route ---
    @app.route('/media/<path:filename>')
    def serve_media(filename):
        """Serves files from the MEDIA_FOLDER."""
        print(f"Attempting to serve media file: {filename}") # Debug print
        media_folder = current_app.config.get('MEDIA_FOLDER')
        if not media_folder:
             print("ERROR: MEDIA_FOLDER not configured in Flask app.")
             abort(500) # Internal Server Error if config is missing
        try:
            # send_from_directory is safer as it prevents accessing files outside the specified directory
            return send_from_directory(media_folder, filename)
        except FileNotFoundError:
            print(f"ERROR: File not found: {os.path.join(media_folder, filename)}") # Debug print
            abort(404)
        except Exception as e:
             print(f"ERROR: Unexpected error serving file {filename}: {e}") # Catch other potential errors
             abort(500)
    # --- End Media Serving Route ---


    from .resources.auth import auth_bp
    from .resources.product import product_bp
    from .resources.cart import cart_bp
    from .resources.order import order_bp
    from .resources.payment import payment_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(product_bp, url_prefix='/api/products')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')


    @app.route('/')
    def index():
        return "Shoply Backend is running!"

    return app