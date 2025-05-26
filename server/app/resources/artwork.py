from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError, fields as ma_fields
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, asc, or_
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from werkzeug.utils import secure_filename
import os
import uuid
from decimal import Decimal

from .. import db, ma
from ..models import Artwork, Artist, User
from .. import schemas
from ..decorators import admin_required
from ..socket_events import notify_artwork_update_globally

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

        sort_by_param = request.args.get('sort_by', 'created_at') 
        sort_order_param = request.args.get('sort_order', 'desc') 
        min_price_str = request.args.get('min_price')
        max_price_str = request.args.get('max_price')
        artist_id_filter = request.args.get('artist_id_filter')
        status_filter_str = request.args.get('is_active')
        
        search_query_param = request.args.get('q')


        if is_admin_request:
            query = Artwork.query.options(joinedload(Artwork.artist))
        else:
            query = Artwork.query.options(joinedload(Artwork.artist))\
                .join(Artist, Artwork.artist_id == Artist.id)\
                .filter(Artwork.is_active == True, Artist.is_active == True)
        
        if is_admin_request:
            if artist_id_filter:
                query = query.filter(Artwork.artist_id == artist_id_filter)
            
            if status_filter_str is not None and status_filter_str != "":
                is_active_filter = status_filter_str.lower() == 'true'
                query = query.filter(Artwork.is_active == is_active_filter)
        
        if min_price_str:
            try:
                min_price = Decimal(min_price_str)
                if min_price < 0: abort(400, message="min_price cannot be negative.")
                query = query.filter(Artwork.price >= min_price)
            except (ValueError, TypeError): abort(400, message="Invalid min_price format.")
        
        if max_price_str:
            try:
                max_price = Decimal(max_price_str)
                if max_price < 0: abort(400, message="max_price cannot be negative.")
                if min_price_str and max_price < Decimal(min_price_str):
                    abort(400, message="max_price cannot be less than min_price.")
                query = query.filter(Artwork.price <= max_price)
            except (ValueError, TypeError): abort(400, message="Invalid max_price format.")

        if search_query_param and is_admin_request:
            search_term = f"%{search_query_param}%"
            query = query.filter(
                or_(
                    Artwork.name.ilike(search_term),
                    Artwork.description.ilike(search_term),
                    Artist.name.ilike(search_term)
                )
            )
            if not any(isinstance(opt, joinedload) and opt.attribute is Artwork.artist for opt in query._with_options):
                if not query._legacy_setup_joins or ('artists', Artist.__table__) not in query._legacy_setup_joins:
                   query = query.join(Artist, Artwork.artist_id == Artist.id)


        valid_sort_fields = {
            'name': Artwork.name,
            'price': Artwork.price,
            'created_at': Artwork.created_at,
            'stock_quantity': Artwork.stock_quantity,
            'artist.name': Artist.name
        }
        
        sort_column = valid_sort_fields.get(sort_by_param, Artwork.created_at)
        
        if sort_by_param == 'artist.name' and not any(isinstance(opt, joinedload) and opt.attribute is Artwork.artist for opt in query._with_options):
             if not query._legacy_setup_joins or ('artists', Artist.__table__) not in query._legacy_setup_joins:
                query = query.join(Artist, Artwork.artist_id == Artist.id)


        if sort_order_param.lower() == 'asc':
            query = query.order_by(asc(sort_column))
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
            abort(400, message={"artist_id": ["Artist selection is required."]})
        artist = Artist.query.get(artist_id_val)
        if not artist:
            abort(400, message={"artist_id": [f"Artist with ID {artist_id_val} not found."]})
        
        try:
            target_stock_quantity = int(form_data.get('stock_quantity', 0))
            if target_stock_quantity < 0:
                abort(400, message={"stock_quantity": ["Stock quantity cannot be negative."]})
        except ValueError:
            abort(400, message={"stock_quantity": ["Invalid stock_quantity format."]})
        
        payload_is_active_val = form_data.get('is_active')
        if payload_is_active_val is None: 
            target_is_active = True 
        else:
            target_is_active = str(payload_is_active_val).lower() in ['true', 'on', '1', 'yes']

        if not artist.is_active and target_is_active:
             abort(400, message={"artist_id": [f"Cannot assign active artwork to an inactive artist ('{artist.name}'). Activate the artist first."]})

        if target_stock_quantity > 0:
            target_is_active = True
        elif target_is_active is False and target_stock_quantity > 0 :
            abort(400, message="Error: Inactive artwork cannot have stock.")

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
            artwork_dump = schemas.artwork_schema.dump(created_artwork)
            
            notify_artwork_update_globally(artwork_dump)
            
            return artwork_dump, 201
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
                abort(400, message={"artist_id": [f"New artist with ID {new_artist_id} not found."]})
        
        target_stock_quantity_str = form_data.get('stock_quantity')
        if target_stock_quantity_str is not None:
            try:
                target_stock_quantity = int(target_stock_quantity_str)
                if target_stock_quantity < 0:
                    abort(400, message={"stock_quantity": ["Stock quantity cannot be negative."]})
            except ValueError:
                abort(400, message={"stock_quantity": ["Invalid stock_quantity format."]})
        else:
            target_stock_quantity = current_artwork_from_db.stock_quantity

        payload_is_active_val = form_data.get('is_active')
        if payload_is_active_val is not None:
            target_artwork_is_active = str(payload_is_active_val).lower() in ['true', 'on', '1', 'yes']
        else:
            target_artwork_is_active = current_artwork_from_db.is_active
        
        artist_for_this_artwork = Artist.query.get(form_data.get('artist_id', current_artwork_from_db.artist_id))
        if not artist_for_this_artwork:
             abort(400, message="Artist not found for artwork update.")
        
        if not artist_for_this_artwork.is_active and target_artwork_is_active:
            abort(400, message={"artist_id": [f"Cannot assign/keep artwork active with an inactive artist ('{artist_for_this_artwork.name}'). Activate artist first or deactivate artwork."]})

        if target_stock_quantity > 0:
            target_artwork_is_active = True
        elif target_artwork_is_active is False and target_stock_quantity > 0 : 
            abort(400, message="Error: Inactive artwork cannot have stock.")
            
        form_data['is_active'] = target_artwork_is_active 
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
            artwork_dump = schemas.artwork_schema.dump(refreshed_artwork)
            
            notify_artwork_update_globally(artwork_dump)
            
            return artwork_dump, 200
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
        
        artwork_dump_for_delete_notification = schemas.artwork_schema.dump(artwork)
        artwork_dump_for_delete_notification['is_active'] = False
        artwork_dump_for_delete_notification['stock_quantity'] = 0
        artwork_dump_for_delete_notification['is_deleted'] = True

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
            
            notify_artwork_update_globally(artwork_dump_for_delete_notification)

            return '', 204
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting artwork {artwork_id}: {e}", exc_info=True)
            abort(500, message="An error occurred while deleting the artwork.")

