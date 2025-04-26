from flask import request, jsonify, Blueprint
from flask_restful import Resource, Api
from marshmallow import ValidationError

from .. import db, bcrypt
from ..models import User
from ..schemas import user_schema

from flask_jwt_extended import create_access_token, jwt_required, get_jwt
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
            password = json_data.get('password')
            if not password:
                 return {'message': {'password': ['Missing data for required field.']}}, 400

            user_data = user_schema.load(json_data, session=db.session, unknown='EXCLUDE')

        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400

        if User.query.filter_by(user_data.email).first():
            return {"message": "User with this email already exists"}, 409

        user = user_data

        user.set_password(password)

        try:
            db.session.add(user)
            db.session.commit()
            return {
                "message": "User created successfully",
                "user": user_schema.dump(user)
            }, 201
        except Exception as e:
            db.session.rollback()
            print(f"Error during registration: {e}")
            return {"message": "An error occurred during registration."}, 500


class UserLogin(Resource):
    def post(self):
        """
        Handles user login and JWT creation.
        """
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
            return {"message": "Login successful", "access_token": access_token}, 200
        else:
            return {"message": "Invalid credentials"}, 401


class UserLogout(Resource):
    @jwt_required()
    def post(self):
        """
        Handles user logout by blocklisting the current JWT.
        """
        jti = get_jwt()["jti"]
        BLOCKLIST.add(jti)
        return {"message": "Successfully logged out"}, 200

auth_api.add_resource(UserRegistration, '/signup')
auth_api.add_resource(UserLogin, '/login')
auth_api.add_resource(UserLogout, '/logout')
