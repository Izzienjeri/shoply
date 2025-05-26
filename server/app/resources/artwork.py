from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, asc
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from werkzeug.utils import secure_filename
import os
import uuid
from decimal import Decimal

from .. import db
from ..models import Artwork, Artist, User
from .. import schemas
from ..decorators import admin_required

artwork_bp = Blueprint('artworks', __name__)
artwork_api = Api(artwork_bp)

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
            verify_jwt_in_request(optional=True)
            user_id_from_token = get_jwt_identity()
            if user_id_from_token:
                user = User.query.get(user_id_from_token)
                if user and user.is_admin:
                    is_admin_request = True
        except Exception:
            pass

        sort_by = request.args.get('sort_by', 'created_at') 
        sort_order = request.args.get('sort_order', 'desc') 
        min_price_str = request.args.get('min_price')
        max_price_str = request.args.get('max_price')
        

        if is_admin_request:
            current_app.logger.info("Admin request: Fetching all artworks for ArtworkList with filters.")
            query = Artwork.query.options(joinedload(Artwork.artist))
        else:
            query = Artwork.query.options(joinedload(Artwork.artist))\
                .join(Artist, Artwork.artist_id == Artist.id)\
                .filter(Artwork.is_active == True, Artist.is_active == True)
        
        if min_price_str:
            try:
                min_price = Decimal(min_price_str)
                if min_price < 0:
                    abort(400, message="min_price cannot be negative.")
                query = query.filter(Artwork.price >= min_price)
            except (ValueError, TypeError):
                abort(400, message="Invalid min_price format. Must be a number.")
        
        if max_price_str:
            try:
                max_price = Decimal(max_price_str)
                if max_price < 0:
                     abort(400, message="max_price cannot be negative.")
                if min_price_str and max_price < Decimal(min_price_str):
                    abort(400, message="max_price cannot be less than min_price.")
                query = query.filter(Artwork.price <= max_price)
            except (ValueError, TypeError):
                abort(400, message="Invalid max_price format. Must be a number.")

        valid_sort_fields = {
            'name': Artwork.name,
            'price': Artwork.price,
            'created_at': Artwork.created_at
        }
        
        sort_column = valid_sort_fields.get(sort_by, Artwork.created_at)
        
        if sort_order.lower() == 'asc':
            query = query.order_by(asc(sort_column))
        elif sort_order.lower() == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        artworks = query.all()
        
        return schemas.artworks_schema.dump(artworks), 200


    @admin_required
    def post(self):
        form_data = request.form.to_dict()
        image_file = request.files.get('image_file')

        artist_id_val = form_data.get('artist_id')
        if not artist_id_val:
            abort(400, message="artist_id is required.")
        artist = Artist.query.get(artist_id_val)
        if not artist:
            abort(400, message=f"Artist with ID {artist_id_val} not found.")
        if not artist.is_active:
             abort(400, message=f"Cannot assign artwork to an inactive artist ('{artist.name}'). Activate the artist first.")

        try:
            target_stock_quantity = int(form_data.get('stock_quantity', 0))
            if target_stock_quantity < 0:
                abort(400, message="Stock quantity cannot be negative.")
        except ValueError:
            abort(400, message="Invalid stock_quantity format.")
        
        payload_is_active_val = form_data.get('is_active')
        if payload_is_active_val is None: 
            target_is_active = True 
        else:
            target_is_active = str(payload_is_active_val).lower() in ['true', 'on', '1', 'yes']

        if target_stock_quantity > 0:
            target_is_active = True 

        if not target_is_active and target_stock_quantity > 0: 
            abort(400, message="Cannot create an inactive artwork with stock. Set stock to 0 or create as active.")
        
        form_data['is_active'] = target_is_active
        form_data['stock_quantity'] = target_stock_quantity
        
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
            new_artwork_instance = schemas.artwork_schema.load(form_data, session=db.session)
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400
        except Exception as e:
             current_app.logger.error(f"Unexpected error during artwork schema load: {e}", exc_info=True)
             abort(500, message="An internal error occurred during data processing.")

        try:
            db.session.add(new_artwork_instance)
            db.session.commit()
            created_artwork = Artwork.query.options(joinedload(Artwork.artist)).get(new_artwork_instance.id)
            return schemas.artwork_schema.dump(created_artwork), 201
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
            verify_jwt_in_request(optional=True)
            user_id_from_token = get_jwt_identity()
            if user_id_from_token:
                user = User.query.get(user_id_from_token)
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
        
        return schemas.artwork_schema.dump(artwork), 200

    @admin_required
    def patch(self, artwork_id):
        current_artwork_from_db = Artwork.query.options(joinedload(Artwork.artist)).get(artwork_id)
        if not current_artwork_from_db:
            abort(404, message=f"Artwork with ID {artwork_id} not found.")

        form_data = request.form.to_dict()
        image_file = request.files.get('image_file')
        
        new_artist_id = form_data.get('artist_id')
        if new_artist_id and new_artist_id != current_artwork_from_db.artist_id:
            artist = Artist.query.get(new_artist_id)
            if not artist:
                abort(400, message=f"New artist with ID {new_artist_id} not found.")
            if not artist.is_active:
                payload_is_active_val = form_data.get('is_active', str(current_artwork_from_db.is_active))
                target_artwork_is_active = str(payload_is_active_val).lower() in ['true', 'on', '1', 'yes']
                if target_artwork_is_active:
                    abort(400, message=f"Cannot assign active artwork to an inactive artist ('{artist.name}'). Activate the artist first or deactivate the artwork.")


        target_stock_quantity_str = form_data.get('stock_quantity')
        if target_stock_quantity_str is not None:
            try:
                target_stock_quantity = int(target_stock_quantity_str)
                if target_stock_quantity < 0:
                    abort(400, message="Stock quantity cannot be negative.")
            except ValueError:
                abort(400, message="Invalid stock_quantity format.")
        else:
            target_stock_quantity = current_artwork_from_db.stock_quantity

        payload_is_active_val = form_data.get('is_active')
        if payload_is_active_val is not None:
            target_is_active = str(payload_is_active_val).lower() in ['true', 'on', '1', 'yes']
        else:
            target_is_active = current_artwork_from_db.is_active
        
        if target_stock_quantity > 0:
            target_is_active = True 
        elif target_is_active is False and target_stock_quantity > 0 :
             abort(400, message="Cannot deactivate artwork with stock. Please set stock to 0 first or in the same request.")

        form_data['is_active'] = target_is_active 
        form_data['stock_quantity'] = target_stock_quantity
        
        if image_file:
            old_image_path_abs = os.path.join(current_app.config['MEDIA_FOLDER'], current_artwork_from_db.image_url) if current_artwork_from_db.image_url else None
            uploaded_image_path = save_artwork_image(image_file)
            if uploaded_image_path:
                form_data['image_url'] = uploaded_image_path
                if old_image_path_abs and os.path.exists(old_image_path_abs) and current_artwork_from_db.image_url != uploaded_image_path:
                    try:
                        os.remove(old_image_path_abs)
                        current_app.logger.info(f"Deleted old image: {old_image_path_abs}")
                    except OSError as e:
                        current_app.logger.error(f"Error deleting old image {old_image_path_abs}: {e}")
            else:
                return {"message": "Invalid image file or error during upload for update."}, 400
        elif 'image_url' in form_data and form_data['image_url'] == "" :
            if current_artwork_from_db.image_url:
                old_image_path_abs = os.path.join(current_app.config['MEDIA_FOLDER'], current_artwork_from_db.image_url)
                if os.path.exists(old_image_path_abs):
                    try: 
                        os.remove(old_image_path_abs)
                        current_app.logger.info(f"Deleted image {old_image_path_abs} as image_url was set to empty.")
                    except OSError as e:
                        current_app.logger.error(f"Error deleting image {old_image_path_abs}: {e}")
            form_data['image_url'] = None
        
        try:
            updated_artwork_instance = schemas.artwork_schema.load(
                form_data, 
                instance=current_artwork_from_db,
                partial=True,
                session=db.session
            )
        except ValidationError as err:
             return {"message": "Validation errors", "errors": err.messages}, 400

        try:
            db.session.commit()
            refreshed_artwork = Artwork.query.options(joinedload(Artwork.artist)).get(current_artwork_from_db.id)
            return schemas.artwork_schema.dump(refreshed_artwork), 200
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