from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from marshmallow import fields, Schema, ValidationError # Import Schema for input validation
from sqlalchemy.orm import joinedload

# Extensions, models, schemas
from .. import db, ma # Import ma for local schema definition
from ..models import Order, OrderItem, User, Cart, Product, CartItem
from ..schemas import order_schema, orders_schema

# JWT and Daraja client
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.daraja_client import initiate_stk_push

# --- Create Blueprint and Api for Orders ---
order_bp = Blueprint('orders', __name__)
order_api = Api(order_bp)
# --- End Blueprint Setup ---

# --- Temporary Storage for Checkout Requests ---
# !! IMPORTANT: Replace this with Redis or a DB table in production !!
# Maps CheckoutRequestID -> {'user_id': ..., 'cart_id': ...}
pending_checkouts = {}
# --- End Temporary Storage ---

# --- Checkout Input Schema ---
class CheckoutInputSchema(ma.Schema):
    phone_number = fields.Str(required=True, validate=lambda p: p.startswith('254') and len(p) == 12 and p.isdigit())
    # Add fields for shipping/billing address if needed
    # shipping_address = fields.Str(required=True)

checkout_input_schema = CheckoutInputSchema()
# --- End Input Schema ---

class OrderList(Resource):
    @jwt_required()
    def get(self):
        """Fetches the current user's past orders."""
        user_id = get_jwt_identity()
        # Load orders with items and potentially product details for efficiency
        user_orders = Order.query.options(
            joinedload(Order.items).joinedload(OrderItem.product)
        ).filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
        return orders_schema.dump(user_orders), 200

    @jwt_required()
    def post(self):
        """
        Initiates the checkout process (triggers STK Push).
        Does NOT create the order directly.
        """
        user_id = get_jwt_identity()

        # Validate input (e.g., phone number)
        json_data = request.get_json()
        if not json_data:
             abort(400, message="Missing checkout data (e.g., phone_number).")
        try:
            checkout_data = checkout_input_schema.load(json_data)
        except ValidationError as err:
            abort(400, message=err.messages)

        phone_number = checkout_data['phone_number']
        # Get shipping_address etc. from checkout_data if included

        # 1. Get User's Cart
        cart = Cart.query.filter_by(user_id=user_id).options(
            joinedload(Cart.items).joinedload(CartItem.product) # Load items and products
        ).first()

        if not cart or not cart.items:
            abort(400, message="Your cart is empty.")

        # 2. Calculate Total Price & Check Stock (within a transaction ideally, but complex here)
        total_price = 0
        items_to_process = [] # Store items to avoid iterating again
        for item in cart.items:
            if not item.product:
                 # Data integrity issue if product is missing
                 abort(500, message=f"Product data missing for cart item {item.id}.")
            if item.product.stock_quantity < item.quantity:
                abort(400, message=f"Insufficient stock for '{item.product.name}'. Available: {item.product.stock_quantity}")
            total_price += item.product.price * item.quantity
            items_to_process.append(item)

        if total_price <= 0:
            abort(400, message="Cart total must be positive.")

        # 3. Initiate STK Push
        # Using cart ID as a temporary reference. Could also generate a unique checkout ID.
        account_ref = f"CART_{cart.id[:8]}" # Example reference (must be unique enough)
        amount = total_price # Amount calculated from cart

        stk_response, status_code = initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            order_id=account_ref, # Using cart id/ref here temporarily
            description=f"Payment for Shoply Cart {cart.id[:8]}"
        )

        if status_code >= 400 or stk_response.get("ResponseCode", "1") != "0":
            error_msg = stk_response.get("errorMessage", "Failed to initiate STK push.")
            # Include ResponseDescription if available
            error_msg = stk_response.get("ResponseDescription", error_msg)
            abort(status_code if status_code >= 400 else 500, message=error_msg)

        # 4. Store Checkout Request ID temporarily (CRITICAL STEP)
        checkout_request_id = stk_response.get('CheckoutRequestID')
        if not checkout_request_id:
             # This should not happen if ResponseCode was 0, but safety check
             abort(500, message="STK Push initiated but CheckoutRequestID was missing in response.")

        # Store mapping: CheckoutRequestID -> user_id and cart_id (needed by callback)
        pending_checkouts[checkout_request_id] = {
            'user_id': user_id,
            'cart_id': cart.id,
            'total_price': float(total_price), # Store calculated price
            # Store address info if provided
            # 'shipping_address': checkout_data.get('shipping_address')
        }
        print(f"DEBUG: Stored pending checkout: {checkout_request_id} -> {pending_checkouts[checkout_request_id]}")

        # 5. Respond to Frontend
        # DO NOT clear cart here! Only clear after successful callback.
        return {
            "message": "STK Push initiated successfully. Please check your phone to authorize payment.",
            "CheckoutRequestID": checkout_request_id,
            "ResponseDescription": stk_response.get("ResponseDescription", "Success")
        }, 200 # 200 OK because the async process started


class OrderDetail(Resource):
    @jwt_required()
    def get(self, order_id):
        """Fetches details of a specific order belonging to the user."""
        user_id = get_jwt_identity()
        order = Order.query.options(
            joinedload(Order.items).joinedload(OrderItem.product) # Load details
        ).filter_by(id=order_id, user_id=user_id).first_or_404(
            description=f"Order with ID {order_id} not found or does not belong to user."
        )
        return order_schema.dump(order), 200

# --- Register Resources ---
order_api.add_resource(OrderList, '/') # GET (list), POST (checkout)
order_api.add_resource(OrderDetail, '/<string:order_id>') # GET (detail)