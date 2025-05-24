from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload, selectinload
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from .. import db
from ..models import Artist, Artwork, User
from ..schemas import artist_schema, artists_schema, ArtworkSchema
from ..decorators import admin_required

artist_bp = Blueprint('artists', __name__)
artist_api = Api(artist_bp)

class ArtistList(Resource):
    def get(self):
        is_admin_request = False
        try:
            jwt_payload = get_jwt()
            if jwt_payload:
                user_id_from_token = get_jwt_identity()
                user = User.query.get(user_id_from_token)
                if user and user.is_admin:
                    is_admin_request = True
        except Exception:
            pass

        if is_admin_request:
            current_app.logger.info("Admin request: Fetching all artists with artwork counts for ArtistList.")
            artists = Artist.query.options(selectinload(Artist.artworks)).order_by(Artist.name).all()
            for artist in artists:
                 artist._artworks_count_val = len(artist.artworks)
        else:
            artists = Artist.query.filter_by(is_active=True).order_by(Artist.name).all()

        return artists_schema.dump(artists), 200

    @admin_required
    def post(self):
        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        try:
            json_data.setdefault('is_active', True)
            new_artist = artist_schema.load(json_data, session=db.session)
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400
        except Exception as e:
            current_app.logger.error(f"Unexpected error during artist schema load: {e}", exc_info=True)
            abort(500, message="An internal error occurred during data processing.")

        try:
            db.session.add(new_artist)
            db.session.commit()
            return artist_schema.dump(new_artist), 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating artist in DB: {e}", exc_info=True)
            abort(500, message="An error occurred while saving the artist.")

class ArtistDetail(Resource):
    def get(self, artist_id):
        is_admin_request = False
        try:
            jwt_payload = get_jwt()
            if jwt_payload:
                user_id_from_token = get_jwt_identity()
                user = User.query.get(user_id_from_token)
                if user and user.is_admin:
                    is_admin_request = True
        except Exception:
            pass

        query = Artist.query.options(
            selectinload(Artist.artworks)
        )
        
        artist = query.get(artist_id)

        if not artist:
            return {"message": f"Artist with ID {artist_id} not found."}, 404
        
        if not is_admin_request and not artist.is_active:
             return {"message": f"Artist with ID {artist_id} not found or not active."}, 404

        if is_admin_request:
            artist_dump_data = artist_schema.dump(artist)
        else:
            active_artworks = [aw for aw in artist.artworks if aw.is_active]
            artist.artworks_for_display = active_artworks

            artist_dump_data = artist_schema.dump(artist)

            artist_dump_data['artworks'] = ArtworkSchema(many=True, exclude=("artist",)).dump(active_artworks)
            artist_dump_data['artworks_count'] = len(active_artworks)

        return artist_dump_data, 200


    @admin_required
    def patch(self, artist_id):
        artist = Artist.query.get_or_404(artist_id, description=f"Artist with ID {artist_id} not found.")

        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400
        
        is_active_in_payload = json_data.get('is_active')

        try:
            updated_artist = artist_schema.load(
                json_data,
                instance=artist,
                partial=True,
                session=db.session
            )
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400

        try:
            if is_active_in_payload is False and artist.is_active is True:
                current_app.logger.info(f"Artist {artist.id} is being deactivated. Deactivating associated artworks.")
                for artwork_item in artist.artworks:
                    artwork_item.is_active = False
                    current_app.logger.info(f"Deactivated artwork {artwork_item.id} for artist {artist.id}")
            

            db.session.commit()
            refreshed_artist = Artist.query.options(selectinload(Artist.artworks)).get(artist_id)
            return artist_schema.dump(refreshed_artist), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating artist {artist_id}: {e}", exc_info=True)
            abort(500, message="An error occurred while updating the artist.")

    @admin_required
    def delete(self, artist_id):
        artist = Artist.query.get_or_404(artist_id, description=f"Artist with ID {artist_id} not found.")
        try:
            db.session.delete(artist)
            db.session.commit()
            return '', 204
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting artist {artist_id}: {e}", exc_info=True)
            abort(500, message="An error occurred while deleting the artist.")


artist_api.add_resource(ArtistList, '/')
artist_api.add_resource(ArtistDetail, '/<string:artist_id>')