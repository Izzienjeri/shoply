from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import fields, Schema, ValidationError, validate
from sqlalchemy.orm import joinedload
from decimal import Decimal
import json
from datetime import datetime

from .. import db, ma
from ..models import Order, OrderItem, User, Cart, Artwork, CartItem, Artist, PaymentTransaction, DeliveryOption
from ..schemas import order_schema, orders_schema

from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.daraja_client import initiate_stk_push
from ..socket_events import notify_order_status_update

order_bp = Blueprint('orders', __name__)
order_api = Api(order_bp)

class CheckoutInputSchema(ma.Schema):
    phone_number = fields.Str(
        required=True,
        validate=validate.Regexp(
            r'^254\d{9}$',
            error="Phone number must be 12 digits and start with 254 (e.g., 2547XXXXXXXX)."
        )
    )
    delivery_option_id = fields.Str(required=True)

checkout_input_schema = CheckoutInputSchema()

class OrderList(Resource):
    @jwt_required()
    def get(self):
        user_id = get_jwt_identity()
        user_orders = Order.query.options(
            joinedload(Order.items).options(
                joinedload(OrderItem.artwork).joinedload(Artwork.artist)
            ),
            joinedload(Order.delivery_option_details)
        ).filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
        return orders_schema.dump(user_orders), 200

    @jwt_required()
    def post(self):
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        if not current_user:
            abort(401, message="User not found or invalid token.")

        json_data = request.get_json()
        if not json_data:
            abort(400, message="Missing checkout data (e.g., phone_number, delivery_option_id).")
        try:
            checkout_data = checkout_input_schema.load(json_data)
        except ValidationError as err:
            abort(400, message=err.messages)

        phone_number = checkout_data['phone_number']
        selected_delivery_option_id = checkout_data['delivery_option_id']
        
        cart = Cart.query.options(
            joinedload(Cart.items).options(
                joinedload(CartItem.artwork).joinedload(Artwork.artist)
            )
        ).filter_by(user_id=user_id).first()
        
        if not cart or not cart.items:
            abort(400, message="Your cart is empty.")

        delivery_option = DeliveryOption.query.get(selected_delivery_option_id)
        if not delivery_option or not delivery_option.active:
            abort(400, message="Invalid or inactive delivery option selected.")
        
        applied_delivery_fee = delivery_option.price
        cart_subtotal_decimal = Decimal('0.0')
        item_details_for_transaction_snapshot = []
        
        for item in cart.items:
            if not item.artwork: 
                current_app.logger.error(f"Critical: Artwork data missing for cart item {item.id} during checkout. Cart ID: {cart.id}")
                abort(500, message="Error processing cart. An artwork is missing details.")
            
            if not item.artwork.is_active:
                abort(400, message=f"Artwork '{item.artwork.name}' is no longer active and cannot be purchased.")
            if not item.artwork.artist:
                 current_app.logger.error(f"Critical: Artist data missing for artwork {item.artwork.id} of cart item {item.id}.")
                 abort(500, message=f"Artist details missing for '{item.artwork.name}'. Cannot proceed with checkout.")
            if not item.artwork.artist.is_active:
                abort(400, message=f"The artist of '{item.artwork.name}' is no longer active. This artwork cannot be purchased.")
            if item.artwork.stock_quantity < item.quantity:
                abort(400, message=f"Insufficient stock for '{item.artwork.name}'. Available: {item.artwork.stock_quantity}, Requested: {item.quantity}. Please update your cart.")
            
            cart_subtotal_decimal += Decimal(item.artwork.price) * Decimal(item.quantity)
            item_details_for_transaction_snapshot.append({
                'artwork_id': item.artwork.id,
                'name': item.artwork.name,
                'quantity': item.quantity,
                'price_at_purchase': str(item.artwork.price) 
            })
        
        if cart_subtotal_decimal < Decimal('0.0'):
            abort(400, message="Cart subtotal cannot be negative.")
        
        grand_total_for_payment = cart_subtotal_decimal + applied_delivery_fee
        if grand_total_for_payment <= Decimal('0.0'):
            abort(400, message="Total amount for payment (including delivery) must be greater than zero.")

        transaction = PaymentTransaction(
            user_id=user_id,
            cart_id=cart.id,
            amount=grand_total_for_payment, 
            phone_number=phone_number,
            status='pending_stk_initiation',
            _cart_items_snapshot=json.dumps(item_details_for_transaction_snapshot),
            selected_delivery_option_id=selected_delivery_option_id,
            applied_delivery_fee=applied_delivery_fee
        )
        try:
            db.session.add(transaction)
            db.session.commit()
            current_app.logger.info(f"Created PaymentTransaction {transaction.id} for user {user_id}, cart {cart.id}, amount {grand_total_for_payment} (subtotal: {cart_subtotal_decimal}, delivery: {applied_delivery_fee})")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Failed to create PaymentTransaction for user {user_id}: {e}", exc_info=True)
            abort(500, message="Error preparing payment. Please try again.")

        daraja_account_ref = transaction.id 
        amount_for_daraja = int(round(float(grand_total_for_payment)))

        stk_response, status_code = initiate_stk_push(
            phone_number=phone_number,
            amount=amount_for_daraja,
            order_id=daraja_account_ref, 
            description=f"Artistry Haven Order {transaction.id[:8]}"
        )

        if status_code >= 400 or str(stk_response.get("ResponseCode", "1")) != "0":
            error_msg = stk_response.get("errorMessage", stk_response.get("ResponseDescription", "Failed to initiate STK push."))
            current_app.logger.error(f"STK Push Initiation Failed for user {user_id}, Transaction {transaction.id}: Code {stk_response.get('ResponseCode', 'N/A')}, Desc: {error_msg}")
            transaction.status = 'failed_stk_initiation'
            transaction.daraja_response_description = error_msg
            db.session.commit()
            abort(status_code if status_code >= 400 else 500, message=error_msg)

        checkout_request_id_from_daraja = stk_response.get('CheckoutRequestID')
        if not checkout_request_id_from_daraja:
            current_app.logger.error(f"STK Push initiated but CheckoutRequestID missing. User: {user_id}, Transaction: {transaction.id}")
            transaction.status = 'failed_stk_missing_id'
            transaction.daraja_response_description = "CheckoutRequestID missing from Daraja response."
            db.session.commit()
            abort(500, message="Payment initiation incomplete. Please contact support if debited.")
        
        transaction.checkout_request_id = checkout_request_id_from_daraja
        transaction.status = 'pending_confirmation'
        transaction.daraja_response_description = stk_response.get("ResponseDescription")
        db.session.commit()

        current_app.logger.info(f"STK Push successful for Transaction {transaction.id}. Daraja CheckoutRequestID: {checkout_request_id_from_daraja}")

        return {
            "message": "STK Push initiated successfully. Please check your phone to authorize payment.",
            "CheckoutRequestID": checkout_request_id_from_daraja,
            "transaction_id": transaction.id,
            "ResponseDescription": stk_response.get("ResponseDescription", "Success")
        }, 200

