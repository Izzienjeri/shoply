from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload, selectinload
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request

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
            verify_jwt_in_request(optional=True)
            user_id_from_token = get_jwt_identity()
            if user_id_from_token:
                user = User.query.get(user_id_from_token)
                if user and user.is_admin:
                    is_admin_request = True
        except Exception:
            pass

        if is_admin_request:
            current_app.logger.info("Admin request: Fetching all artists with artwork counts for ArtistList.")
            artists_query = Artist.query.options(selectinload(Artist.artworks)).order_by(Artist.name)
            artists = artists_query.all()
            for artist_obj in artists:
                 artist_obj._artworks_count_val = len(artist_obj.artworks) if artist_obj.artworks else 0
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
            created_artist = Artist.query.options(selectinload(Artist.artworks)).get(new_artist.id)
            return artist_schema.dump(created_artist), 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating artist in DB: {e}", exc_info=True)
            abort(500, message="An error occurred while saving the artist.")

class ArtistDetail(Resource):
    def get(self, artist_id):
        is_admin_request = False
        try:
            verify_jwt_in_request(optional=True)
            user_id_from_token = get_jwt_identity()
            if user_id_from_token:
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

        if not is_admin_request:
            artist.artworks_for_display = [aw for aw in artist.artworks if aw.is_active]

        artist_dump_data = artist_schema.dump(artist)

        return artist_dump_data, 200


    @admin_required
    def patch(self, artist_id):
        artist = Artist.query.get_or_404(artist_id, description=f"Artist with ID {artist_id} not found.")

        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400
        
        original_is_active_state = artist.is_active 

        try:
            updated_artist_instance = artist_schema.load(
                json_data,
                instance=artist,
                partial=True,
                session=db.session
            )
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400

        try:
            db.session.commit() 
            
            if original_is_active_state is True and updated_artist_instance.is_active is False:
                current_app.logger.info(f"Artist {artist.id} ('{artist.name}') is being deactivated. Processing associated artworks.")
                
                artworks_to_update = Artwork.query.filter_by(artist_id=updated_artist_instance.id).all()
                
                updated_artworks_count = 0
                for artwork_item in artworks_to_update:
                    if artwork_item.is_active or artwork_item.stock_quantity > 0:
                        artwork_item.is_active = False
                        artwork_item.stock_quantity = 0 
                        updated_artworks_count += 1
                        current_app.logger.info(f"Artwork {artwork_item.id} for artist {artist.id}: set inactive and stock to 0.")
                
                if updated_artworks_count > 0:
                    db.session.commit()
                    current_app.logger.info(f"Committed changes for {updated_artworks_count} artworks of deactivated artist {artist.id}.")
            
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