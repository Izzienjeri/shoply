# === ./app/resources/delivery.py ===

from flask import Blueprint
from flask_restful import Resource, Api, current_app

from ..models import DeliveryOption
from ..schemas import delivery_options_schema, delivery_option_schema # delivery_option_schema might not be used here

delivery_bp = Blueprint('delivery', __name__)
delivery_api = Api(delivery_bp)

class DeliveryOptionList(Resource):
    def get(self):
        """Fetches all active delivery options, ordered by sort_order then name."""
        try:
            options = DeliveryOption.query.filter_by(active=True).order_by(DeliveryOption.sort_order, DeliveryOption.name).all()
            return delivery_options_schema.dump(options), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching delivery options: {e}")
            return {"message": "Could not retrieve delivery options"}, 500

delivery_api.add_resource(DeliveryOptionList, '/options') # Route for GET /api/delivery/options