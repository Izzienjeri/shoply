# === ./app/resources/payment.py ===
from flask import request, Blueprint, jsonify, current_app # Added current_app
from flask_restful import Resource, Api, abort
from decimal import Decimal
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, update, delete # Ensure all are used or remove unused

from .. import db
from ..models import Order, OrderItem, Artwork, Cart, CartItem, User

# Import the shared pending_checkouts dictionary
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
        current_app.logger.info("--- Daraja Callback Received ---")
        try:
            callback_data = request.get_json()
            if not callback_data: # Handle empty body
                current_app.logger.error("Daraja Callback: Received empty JSON body.")
                return {"ResultCode": 1, "ResultDesc": "Failed: Empty callback data"}, 200 # Acknowledge receipt but indicate issue
        except Exception as e:
            current_app.logger.error(f"Daraja Callback: Failed to parse JSON body: {e}. Raw data: {request.data}")
            return {"ResultCode": 1, "ResultDesc": "Failed: Invalid JSON format"}, 200


        current_app.logger.info(f"Raw Callback Data: {callback_data}")

        if 'Body' not in callback_data or 'stkCallback' not in callback_data['Body']:
             current_app.logger.error("ERROR: Invalid callback format received. Missing 'Body' or 'stkCallback'.")
             return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200 # Safaricom expects 0 for ack

        stk_callback = callback_data['Body']['stkCallback']
        result_code = stk_callback.get('ResultCode')
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        # merchant_request_id = stk_callback.get('MerchantRequestID') # Use if needed for reconciliation

        if not checkout_request_id:
            current_app.logger.error("ERROR: CheckoutRequestID missing in stkCallback.")
            return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        current_app.logger.info(f"Processing callback for CheckoutRequestID: {checkout_request_id}, ResultCode: {result_code}")

        # current_app.logger.debug(f"DEBUG: Current pending_checkouts keys: {list(pending_checkouts.keys())}")
        checkout_info = pending_checkouts.pop(checkout_request_id, None)

        if not checkout_info:
            current_app.logger.warning(f"WARNING: CheckoutRequestID {checkout_request_id} not found in pending checkouts or already processed.")
            # Even if not found, Safaricom expects a success response to this callback.
            return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

        user_id = checkout_info['user_id']
        cart_id_to_clear = checkout_info['cart_id']
        expected_total_str = str(checkout_info['total_price']) # Ensure it's a string for Decimal
        expected_total = Decimal(expected_total_str)
        items_to_order = checkout_info['items']
        shipping_address_from_pending = checkout_info.get('shipping_address', "Pickup at Dynamic Mall, Shop M90, CBD")


        current_app.logger.info(f"Found pending checkout info for User {user_id}, Cart {cart_id_to_clear}, Expected Total: {expected_total}")

        if result_code == 0: # Payment successful
            current_app.logger.info(f"SUCCESS: Payment reported successful for {checkout_request_id}. ResultDesc: {stk_callback.get('ResultDesc', 'N/A')}")

            amount_paid_str = "0.00"
            mpesa_receipt = None
            # phone_number_paid = None # If needed
            # transaction_date_str = None # If needed

            if 'CallbackMetadata' in stk_callback and 'Item' in stk_callback['CallbackMetadata']:
                metadata = {item['Name']: item.get('Value') for item in stk_callback['CallbackMetadata']['Item'] if 'Name' in item} # Ensure 'Name' exists
                
                if 'Amount' in metadata:
                    amount_paid_str = str(metadata.get('Amount', "0.00"))
                mpesa_receipt = metadata.get('MpesaReceiptNumber')
                # phone_number_paid = metadata.get('PhoneNumber')
                # transaction_date_str = metadata.get('TransactionDate')
            
            amount_paid = Decimal(amount_paid_str)

            current_app.logger.info(f"Details from callback: Amount Paid: {amount_paid}, Expected: {expected_total}, Receipt: {mpesa_receipt}")

            # Validate amount paid against expected total more strictly if needed
            if amount_paid < expected_total:
                 current_app.logger.warning(f"Amount paid ({amount_paid}) is less than expected ({expected_total}) for {checkout_request_id}. Order will be created but flagged.")
                 # Decide if you want to proceed or mark order as 'underpaid' or similar

            # --- Database Transaction ---
            try:
                # Fetch user to get their current address if not fully reliant on pending_checkout's address
                # user = User.query.get(user_id)
                # final_shipping_address = shipping_address_from_pending
                # if user and user.address: # Prioritize current user address if desired
                #     final_shipping_address = user.address
                
                final_shipping_address = shipping_address_from_pending # Using address stored at time of checkout

                new_order = Order(
                    user_id=user_id,
                    total_price=expected_total, # Use the total price calculated at checkout
                    status='paid', # Or 'processing'
                    payment_gateway_ref=mpesa_receipt,
                    shipping_address=final_shipping_address,
                    billing_address=final_shipping_address # Assuming same for simplicity
                )
                db.session.add(new_order)
                db.session.flush() # Important to get new_order.id for OrderItems

                artworks_to_update_stock_ids = {} # To hold artwork_id: quantity_ordered

                for item_data in items_to_order:
                    artwork_id = item_data['artwork_id']
                    quantity_ordered = item_data['quantity']
                    price_at_purchase_str = str(item_data['price_at_purchase'])
                    
                    # Lock artwork row for update to prevent race conditions on stock
                    artwork = db.session.query(Artwork).filter_by(id=artwork_id).with_for_update().first()

                    if not artwork:
                        # This should ideally not happen if cart items are validated
                        current_app.logger.error(f"Critical Error: Artwork ID {artwork_id} not found during final order creation for user {user_id}.")
                        raise ValueError(f"Artwork ID {artwork_id} not found.") 
                    
                    if artwork.stock_quantity < quantity_ordered:
                        current_app.logger.error(f"Critical Error: Insufficient stock for Artwork '{artwork.name}' (ID: {artwork_id}) during final order creation. User {user_id}.")
                        raise ValueError(f"Insufficient stock for Artwork '{artwork.name}'.")

                    artworks_to_update_stock_ids[artwork_id] = artworks_to_update_stock_ids.get(artwork_id, 0) + quantity_ordered
                    
                    order_item = OrderItem(
                        order_id=new_order.id,
                        artwork_id=artwork_id,
                        quantity=quantity_ordered,
                        price_at_purchase=Decimal(price_at_purchase_str)
                    )
                    db.session.add(order_item)

                # Update stock quantities
                for art_id, qty_ordered in artworks_to_update_stock_ids.items():
                    # The row is already locked by with_for_update() earlier if processing one item at a time
                    # If processing multiple items from same artwork, ensure logic is correct
                    db.session.query(Artwork).filter_by(id=art_id).update(
                        {'stock_quantity': Artwork.stock_quantity - qty_ordered},
                        synchronize_session=False # Important when using expressions
                    )
                    current_app.logger.info(f"Decremented stock for Artwork {art_id} by {qty_ordered} for order {new_order.id}")

                # Clear cart items for the processed cart
                deleted_count = db.session.query(CartItem).filter_by(cart_id=cart_id_to_clear).delete(synchronize_session=False)
                current_app.logger.info(f"Deleted {deleted_count} items from Cart {cart_id_to_clear} for User {user_id}, Order {new_order.id}")

                db.session.commit()
                current_app.logger.info(f"SUCCESS: Order {new_order.id} created, stock updated, cart {cart_id_to_clear} cleared for User {user_id}.")

            except ValueError as ve:
                 db.session.rollback()
                 current_app.logger.error(f"ERROR (ValueError): Order creation failed for User {user_id}, Cart {cart_id_to_clear}. Reason: {ve}")
            except Exception as e:
                 db.session.rollback()
                 current_app.logger.error(f"ERROR (Exception): Order creation failed for User {user_id}, Cart {cart_id_to_clear}. Error: {e}", exc_info=True)
                 # Potentially re-raise or handle so Safaricom might retry if appropriate,
                 # but usually, for DB errors, you accept and log.
        else: # Payment failed or cancelled by user
            current_app.logger.warning(f"Payment failed or cancelled for {checkout_request_id}. ResultCode: {result_code}, ResultDesc: {stk_callback.get('ResultDesc', 'N/A')}")
            # No order created, cart remains as is. No stock updated.

        return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

payment_api.add_resource(DarajaCallback, '/callback')