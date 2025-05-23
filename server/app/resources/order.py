# === ./app/resources/order.py ===
from flask import request, Blueprint, jsonify, current_app # Added current_app
from flask_restful import Resource, Api, abort
from marshmallow import fields, Schema, ValidationError
from sqlalchemy.orm import joinedload
from decimal import Decimal

from .. import db, ma
from ..models import Order, OrderItem, User, Cart, Artwork, CartItem, Artist
from ..schemas import order_schema, orders_schema, artwork_schema

from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.daraja_client import initiate_stk_push

order_bp = Blueprint('orders', __name__)
order_api = Api(order_bp)

# For development, this is in-memory. For production, use a persistent store (Redis, DB).
pending_checkouts = {}

class CheckoutInputSchema(ma.Schema):
    phone_number = fields.Str(required=True, validate=lambda p: p.startswith('254') and len(p) == 12 and p.isdigit())

checkout_input_schema = CheckoutInputSchema()

class OrderList(Resource):
    @jwt_required()
    def get(self):
        """Fetches the current user's past orders, including artwork details."""
        user_id = get_jwt_identity()
        user_orders = Order.query.options(
            joinedload(Order.items).options(
                joinedload(OrderItem.artwork).joinedload(Artwork.artist)
            )
        ).filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
        return orders_schema.dump(user_orders), 200

    @jwt_required()
    def post(self):
        """
        Initiates the checkout process (triggers STK Push).
        Validates cart items (artwork stock) before proceeding.
        Does NOT create the order directly. This happens in the callback.
        """
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id) # Get user object to fetch address

        if not current_user:
            abort(401, message="User not found or invalid token.")


        json_data = request.get_json()
        if not json_data:
             abort(400, message="Missing checkout data (e.g., phone_number).")
        try:
            checkout_data = checkout_input_schema.load(json_data)
        except ValidationError as err:
            abort(400, message=err.messages)

        phone_number = checkout_data['phone_number']

        cart = Cart.query.filter_by(user_id=user_id).first()

        if cart:
            cart_items_with_artworks = CartItem.query.options(
                joinedload(CartItem.artwork)
            ).filter_by(cart_id=cart.id).all()
        else:
             cart_items_with_artworks = []


        if not cart or not cart_items_with_artworks:
            abort(400, message="Your cart is empty.")

        total_price = Decimal('0.0')
        item_details_for_pending = []

        for item in cart_items_with_artworks:
            if not item.artwork:
                 current_app.logger.error(f"Artwork data missing for cart item {item.id}. Cart ID: {cart.id}")
                 abort(500, message=f"Artwork data missing for an item in your cart.")

            if item.artwork.stock_quantity < item.quantity:
                abort(400, message=f"Insufficient stock for '{item.artwork.name}'. Available: {item.artwork.stock_quantity}")

            total_price += Decimal(item.artwork.price) * Decimal(item.quantity)
            item_details_for_pending.append({
                'artwork_id': item.artwork_id,
                'quantity': item.quantity,
                'price_at_purchase': float(item.artwork.price) # Storing as float for JSON compatibility
            })

        if total_price <= 0:
            abort(400, message="Cart total must be positive.")

        # Using a more unique reference, though cart ID part is good for quick reference
        account_ref = f"ORDER_{user_id[:8]}_{cart.id[:8]}" # Make it more unique
        amount = int(round(float(total_price))) # Daraja expects integer cents for some APIs, but STK usually whole numbers. Assuming whole numbers.

        stk_response, status_code = initiate_stk_push(
            phone_number=phone_number,
            amount=amount, # Ensure this amount is what Daraja expects (e.g., KES 1 not 100 cents)
            order_id=account_ref, # This is account reference
            description=f"Payment for Artistry Haven"
        )

        if status_code >= 400 or stk_response.get("ResponseCode", "1") != "0":
            error_msg = stk_response.get("errorMessage", "Failed to initiate STK push.")
            error_msg = stk_response.get("ResponseDescription", error_msg) # Prefer ResponseDescription
            current_app.logger.error(f"STK Push Initiation Failed for user {user_id}: Code {stk_response.get('ResponseCode', 'N/A')}, Desc: {error_msg}, Daraja Msg: {stk_response.get('errorMessage', 'N/A')}")
            abort(status_code if status_code >= 400 else 500, message=error_msg)

        checkout_request_id = stk_response.get('CheckoutRequestID')
        if not checkout_request_id:
             current_app.logger.error("STK Push initiated but CheckoutRequestID was missing in Daraja response. User: {user_id}")
             abort(500, message="STK Push initiated but a critical ID was missing in response. Please contact support.")

        # Store information needed for callback processing
        pending_checkouts[checkout_request_id] = {
            'user_id': user_id,
            'cart_id': cart.id,
            'total_price': float(total_price), # Store as float for consistency
            'items': item_details_for_pending,
            'phone_number': phone_number,
            'shipping_address': current_user.address or "Pickup at Dynamic Mall, Shop M90, CBD", # Store user's address
            'account_ref': account_ref # Storing the same account_ref sent to Daraja
        }
        current_app.logger.info(f"STK Push initiated. Stored pending checkout for CheckoutRequestID: {checkout_request_id} -> User {user_id}, Cart {cart.id}")

        return {
            "message": "STK Push initiated successfully. Please check your phone to authorize payment.",
            "CheckoutRequestID": checkout_request_id,
            "ResponseDescription": stk_response.get("ResponseDescription", "Success")
        }, 200


class OrderDetail(Resource):
    @jwt_required()
    def get(self, order_id):
        """Fetches details of a specific order belonging to the user, including artwork details."""
        user_id = get_jwt_identity()
        order = Order.query.options(
            joinedload(Order.items).options(
                joinedload(OrderItem.artwork).joinedload(Artwork.artist)
            )
        ).filter_by(id=order_id, user_id=user_id).first_or_404(
            description=f"Order with ID {order_id} not found or does not belong to user."
        )
        return order_schema.dump(order), 200

order_api.add_resource(OrderList, '/')
order_api.add_resource(OrderDetail, '/<string:order_id>')