class OrderDetail(Resource):
    @jwt_required()
    def get(self, order_id):
        user_id = get_jwt_identity()
        order = Order.query.options(
            joinedload(Order.items).options(
                joinedload(OrderItem.artwork).joinedload(Artwork.artist)
            ),
            joinedload(Order.delivery_option_details)
        ).filter_by(id=order_id, user_id=user_id).first_or_404(
            description=f"Order with ID {order_id} not found or does not belong to user."
        )
        return order_schema.dump(order), 200

class PaymentStatus(Resource):
    @jwt_required()
    def get(self, checkout_request_id_from_url):
        user_id = get_jwt_identity()
        transaction = PaymentTransaction.query.filter_by(
            checkout_request_id=checkout_request_id_from_url,
            user_id=user_id
        ).first()

        if not transaction:
            current_app.logger.warning(f"PaymentStatus GET: Transaction not found for CRID {checkout_request_id_from_url} and user {user_id}")
            return {"status": "not_found", "message": "Transaction not found."}, 404


        response_data = {
            "status": transaction.status,
            "checkout_request_id": transaction.checkout_request_id,
            "message": transaction.daraja_response_description or transaction.status.replace('_', ' ').title()
        }
        
        if transaction.status == 'successful' and transaction.order_record:
            response_data["order_id"] = transaction.order_record.id
        
        return response_data, 200

order_api.add_resource(OrderList, '/')
order_api.add_resource(OrderDetail, '/<string:order_id>')
order_api.add_resource(PaymentStatus, '/status/<string:checkout_request_id_from_url>')