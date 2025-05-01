
from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from marshmallow import fields, Schema, ValidationError
from sqlalchemy.orm import joinedload
from decimal import Decimal

from .. import db, ma
from ..models import Order, OrderItem, User, Cart, Product, CartItem
from ..schemas import order_schema, orders_schema

from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.daraja_client import initiate_stk_push

order_bp = Blueprint('orders', __name__)
order_api = Api(order_bp)

pending_checkouts = {}

class CheckoutInputSchema(ma.Schema):
    phone_number = fields.Str(required=True, validate=lambda p: p.startswith('254') and len(p) == 12 and p.isdigit())

checkout_input_schema = CheckoutInputSchema()

class OrderList(Resource):
    @jwt_required()
    def get(self):
        """Fetches the current user's past orders."""
        user_id = get_jwt_identity()
        user_orders = Order.query.options(
            joinedload(Order.items).joinedload(OrderItem.product)
        ).filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
        return orders_schema.dump(user_orders), 200

    @jwt_required()
    def post(self):
        """
        Initiates the checkout process (triggers STK Push).
        Does NOT create the order directly. This happens in the callback.
        """
        user_id = get_jwt_identity()

        json_data = request.get_json()
        if not json_data:
             abort(400, message="Missing checkout data (e.g., phone_number).")
        try:
            checkout_data = checkout_input_schema.load(json_data)
        except ValidationError as err:
            abort(400, message=err.messages)

        phone_number = checkout_data['phone_number']

        cart = Cart.query.filter_by(user_id=user_id).first()

        if not cart:
             abort(400, message="Your cart is empty.")

        cart_items_with_products = cart.items.options(
            joinedload(CartItem.product)
        ).all()

        if not cart_items_with_products:
            abort(400, message="Your cart is empty.")

        total_price = Decimal('0.0')

        for item in cart_items_with_products:
            if not item.product:
                 abort(500, message=f"Product data missing for cart item {item.id}.")

            if item.product.stock_quantity < item.quantity:
                abort(400, message=f"Insufficient stock for '{item.product.name}'. Available: {item.product.stock_quantity}")

            total_price += Decimal(item.product.price) * Decimal(item.quantity)


        if total_price <= 0:
            abort(400, message="Cart total must be positive.")

        account_ref = f"CART_{cart.id[:8]}"
        amount = float(total_price)

        stk_response, status_code = initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            order_id=account_ref,
            description=f"Payment for Shoply Cart {cart.id[:8]}"
        )

        if status_code >= 400 or stk_response.get("ResponseCode", "1") != "0":
            error_msg = stk_response.get("errorMessage", "Failed to initiate STK push.")
            error_msg = stk_response.get("ResponseDescription", error_msg)
            abort(status_code if status_code >= 400 else 500, message=error_msg)

        checkout_request_id = stk_response.get('CheckoutRequestID')
        if not checkout_request_id:
             abort(500, message="STK Push initiated but CheckoutRequestID was missing in response.")

        pending_checkouts[checkout_request_id] = {
            'user_id': user_id,
            'cart_id': cart.id,
            'total_price': float(total_price),
        }
        print(f"DEBUG: Stored pending checkout: {checkout_request_id} -> {pending_checkouts[checkout_request_id]}")

        return {
            "message": "STK Push initiated successfully. Please check your phone to authorize payment.",
            "CheckoutRequestID": checkout_request_id,
            "ResponseDescription": stk_response.get("ResponseDescription", "Success")
        }, 200


class OrderDetail(Resource):
    @jwt_required()
    def get(self, order_id):
        """Fetches details of a specific order belonging to the user."""
        user_id = get_jwt_identity()
        order = Order.query.options(
            joinedload(Order.items).joinedload(OrderItem.product)
        ).filter_by(id=order_id, user_id=user_id).first_or_404(
            description=f"Order with ID {order_id} not found or does not belong to user."
        )
        return order_schema.dump(order), 200

order_api.add_resource(OrderList, '/')
order_api.add_resource(OrderDetail, '/<string:order_id>')