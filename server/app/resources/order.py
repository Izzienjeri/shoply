# === ./app/resources/order.py ===
from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from marshmallow import fields, Schema, ValidationError, validate # <--- ADD validate HERE
from sqlalchemy.orm import joinedload
from decimal import Decimal
import json 
from datetime import datetime 

from .. import db, ma
from ..models import Order, OrderItem, User, Cart, Artwork, CartItem, Artist, PaymentTransaction # Added PaymentTransaction
from ..schemas import order_schema, orders_schema # No PaymentTransactionSchema needed for this flow yet

from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.daraja_client import initiate_stk_push

order_bp = Blueprint('orders', __name__)
order_api = Api(order_bp)

# In-memory pending_checkouts is removed. We use the PaymentTransaction model.

class CheckoutInputSchema(ma.Schema):
    phone_number = fields.Str(
        required=True, 
        validate=validate.Regexp(
            r'^254\d{9}$', 
            error="Phone number must be 12 digits and start with 254 (e.g., 2547XXXXXXXX)."
        )
    )

checkout_input_schema = CheckoutInputSchema()

class OrderList(Resource):
    @jwt_required()
    def get(self):
        user_id = get_jwt_identity()
        user_orders = Order.query.options(
            joinedload(Order.items).options(
                joinedload(OrderItem.artwork).joinedload(Artwork.artist)
            )
        ).filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
        return orders_schema.dump(user_orders), 200

    @jwt_required()
    def post(self): # This is the STK Initiation endpoint
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        if not current_user:
            # This should ideally be caught by @jwt_required if token is invalid
            abort(401, message="User not found or invalid token.")

        json_data = request.get_json()
        if not json_data:
             abort(400, message="Missing checkout data (e.g., phone_number).")
        try:
            checkout_data = checkout_input_schema.load(json_data)
        except ValidationError as err:
            # err.messages will be like {'phoneNumber': ['Phone number must be...']}
            abort(400, message=err.messages)

        phone_number = checkout_data['phone_number']
        
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart or not cart.items: # Check if cart exists and has items
            abort(400, message="Your cart is empty.")

        # Recalculate total and prepare item snapshot for robustness
        total_price_decimal = Decimal('0.0')
        item_details_for_transaction = []
        
        # Ensure cart items and artworks are loaded
        # Cart.items is already eager loaded due to lazy='joined' in Cart model
        for item in cart.items:
            if not item.artwork: # artwork on CartItem is also lazy='joined'
                 current_app.logger.error(f"Critical: Artwork data missing for cart item {item.id} during checkout. Cart ID: {cart.id}")
                 abort(500, message="Error processing cart. An artwork is missing details.")
            
            if item.artwork.stock_quantity < item.quantity:
                abort(400, message=f"Insufficient stock for '{item.artwork.name}'. Available: {item.artwork.stock_quantity}, Requested: {item.quantity}")
            
            total_price_decimal += Decimal(item.artwork.price) * Decimal(item.quantity)
            item_details_for_transaction.append({
                'artwork_id': item.artwork.id, # Use item.artwork.id for safety
                'name': item.artwork.name,
                'quantity': item.quantity,
                'price_at_purchase': str(item.artwork.price) 
            })
        
        if total_price_decimal <= Decimal('0.0'): # Ensure positive total
             abort(400, message="Cart total must be a positive value.")

        # Create PaymentTransaction record
        transaction = PaymentTransaction(
            user_id=user_id,
            cart_id=cart.id, # Link to cart for now
            amount=total_price_decimal,
            phone_number=phone_number,
            status='pending_stk_initiation',
            _cart_items_snapshot=json.dumps(item_details_for_transaction)
        )
        try:
            db.session.add(transaction)
            db.session.commit() # Commit to get transaction.id
            current_app.logger.info(f"Created PaymentTransaction {transaction.id} for user {user_id}, cart {cart.id}")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Failed to create PaymentTransaction for user {user_id}: {e}", exc_info=True)
            abort(500, message="Error preparing payment. Please try again.")

        # AccountReference for Daraja can be your internal transaction ID
        daraja_account_ref = transaction.id 
        amount_for_daraja = int(round(float(total_price_decimal))) # Daraja STK usually wants whole number

        stk_response, status_code = initiate_stk_push(
            phone_number=phone_number,
            amount=amount_for_daraja,
            order_id=daraja_account_ref, # This is Daraja's "AccountReference"
            description=f"Artistry Haven Order" # Keep it somewhat generic or include transaction.id
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
        transaction.status = 'pending_confirmation' # STK push sent, waiting for user/Daraja callback
        transaction.daraja_response_description = stk_response.get("ResponseDescription")
        db.session.commit()

        current_app.logger.info(f"STK Push successful for Transaction {transaction.id}. Daraja CheckoutRequestID: {checkout_request_id_from_daraja}")

        return {
            "message": "STK Push initiated successfully. Please check your phone to authorize payment.",
            "CheckoutRequestID": checkout_request_id_from_daraja,
            "transaction_id": transaction.id, # Your internal transaction ID
            "ResponseDescription": stk_response.get("ResponseDescription", "Success")
        }, 200


class OrderDetail(Resource):
    @jwt_required()
    def get(self, order_id):
        user_id = get_jwt_identity()
        order = Order.query.filter_by(id=order_id, user_id=user_id).first_or_404(
            description=f"Order with ID {order_id} not found or does not belong to user."
        )
        return order_schema.dump(order), 200

class PaymentStatus(Resource):
    @jwt_required()
    def get(self, checkout_request_id_from_url): # Renamed to avoid conflict
        user_id = get_jwt_identity()
        # Find transaction by CheckoutRequestID from Daraja AND user_id for security
        transaction = PaymentTransaction.query.filter_by(
            checkout_request_id=checkout_request_id_from_url, 
            user_id=user_id
        ).first()

        if not transaction:
            # Could also check by internal transaction_id if frontend has that
            current_app.logger.warning(f"PaymentStatus GET: Transaction not found for CRID {checkout_request_id_from_url} and user {user_id}")
            return {"status": "not_found", "message": "Transaction not found or still processing initial STK push."}, 404

        response_data = {
            "status": transaction.status, # e.g., 'pending_confirmation', 'successful', 'failed_daraja'
            "checkout_request_id": transaction.checkout_request_id,
            "message": transaction.daraja_response_description or transaction.status.replace('_', ' ').title()
        }
        
        # If successful, find the associated order_id (it's now a backref)
        if transaction.status == 'successful' and transaction.order_record:
            response_data["order_id"] = transaction.order_record.id
        
        return response_data, 200

order_api.add_resource(OrderList, '/')
order_api.add_resource(OrderDetail, '/<string:order_id>')
order_api.add_resource(PaymentStatus, '/status/<string:checkout_request_id_from_url>')