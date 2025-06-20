from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError

from .. import db
from ..models import DeliveryOption, Order

from ..schemas import (
    delivery_options_schema_public,
    delivery_option_schema_public,
    delivery_option_schema_admin,
    delivery_options_schema_admin
)

from ..decorators import admin_required
from ..socket_events import notify_delivery_option_update_globally

delivery_bp = Blueprint('delivery', __name__)
delivery_api = Api(delivery_bp)

class DeliveryOptionList(Resource):
    def get(self):
        """
        Fetches delivery options. Publicly, only active options.
        Admins use a specific endpoint (/admin/delivery/options) which is handled by this.
        For this endpoint being generic, let's assume it could be called by admin OR public.
        A better approach would be separate endpoints or clear query param.
        For now, if it's potentially public, show active. If admin management, they get all.
        The current frontend uses this for admin, so it shows all.
        Let's keep showing all for now, as frontend admin page for delivery options uses this.
        If a public page needed to list them, it should ideally hit a different endpoint or this
        endpoint should check for admin role.
        """
        try:
            
            options = DeliveryOption.query.order_by(DeliveryOption.sort_order, DeliveryOption.name).all()
            return delivery_options_schema_admin.dump(options), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching delivery options: {e}", exc_info=True)
            return {"message": "Could not retrieve delivery options"}, 500

    @admin_required
    def post(self):
        """ Admin: Creates a new delivery option. """
        json_data = request.get_json()
        if not json_data:
            abort(400, message="No input data provided")

        try:
            json_data.setdefault('is_pickup', False)
            json_data.setdefault('active', True)
            json_data.setdefault('sort_order', 0)

            new_option = delivery_option_schema_admin.load(json_data, session=db.session)
        except ValidationError as err:
            abort(400, message="Validation errors", errors=err.messages)
        except Exception as e:
            current_app.logger.error(f"Error loading delivery option data: {e}", exc_info=True)
            abort(500, message="Error processing delivery option data.")

        try:
            db.session.add(new_option)
            db.session.commit()
            option_dump = delivery_option_schema_admin.dump(new_option)
            notify_delivery_option_update_globally(option_dump)
            return option_dump, 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating delivery option in DB: {e}", exc_info=True)
            if "UNIQUE constraint failed" in str(e) or "Duplicate entry" in str(e):
                 abort(409, message="A delivery option with this name already exists.")
            abort(500, message="An error occurred while saving the delivery option.")

class DeliveryOptionDetail(Resource):
    @admin_required
    def get(self, option_id):
        """ Admin: Fetches a specific delivery option by ID. """
        option = DeliveryOption.query.get_or_404(option_id, description=f"Delivery Option with ID {option_id} not found.")
        return delivery_option_schema_admin.dump(option), 200

    @admin_required
    def patch(self, option_id):
        """ Admin: Updates a specific delivery option. """
        option = DeliveryOption.query.get_or_404(option_id, description=f"Delivery Option with ID {option_id} not found.")
        json_data = request.get_json()
        if not json_data:
            abort(400, message="No input data provided")

        try:
            updated_option = delivery_option_schema_admin.load(
                json_data,
                instance=option,
                partial=True,
                session=db.session
            )
        except ValidationError as err:
            abort(400, message="Validation errors", errors=err.messages)
        except Exception as e:
            current_app.logger.error(f"Error loading delivery option data for update: {e}", exc_info=True)
            abort(500, message="Error processing delivery option data for update.")

        try:
            db.session.commit()
            refreshed_option = DeliveryOption.query.get(option.id)
            option_dump = delivery_option_schema_admin.dump(refreshed_option)
            notify_delivery_option_update_globally(option_dump)
            return option_dump, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating delivery option {option_id}: {e}", exc_info=True)
            if "UNIQUE constraint failed" in str(e) or "Duplicate entry" in str(e):
                 abort(409, message="A delivery option with this name already exists.")
            abort(500, message="An error occurred while updating the delivery option.")

    @admin_required
    def delete(self, option_id):
        """ Admin: Deletes a specific delivery option. """
        option = DeliveryOption.query.get_or_404(option_id, description=f"Delivery Option with ID {option_id} not found.")

        orders_using_option_count = Order.query.filter_by(delivery_option_id=option_id).count()
        if orders_using_option_count > 0:
            current_app.logger.warning(f"Attempt to delete delivery option {option_id} which is used by {orders_using_option_count} order(s).")
            abort(400, message=f"Cannot delete '{option.name}'. It is associated with {orders_using_option_count} existing order(s). Consider deactivating it instead.")

        option_dump_for_delete = delivery_option_schema_admin.dump(option)
        option_dump_for_delete['is_deleted'] = True

        try:
            db.session.delete(option)
            db.session.commit()
            notify_delivery_option_update_globally(option_dump_for_delete)
            return '', 204
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting delivery option {option_id}: {e}", exc_info=True)
            abort(500, message="An error occurred while deleting the delivery option.")


delivery_api.add_resource(DeliveryOptionList, '/options')
delivery_api.add_resource(DeliveryOptionDetail, '/options/<string:option_id>')