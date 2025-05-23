from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from .. import db
from ..models import Artwork, Artist, User
from ..schemas import artwork_schema, artworks_schema, admin_artwork_schema
from ..decorators import admin_required

artwork_bp = Blueprint('artworks', __name__)
artwork_api = Api(artwork_bp)


class ArtworkList(Resource):
    def get(self):
        artworks = Artwork.query.options(joinedload(Artwork.artist)).filter(Artwork.is_active == True, Artist.is_active == True).order_by(Artwork.created_at.desc()).all()
        return artworks_schema.dump(artworks), 200

    @admin_required
    def post(self):
        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        is_many = isinstance(json_data, list)

        try:
            if is_many:
                for item_data in json_data:
                    artist_id = item_data.get('artist_id')
                    if not artist_id or not Artist.query.get(artist_id):
                        abort(400, message=f"Invalid or missing artist_id: {artist_id}")
                for item in json_data:
                    item.setdefault('is_active', True)
                new_artworks = artworks_schema.load(json_data, session=db.session)
            else:
                artist_id = json_data.get('artist_id')
                if not artist_id or not Artist.query.get(artist_id):
                    abort(400, message=f"Invalid or missing artist_id: {artist_id}")
                json_data.setdefault('is_active', True)
                new_artworks = [artwork_schema.load(json_data, session=db.session)]
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400
        except Exception as e:
             current_app.logger.error(f"Unexpected error during artwork schema load: {e}", exc_info=True)
             abort(500, message="An internal error occurred during data processing.")

        if not new_artworks:
             return {"message": "No valid artwork data found after validation."}, 400

        try:
            db.session.add_all(new_artworks)
            db.session.commit()
            result = artworks_schema.dump(new_artworks) if is_many else artwork_schema.dump(new_artworks[0])
            return result, 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating artwork(s) in DB: {e}", exc_info=True)
            if 'foreign key constraint fails' in str(e).lower() and 'artist_id' in str(e).lower():
                 abort(400, message="Invalid artist_id provided.")
            abort(500, message="An error occurred while saving the artwork(s) to the database.")


class ArtworkDetail(Resource):
    def get(self, artwork_id):
        is_admin_request = False
        try:
            jwt_payload = get_jwt()
            if jwt_payload:
                user_id = get_jwt_identity()
                user = User.query.get(user_id)
                if user and user.is_admin:
                    is_admin_request = True
        except Exception:
            pass

        query = Artwork.query.options(joinedload(Artwork.artist))
        if not is_admin_request:
            query = query.filter(Artwork.is_active == True, Artist.is_active == True)
        
        artwork = query.get_or_404(
            artwork_id, description=f"Artwork with ID {artwork_id} not found or not active."
        )
        return artwork_schema.dump(artwork), 200

    @admin_required
    def patch(self, artwork_id):
        artwork = Artwork.query.get_or_404(
            artwork_id, description=f"Artwork with ID {artwork_id} not found."
        )

        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        if 'artist_id' in json_data:
             artist_id = json_data.get('artist_id')
             if not artist_id or not Artist.query.get(artist_id):
                 abort(400, message=f"Invalid artist_id provided for update: {artist_id}")

        try:
            updated_artwork = artwork_schema.load(
                json_data,
                instance=artwork,
                partial=True,
                session=db.session
            )
        except ValidationError as err:
             return {"message": "Validation errors", "errors": err.messages}, 400

        try:
            db.session.commit()
            refreshed_artwork = Artwork.query.options(joinedload(Artwork.artist)).get(artwork.id)
            return artwork_schema.dump(refreshed_artwork), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating artwork {artwork_id}: {e}", exc_info=True)
            if 'foreign key constraint fails' in str(e).lower() and 'artist_id' in str(e).lower():
                 abort(400, message="Invalid artist_id provided for update.")
            abort(500, message="An error occurred while updating the artwork.")

    @admin_required
    def delete(self, artwork_id):
        artwork = Artwork.query.get_or_404(
             artwork_id, description=f"Artwork with ID {artwork_id} not found."
        )
        try:
            db.session.delete(artwork)
            db.session.commit()
            return '', 204
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting artwork {artwork_id}: {e}", exc_info=True)
            abort(500, message="An error occurred while deleting the artwork.")

artwork_api.add_resource(ArtworkList, '/')
artwork_api.add_resource(ArtworkDetail, '/<string:artwork_id>')