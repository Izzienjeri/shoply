import os
from flask import Flask, jsonify, send_from_directory, abort, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from flask_socketio import SocketIO
from .config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
ma = Marshmallow()
socketio = SocketIO()

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

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    
    allowed_origins = [
        str(os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')).rstrip('/')
    ]
    if "http://localhost:3000" not in allowed_origins:
        allowed_origins.append("http://localhost:3000")
    
    CORS(app, 
         origins=allowed_origins, 
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"]
    )
    
    socketio.init_app(app, cors_allowed_origins=allowed_origins, async_mode='eventlet')


    from . import models

    @app.route('/media/<path:filename>')
    def serve_media(filename):
        media_folder = current_app.config.get('MEDIA_FOLDER')
        if not media_folder:
            current_app.logger.error("ERROR: MEDIA_FOLDER not configured in Flask app.")
            abort(500)
        try:
            return send_from_directory(media_folder, filename)
        except FileNotFoundError:
            current_app.logger.warning(f"Media file not found: {filename}")
            abort(404)
        except Exception as e:
            current_app.logger.error(f"Unexpected error serving file {filename}: {e}", exc_info=True)
            abort(500)

    from .resources.auth import auth_bp
    from .resources.artwork import artwork_bp
    from .resources.artist import artist_bp
    from .resources.cart import cart_bp
    from .resources.order import order_bp
    from .resources.payment import payment_bp
    from .resources.delivery import delivery_bp
    from .resources.admin_dashboard import admin_dashboard_bp 
    from .resources.search import search_bp
    from .resources.notification import notification_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(artwork_bp, url_prefix='/api/artworks')
    app.register_blueprint(artist_bp, url_prefix='/api/artists')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')
    app.register_blueprint(delivery_bp, url_prefix='/api/delivery')
    app.register_blueprint(admin_dashboard_bp, url_prefix='/api/admin/dashboard')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')

    from . import socket_events 

    @app.route('/')
    def index():
        return "Artistry Haven Backend is running!"

    return app