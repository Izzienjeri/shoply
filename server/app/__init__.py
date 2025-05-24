
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

    app.config['MEDIA_FOLDER'] = Config.MEDIA_FOLDER 
    app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
    print(f"DEBUG: Media folder (base) set to: {app.config['MEDIA_FOLDER']}")
    print(f"DEBUG: Upload folder (artworks) set to: {app.config['UPLOAD_FOLDER']}")

    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        print(f"DEBUG: Created UPLOAD_FOLDER at {app.config['UPLOAD_FOLDER']}")


    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}, r"/media/*": {"origins": "*"}})

    from . import models

    @app.route('/media/<path:filename>')
    def serve_media(filename):
        print(f"Attempting to serve media file: {filename}")
        media_folder = current_app.config.get('MEDIA_FOLDER')
        if not media_folder:
            print("ERROR: MEDIA_FOLDER not configured in Flask app.")
            abort(500)
        try:
            return send_from_directory(media_folder, filename)
        except FileNotFoundError:
            full_path = os.path.join(media_folder, filename)
            print(f"ERROR: File not found: {full_path}")
            abort(404)
        except Exception as e:
            print(f"ERROR: Unexpected error serving file {filename}: {e}")
            abort(500)


    from .resources.auth import auth_bp
    from .resources.artwork import artwork_bp
    from .resources.artist import artist_bp
    from .resources.cart import cart_bp
    from .resources.order import order_bp
    from .resources.payment import payment_bp
    from .resources.delivery import delivery_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(artwork_bp, url_prefix='/api/artworks')
    app.register_blueprint(artist_bp, url_prefix='/api/artists')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')
    app.register_blueprint(delivery_bp, url_prefix='/api/delivery')


    @app.route('/')
    def index():
        return "Shoply Artwork Backend is running!"

    return app