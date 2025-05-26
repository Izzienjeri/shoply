from flask import request, jsonify, Blueprint, make_response
from flask_restful import Resource, Api
from marshmallow import ValidationError

from .. import db, bcrypt
from ..models import User
from ..schemas import user_schema

from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token,
    jwt_required, 
    get_jwt, 
    get_jwt_identity,
    set_refresh_cookies,
    unset_jwt_cookies
)
from .. import BLOCKLIST

auth_bp = Blueprint('auth', __name__)
auth_api = Api(auth_bp)


class UserRegistration(Resource):
    def post(self):
        """
        Handles new user registration.
        """
        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        try:
            if 'password' not in json_data:
                 return {"message": {"password": ["Password is required for registration."]}}, 400
            
            user_instance = user_schema.load(json_data, session=db.session, unknown='EXCLUDE')

        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400
        
        if User.query.filter_by(email=user_instance.email).first():
            return {"message": "User with this email already exists"}, 409

        user_instance.set_password(json_data['password'])

        try:
            db.session.add(user_instance)
            db.session.commit()
            return {
                "message": "User created successfully",
                "user": user_schema.dump(user_instance)
            }, 201
        except Exception as e:
            db.session.rollback()
            print(f"Error during registration: {e}")
            return {"message": "An error occurred during registration."}, 500


class UserLogin(Resource):
    def post(self):
        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        email = json_data.get('email')
        password = json_data.get('password')

        if not email or not password:
            return {"message": "Email and password are required"}, 400

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            access_token = create_access_token(identity=user.id)
            refresh_token = create_refresh_token(identity=user.id)
            
            response_data = {
                "message": "Login successful",
                "access_token": access_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "is_admin": user.is_admin 
                }
            }
            resp = make_response(jsonify(response_data), 200)
            set_refresh_cookies(resp, refresh_token) 
            return resp
        else:
            return {"message": "Invalid credentials"}, 401

class TokenRefresh(Resource):
    @jwt_required(refresh=True, locations=["cookies"])
    def post(self):
        current_user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user_id)
        return {"access_token": new_access_token}, 200

class UserLogout(Resource):
    @jwt_required()
    def post(self):
        jti = get_jwt()["jti"]
        BLOCKLIST.add(jti)
        
        resp = make_response(jsonify({"message": "Successfully logged out"}), 200)
        unset_jwt_cookies(resp)
        return resp

class UserProfile(Resource):
    @jwt_required()
    def get(self):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return {"message": "User not found"}, 404
        return user_schema.dump(user), 200


auth_api.add_resource(UserRegistration, '/signup')
auth_api.add_resource(UserLogin, '/login')
auth_api.add_resource(TokenRefresh, '/refresh')
auth_api.add_resource(UserLogout, '/logout')
auth_api.add_resource(UserProfile, '/me')