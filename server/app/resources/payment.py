from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from decimal import Decimal
from sqlalchemy.orm import joinedload
from sqlalchemy import select, update, delete

from .. import db
from ..models import Order, OrderItem, Artwork, Cart, CartItem, User

from .order import pending_checkouts


payment_bp = Blueprint('payments', __name__)
payment_api = Api(payment_bp)

class DarajaCallback(Resource):
    def post(self):
        """
        Handles the callback from Daraja after STK Push completion.
        Creates the Order, OrderItems, updates Artwork stock, and clears CartItems
        if the payment was successful and checkout data is found.
        """
        print("--- Daraja Callback Received ---")
        callback_data = request.get_json()
        print(f"Raw Callback Data: {callback_data}")

        if not callback_data or 'Body' not in callback_data or 'stkCallback' not in callback_data['Body']:
             print("ERROR: Invalid callback format received.")
             return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        stk_callback = callback_data['Body']['stkCallback']
        result_code = stk_callback.get('ResultCode')
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        result_desc = stk_callback.get('ResultDesc', 'No description provided')
        merchant_request_id = stk_callback.get('MerchantRequestID')

        if not checkout_request_id:
            print("ERROR: CheckoutRequestID missing in stkCallback.")
            return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        print(f"Processing callback for CheckoutRequestID: {checkout_request_id}, ResultCode: {result_code}, MerchantRequestID: {merchant_request_id}")

        print(f"DEBUG: Current pending_checkouts keys: {list(pending_checkouts.keys())}")
        checkout_info = pending_checkouts.pop(checkout_request_id, None)

        if not checkout_info:
            print(f"WARNING: CheckoutRequestID {checkout_request_id} not found in pending checkouts or already processed.")
            return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        user_id = checkout_info['user_id']
        cart_id_to_clear = checkout_info['cart_id']
        expected_total = Decimal(str(checkout_info['total_price']))
        items_to_order = checkout_info['items']

        print(f"DEBUG: Found pending checkout info for User {user_id}, Cart {cart_id_to_clear}, Expected Total: {expected_total}")

        if result_code == 0:
            print(f"SUCCESS: Payment reported successful for {checkout_request_id}. ResultDesc: {result_desc}")

            amount_paid = Decimal('0.00')
            mpesa_receipt = None
            phone_number_paid = None
            transaction_date_str = None

            if 'CallbackMetadata' in stk_callback and 'Item' in stk_callback['CallbackMetadata']:
                metadata = {item['Name']: item.get('Value') for item in stk_callback['CallbackMetadata']['Item']}
                amount_paid = Decimal(str(metadata.get('Amount', 0)))
                mpesa_receipt = metadata.get('MpesaReceiptNumber')
                phone_number_paid = metadata.get('PhoneNumber')
                transaction_date_str = metadata.get('TransactionDate')

            print(f"DEBUG: Amount Paid: {amount_paid}, Expected: {expected_total}, Receipt: {mpesa_receipt}, Phone: {phone_number_paid}, Date: {transaction_date_str}")

            if amount_paid < expected_total:
                 print(f"WARNING: Amount paid ({amount_paid}) is less than expected total ({expected_total}) for {checkout_request_id}. Order may not be created or marked as partially paid.")

            try:
                with db.session.begin_nested():
                    artworks_to_update_stock = {}
                    for item_data in items_to_order:
                        artwork_id = item_data['artwork_id']
                        quantity_ordered = item_data['quantity']

                        artwork = db.session.query(Artwork).filter_by(id=artwork_id).with_for_update().first()

                        if not artwork:
                            raise ValueError(f"Artwork ID {artwork_id} not found during final order creation.")
                        if artwork.stock_quantity < quantity_ordered:
                            raise ValueError(f"Insufficient stock for Artwork '{artwork.name}' (ID: {artwork_id}) during final order creation. Available: {artwork.stock_quantity}, Ordered: {quantity_ordered}")

                        artworks_to_update_stock[artwork_id] = quantity_ordered

                    new_order = Order(
                        user_id=user_id,
                        total_price=expected_total,
                        status='paid',
                        payment_gateway_ref=mpesa_receipt,
                    )
                    db.session.add(new_order)
                    db.session.flush()

                    for item_data in items_to_order:
                         order_item = OrderItem(
                             order_id=new_order.id,
                             artwork_id=item_data['artwork_id'],
                             quantity=item_data['quantity'],
                             price_at_purchase=Decimal(str(item_data['price_at_purchase']))
                         )
                         db.session.add(order_item)

                    for artwork_id, quantity_to_decrement in artworks_to_update_stock.items():
                         db.session.query(Artwork).filter_by(id=artwork_id).update({
                             'stock_quantity': Artwork.stock_quantity - quantity_to_decrement
                         })
                         print(f"DEBUG: Decremented stock for Artwork {artwork_id} by {quantity_to_decrement}")


                    deleted_count = db.session.query(CartItem).filter_by(cart_id=cart_id_to_clear).delete()
                    print(f"DEBUG: Deleted {deleted_count} items from Cart {cart_id_to_clear}")


                db.session.commit()
                print(f"SUCCESS: Order {new_order.id} created, stock updated, cart {cart_id_to_clear} cleared for User {user_id}.")

            except ValueError as ve:
                 db.session.rollback()
                 print(f"ERROR: Validation failed during final order creation for User {user_id}, Cart {cart_id_to_clear}. Reason: {ve}")
            except Exception as e:
                 db.session.rollback()
                 print(f"ERROR: Failed to commit order transaction for User {user_id}, Cart {cart_id_to_clear}. Error: {e}")


        else:
            print(f"FAILURE: Payment failed or cancelled for {checkout_request_id}. ResultCode: {result_code}, ResultDesc: {result_desc}")


        return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

payment_api.add_resource(DarajaCallback, '/callback')