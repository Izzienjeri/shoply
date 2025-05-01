from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from decimal import Decimal
from sqlalchemy.orm import joinedload 

from .. import db
from ..models import Order, OrderItem, Product, Cart, CartItem

from .order import pending_checkouts


payment_bp = Blueprint('payments', __name__)
payment_api = Api(payment_bp)

class DarajaCallback(Resource):
    def post(self):
        """
        Handles the callback from Daraja after STK Push completion.
        This endpoint MUST be publicly accessible (use ngrok for dev).
        """
        print("--- Daraja Callback Received ---")
        callback_data = request.get_json()
        print(f"Callback Data: {callback_data}")

        if not callback_data or 'Body' not in callback_data or 'stkCallback' not in callback_data['Body']:
             print("ERROR: Invalid callback format")
             return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        stk_callback = callback_data['Body']['stkCallback']
        result_code = stk_callback.get('ResultCode')
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        result_desc = stk_callback.get('ResultDesc', 'No description')

        if not checkout_request_id:
            print("ERROR: CheckoutRequestID missing in callback.")
            return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        print(f"DEBUG: Looking for CheckoutRequestID: {checkout_request_id} in pending_checkouts")
        checkout_info = pending_checkouts.pop(checkout_request_id, None)

        if not checkout_info:
            print(f"ERROR: CheckoutRequestID {checkout_request_id} not found in pending checkouts or already processed.")
            return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        user_id = checkout_info['user_id']
        cart_id = checkout_info['cart_id']
        expected_total = Decimal(str(checkout_info['total_price']))

        print(f"DEBUG: Found checkout info for User {user_id}, Cart {cart_id}")

        if result_code == 0:
            print(f"SUCCESS: Payment successful for {checkout_request_id}. ResultDesc: {result_desc}")

            amount_paid = Decimal('0.00')
            mpesa_receipt = None
            phone_number_paid = None
            transaction_date = None
            if 'CallbackMetadata' in stk_callback and 'Item' in stk_callback['CallbackMetadata']:
                metadata = stk_callback['CallbackMetadata']['Item']
                for item in metadata:
                    if item.get('Name') == 'Amount':
                        amount_paid = Decimal(str(item.get('Value', 0)))
                    elif item.get('Name') == 'MpesaReceiptNumber':
                        mpesa_receipt = item.get('Value')
                    elif item.get('Name') == 'PhoneNumber':
                        phone_number_paid = item.get('Value')
                    elif item.get('Name') == 'TransactionDate':
                        transaction_date = item.get('Value')

            print(f"DEBUG: Amount Paid: {amount_paid}, Expected: {expected_total}, Receipt: {mpesa_receipt}")


            try:
                with db.session.begin_nested():
                    cart_items = CartItem.query.filter_by(cart_id=cart_id).options(
                        joinedload(CartItem.product)
                    ).all()

                    if not cart_items:
                         print(f"ERROR: No items found for Cart {cart_id} during callback processing.")
                         raise ValueError("Cart items missing during order creation.")


                    current_total_price = Decimal('0.00')
                    products_to_update = []
                    order_items_to_create = []

                    for item in cart_items:
                        if not item.product:
                             raise ValueError(f"Product data missing for cart item {item.id} during order creation.")
                        if item.product.stock_quantity < item.quantity:
                             raise ValueError(f"Insufficient stock for '{item.product.name}' during final order creation.")

                        current_total_price += item.product.price * item.quantity
                        products_to_update.append({'product': item.product, 'quantity': item.quantity})
                        order_items_to_create.append({
                             'product_id': item.product_id,
                             'quantity': item.quantity,
                             'price_at_purchase': item.product.price
                        })



                    new_order = Order(
                        user_id=user_id,
                        total_price=current_total_price,
                        status='paid',
                        payment_gateway_ref=mpesa_receipt
                    )
                    db.session.add(new_order)
                    db.session.flush()

                    for item_data in order_items_to_create:
                         order_item = OrderItem(
                             order_id=new_order.id,
                             product_id=item_data['product_id'],
                             quantity=item_data['quantity'],
                             price_at_purchase=item_data['price_at_purchase']
                         )
                         db.session.add(order_item)

                    for prod_data in products_to_update:
                         prod_data['product'].stock_quantity -= prod_data['quantity']

                    CartItem.query.filter_by(cart_id=cart_id).delete()

                db.session.commit()
                print(f"SUCCESS: Order {new_order.id} created successfully for User {user_id}.")

            except ValueError as ve:
                 db.session.rollback()
                 print(f"ERROR: Stock validation failed during final order creation for Cart {cart_id}. Reason: {ve}")
            except Exception as e:
                 db.session.rollback()
                 print(f"ERROR: Failed to create order or update stock for Cart {cart_id} / User {user_id}. Error: {e}")

        else:
            print(f"FAILURE: Payment failed for {checkout_request_id}. ResultCode: {result_code}, ResultDesc: {result_desc}")

        return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

payment_api.add_resource(DarajaCallback, '/callback')