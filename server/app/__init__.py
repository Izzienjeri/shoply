# === ./server/app/__init__.py ===
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_restful import Api
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from .config import Config

#initializing extensions without app context
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
ma = Marshmallow()
cors = CORS()
api = Api(prefix="/api")


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    print(f"DEBUG: Connecting to DB: {app.config['SQLALCHEMY_DATABASE_URI']}") # You can keep or remove this debug print

    #initializing extensions with the app instance
    db.init_app(app)
    migrate.init_app(app,db) # Make sure db is passed here
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    api.init_app(app)
    from . import models


    #return the app
    @app.route('/')
    def index():
        return "Shoply Backend is running!"
    return app