class ArtworkBulkUpdateSchema(ma.Schema):
    ids = ma_fields.List(ma_fields.String(), required=True)
    action = ma_fields.String(validate=lambda val: val in ['activate', 'deactivate'], required=True)

artwork_bulk_update_schema = ArtworkBulkUpdateSchema()

class ArtworkBulkDeleteSchema(ma.Schema):
    ids = ma_fields.List(ma_fields.String(), required=True)

artwork_bulk_delete_schema = ArtworkBulkDeleteSchema()

class ArtworkBulkActions(Resource):
    @admin_required
    def patch(self):
        json_data = request.get_json()
        if not json_data:
            abort(400, message="No input data provided")
        try:
            data = artwork_bulk_update_schema.load(json_data)
        except ValidationError as err:
            abort(400, errors=err.messages)

        ids = data['ids']
        action = data['action']
        
        if not ids:
            return {"message": "No artwork IDs provided for bulk update."}, 200

        changed_artwork_ids = [] 
        artworks_to_update_query = Artwork.query.options(joinedload(Artwork.artist)).filter(Artwork.id.in_(ids))
        
        artworks_instances = artworks_to_update_query.all()
        updated_count = 0

        for artwork in artworks_instances:
            original_is_active = artwork.is_active
            original_stock = artwork.stock_quantity
            changed_this_iteration = False

            if action == 'activate':
                if artwork.artist and artwork.artist.is_active:
                    if not artwork.is_active:
                        artwork.is_active = True
                        changed_this_iteration = True
                else:
                    current_app.logger.warning(f"Bulk activate: Cannot activate artwork {artwork.id} because its artist '{artwork.artist.name if artwork.artist else artwork.artist_id}' is inactive.")
                    continue

            elif action == 'deactivate':
                if artwork.is_active:
                    artwork.is_active = False
                    artwork.stock_quantity = 0
                    changed_this_iteration = True
            
            if changed_this_iteration:
                updated_count +=1
                changed_artwork_ids.append(artwork.id)
        
        if updated_count > 0:
            try:
                db.session.commit()
                artworks_for_socket = Artwork.query.options(joinedload(Artwork.artist)).filter(Artwork.id.in_(changed_artwork_ids)).all()
                for art_instance in artworks_for_socket:
                    artwork_dump = schemas.artwork_schema.dump(art_instance)
                    notify_artwork_update_globally(artwork_dump)
                return {"message": f"Successfully {action}d {updated_count} artworks."}, 200
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Error during bulk artwork {action}: {e}", exc_info=True)
                abort(500, message=f"An error occurred during bulk {action}.")
        else:
            return {"message": f"No artworks were updated. They might already be in the target state or their artists are inactive (for activation requests)."}, 200


    @admin_required
    def post(self):
        if request.path.endswith('/bulk-delete'):
            json_data = request.get_json()
            if not json_data:
                abort(400, message="No input data provided")
            try:
                data = artwork_bulk_delete_schema.load(json_data)
            except ValidationError as err:
                abort(400, errors=err.messages)

            ids = data['ids']
            if not ids:
                 return {"message": "No artwork IDs provided for bulk delete."}, 200


            artworks_to_delete = Artwork.query.filter(Artwork.id.in_(ids)).all()
            deleted_count = 0
            deleted_artworks_for_socket = []
            
            for artwork in artworks_to_delete:
                artwork_dump = schemas.artwork_schema.dump(artwork)
                artwork_dump['is_active'] = False 
                artwork_dump['stock_quantity'] = 0
                artwork_dump['is_deleted'] = True
                deleted_artworks_for_socket.append(artwork_dump)

                if artwork.image_url:
                    image_full_path = os.path.join(current_app.config['MEDIA_FOLDER'], artwork.image_url)
                    if os.path.exists(image_full_path):
                        try:
                            os.remove(image_full_path)
                        except OSError as e:
                            current_app.logger.error(f"Error deleting image file {image_full_path} during bulk delete: {e}")
                db.session.delete(artwork)
                deleted_count += 1
            
            if deleted_count > 0:
                try:
                    db.session.commit()
                    for art_dump in deleted_artworks_for_socket:
                        notify_artwork_update_globally(art_dump) 
                    return {"message": f"Successfully deleted {deleted_count} artworks."}, 200
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Error during bulk artwork delete: {e}", exc_info=True)
                    abort(500, message="An error occurred during bulk delete.")
            else:
                return {"message": "No artworks found for the provided IDs, or no IDs provided."}, 200
        else:
            abort(405, message="Method Not Allowed. Use PATCH for activate/deactivate, or POST to /bulk-delete for deletion.")

artwork_api.add_resource(ArtworkList, '/')
artwork_api.add_resource(ArtworkDetail, '/<string:artwork_id>')
artwork_api.add_resource(ArtworkBulkActions, '/bulk-actions', endpoint='artwork_bulk_status_actions') 
artwork_api.add_resource(ArtworkBulkActions, '/bulk-actions/bulk-delete', endpoint='artwork_bulk_delete_action')