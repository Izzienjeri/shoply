from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload

from .. import db
from ..models import Artist, Artwork
from ..schemas import artist_schema, artists_schema


artist_bp = Blueprint('artists', __name__)
artist_api = Api(artist_bp)

class ArtistList(Resource):
    def get(self):
        """
        Fetches all artists.
        """
        artists = Artist.query.order_by(Artist.name).all()
        return artists_schema.dump(artists), 200

    def post(self):
        """
        Creates a new artist.
        """

        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        try:
            new_artist = artist_schema.load(json_data, session=db.session)
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400
        except Exception as e:
            print(f"Unexpected error during artist schema load: {e}")
            abort(500, message="An internal error occurred during data processing.")


        try:
            db.session.add(new_artist)
            db.session.commit()
            return artist_schema.dump(new_artist), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating artist in DB: {e}")
            abort(500, message="An error occurred while saving the artist.")

class ArtistDetail(Resource):
    def get(self, artist_id):
        """
        Fetches a single artist by UUID, including their artworks.
        """
        artist = Artist.query.options(
            joinedload(Artist.artworks)
        ).get_or_404(artist_id, description=f"Artist with ID {artist_id} not found.")

        return artist_schema.dump(artist), 200

    def patch(self, artist_id):
        """
        Updates an existing artist partially.
        """

        artist = Artist.query.get_or_404(artist_id, description=f"Artist with ID {artist_id} not found.")

        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

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
            db.session.commit()
            return artist_schema.dump(updated_artist), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error updating artist {artist_id}: {e}")
            abort(500, message="An error occurred while updating the artist.")

    def delete(self, artist_id):
        """
        Deletes an artist by UUID.
        Note: This will likely cascade delete associated artworks due to relationship setting.
        Consider consequences before enabling direct artist deletion.
        """

        artist = Artist.query.get_or_404(artist_id, description=f"Artist with ID {artist_id} not found.")


        try:
            db.session.delete(artist)
            db.session.commit()
            return '', 204
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting artist {artist_id}: {e}")
            abort(500, message="An error occurred while deleting the artist.")


artist_api.add_resource(ArtistList, '/')
artist_api.add_resource(ArtistDetail, '/<string:artist_id>')