# === ./app/resources/artwork.py ===
from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
import os
import uuid

from .. import db
from ..models import Artwork, Artist, User
# from ..schemas import artwork_schema, artworks_schema, ArtworkSchema # OLD WAY
from .. import schemas  # NEW WAY: Import the module itself
from ..decorators import admin_required

artwork_bp = Blueprint('artworks', __name__)
artwork_api = Api(artwork_bp)

# Access schemas via the module:
# artwork_schema_instance = schemas.artwork_schema
# artworks_schema_instance = schemas.artworks_schema
# ArtworkSchema_class = schemas.ArtworkSchema 
# It's better to use the instances directly if they are defined in schemas.py

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def save_artwork_image(image_file):
    if image_file and allowed_file(image_file.filename):
        filename = secure_filename(image_file.filename)
        unique_id = uuid.uuid4().hex
        file_ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"art_{unique_id}.{file_ext}"
        
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
            
        file_path = os.path.join(upload_folder, unique_filename)
        image_file.save(file_path)
        relative_path = os.path.join(os.path.basename(upload_folder), unique_filename)
        return relative_path.replace("\\", "/")
    return None


class ArtworkList(Resource):
    def get(self):
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

        if is_admin_request:
            current_app.logger.info("Admin request: Fetching all artworks for ArtworkList.")
            artworks = Artwork.query.options(joinedload(Artwork.artist)).order_by(Artwork.created_at.desc()).all()
        else:
            artworks = Artwork.query.options(joinedload(Artwork.artist))\
                .join(Artist, Artwork.artist_id == Artist.id)\
                .filter(Artwork.is_active == True, Artist.is_active == True)\
                .order_by(Artwork.created_at.desc()).all()
        
        return schemas.artworks_schema.dump(artworks), 200 # Use schemas.artworks_schema

    @admin_required
    def post(self):
        form_data = request.form.to_dict()
        image_file = request.files.get('image_file')

        if 'is_active' not in form_data:
            form_data['is_active'] = True
        else:
            form_data['is_active'] = str(form_data['is_active']).lower() in ['true', 'on', '1', 'yes']

        artist_id_val = form_data.get('artist_id')
        if artist_id_val:
            artist = Artist.query.get(artist_id_val)
            if not artist:
                abort(400, message=f"Artist with ID {artist_id_val} not found.")
        else:
             abort(400, message="artist_id is required.")

        uploaded_image_path = None
        if image_file:
            uploaded_image_path = save_artwork_image(image_file)
            if uploaded_image_path:
                form_data['image_url'] = uploaded_image_path
            else:
                return {"message": "Invalid image file or error during upload."}, 400
        elif 'image_url' in form_data and form_data['image_url']:
            pass
        else:
            if not image_file:
                 return {"message": "image_file is required for new artworks."}, 400
            form_data['image_url'] = None 

        try:
            # Use schemas.artwork_schema here
            new_artwork_instance = schemas.artwork_schema.load(form_data, session=db.session)
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400
        except Exception as e:
             current_app.logger.error(f"Unexpected error during artwork schema load: {e}", exc_info=True)
             abort(500, message="An internal error occurred during data processing.")

        try:
            db.session.add(new_artwork_instance)
            db.session.commit()
            return schemas.artwork_schema.dump(new_artwork_instance), 201 # Use schemas.artwork_schema
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating artwork in DB: {e}", exc_info=True)
            if 'foreign key constraint fails' in str(e).lower() and 'artist_id' in str(e).lower():
                 abort(400, message="Invalid artist_id provided.")
            abort(500, message="An error occurred while saving the artwork to the database.")


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
        artwork = query.get(artwork_id)

        if not artwork:
            return {"message": f"Artwork with ID {artwork_id} not found."}, 404

        if not is_admin_request:
            if not artwork.is_active or (artwork.artist and not artwork.artist.is_active):
                return {"message": f"Artwork with ID {artwork_id} not found or not active."}, 404
        
        return schemas.artwork_schema.dump(artwork), 200 # Use schemas.artwork_schema

    @admin_required
    def patch(self, artwork_id):
        artwork = Artwork.query.get_or_404(
            artwork_id, description=f"Artwork with ID {artwork_id} not found."
        )

        form_data = request.form.to_dict()
        image_file = request.files.get('image_file')
        
        if 'is_active' in form_data:
            form_data['is_active'] = str(form_data['is_active']).lower() in ['true', 'on', '1', 'yes']

        new_artist_id = form_data.get('artist_id')
        if new_artist_id and new_artist_id != artwork.artist_id:
            artist = Artist.query.get(new_artist_id)
            if not artist:
                abort(400, message=f"New artist with ID {new_artist_id} not found.")

        if image_file:
            old_image_path_abs = os.path.join(current_app.config['MEDIA_FOLDER'], artwork.image_url) if artwork.image_url else None
            
            uploaded_image_path = save_artwork_image(image_file)
            if uploaded_image_path:
                form_data['image_url'] = uploaded_image_path
                if old_image_path_abs and os.path.exists(old_image_path_abs) and artwork.image_url != uploaded_image_path:
                    try:
                        os.remove(old_image_path_abs)
                        current_app.logger.info(f"Deleted old image: {old_image_path_abs}")
                    except OSError as e:
                        current_app.logger.error(f"Error deleting old image {old_image_path_abs}: {e}")
            else:
                return {"message": "Invalid image file or error during upload for update."}, 400
        elif 'image_url' in form_data and form_data['image_url'] == "" : 
            if artwork.image_url:
                old_image_path_abs = os.path.join(current_app.config['MEDIA_FOLDER'], artwork.image_url)
                if os.path.exists(old_image_path_abs):
                    try: 
                        os.remove(old_image_path_abs)
                        current_app.logger.info(f"Deleted image {old_image_path_abs} as image_url was set to empty.")
                    except OSError as e:
                        current_app.logger.error(f"Error deleting image {old_image_path_abs}: {e}")
            form_data['image_url'] = None
        elif 'image_url' in form_data :
            pass

        try:
            # Use schemas.artwork_schema
            updated_artwork = schemas.artwork_schema.load(
                form_data,
                instance=artwork,
                partial=True, 
                session=db.session
            )
        except ValidationError as err:
             return {"message": "Validation errors", "errors": err.messages}, 400

        try:
            db.session.commit()
            refreshed_artwork = Artwork.query.options(joinedload(Artwork.artist)).get(artwork.id)
            return schemas.artwork_schema.dump(refreshed_artwork), 200 # Use schemas.artwork_schema
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
        
        if artwork.image_url:
            image_full_path = os.path.join(current_app.config['MEDIA_FOLDER'], artwork.image_url)
            if os.path.exists(image_full_path):
                try:
                    os.remove(image_full_path)
                    current_app.logger.info(f"Deleted image file {image_full_path} for artwork {artwork_id}")
                except OSError as e:
                    current_app.logger.error(f"Error deleting image file {image_full_path}: {e}")

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