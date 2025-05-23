
from flask import request, Blueprint, jsonify, current_app
from flask_restful import Resource, Api, abort
from decimal import Decimal
from sqlalchemy.orm import joinedload
import json

from .. import db
from ..models import Order, OrderItem, Artwork, Cart, CartItem, User, PaymentTransaction

payment_bp = Blueprint('payments', __name__)
payment_api = Api(payment_bp)

class DarajaCallback(Resource):
    def post(self):
        current_app.logger.info("--- Daraja Callback Received ---")
        try:
            callback_data = request.get_json()
            if not callback_data:
                current_app.logger.error("Daraja Callback: Received empty JSON body.")
                return {"ResultCode": 0, "ResultDesc": "Accepted empty body"}, 200
        except Exception as e:
            current_app.logger.error(f"Daraja Callback: Failed to parse JSON body: {e}. Raw data: {request.data}")
            return {"ResultCode": 0, "ResultDesc": "Accepted invalid JSON"}, 200

        current_app.logger.info(f"Daraja Callback - Raw Data: {json.dumps(callback_data)}")

        if 'Body' not in callback_data or 'stkCallback' not in callback_data['Body']:
            current_app.logger.error("Daraja Callback ERROR: Invalid format. Missing 'Body' or 'stkCallback'.")
            return {"ResultCode": 0, "ResultDesc": "Accepted format error"}, 200

        stk_callback = callback_data['Body']['stkCallback']
        result_code_from_daraja = str(stk_callback.get('ResultCode', '-1'))
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        daraja_result_desc = stk_callback.get('ResultDesc', 'No ResultDesc from Daraja.')
        
        daraja_merchant_request_id = stk_callback.get('MerchantRequestID')

        current_app.logger.info(f"Daraja Callback - Processing: CRID: {checkout_request_id}, Daraja_MRID: {daraja_merchant_request_id}, ResultCode: {result_code_from_daraja}, ResultDesc: {daraja_result_desc}")

        if not checkout_request_id:
            current_app.logger.error("Daraja Callback ERROR: CheckoutRequestID missing from Daraja. Cannot process.")
            return {"ResultCode": 0, "ResultDesc": "Accepted missing CheckoutRequestID"}, 200
        
        transaction = PaymentTransaction.query.filter_by(checkout_request_id=checkout_request_id).first()

        if not transaction:
            current_app.logger.warning(f"Daraja Callback WARNING: PaymentTransaction for CRID {checkout_request_id} not found in DB. This might be a stray callback from Daraja (e.g., sandbox test for a different transaction) or an issue matching IDs. Original Daraja MerchantRequestID was {daraja_merchant_request_id}.")
            return {"ResultCode": 0, "ResultDesc": "Accepted, transaction not found by CRID"}, 200

        current_app.logger.info(f"Daraja Callback: Found internal PaymentTransaction {transaction.id} with status {transaction.status} for CRID {checkout_request_id}.")

        final_states = ['successful', 'failed_daraja', 'cancelled_by_user', 'failed_processing_error', 'failed_underpaid', 'failed_missing_receipt', 'failed_timeout']
        if transaction.status in final_states:
            current_app.logger.info(f"Daraja Callback INFO: Transaction {transaction.id} (CRID: {checkout_request_id}) already in a final state: {transaction.status}. Ignoring callback.")
            return {"ResultCode": 0, "ResultDesc": "Accepted, already processed"}, 200

        transaction.daraja_response_description = daraja_result_desc

        if result_code_from_daraja == "0":
            current_app.logger.info(f"Daraja Callback SUCCESS: Payment successful for Transaction {transaction.id} (CRID: {checkout_request_id}).")

            metadata_items = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            metadata = {item['Name']: item.get('Value') for item in metadata_items if 'Name' in item and 'Value' in item}
            
            amount_paid_str = str(metadata.get('Amount', "0.00"))
            mpesa_receipt = metadata.get('MpesaReceiptNumber')
            
            current_app.logger.info(f"Transaction {transaction.id}: Amount Paid (Daraja): {amount_paid_str}, Expected: {transaction.amount}, M-Pesa Receipt: {mpesa_receipt}")

            if not mpesa_receipt:
                current_app.logger.error(f"Transaction {transaction.id}: MpesaReceiptNumber is MISSING from Daraja callback despite success code 0. Marking as processing error.")
                transaction.status = 'failed_missing_receipt'
                transaction.daraja_response_description = "MpesaReceiptNumber missing from successful Daraja callback."
                try:
                    db.session.commit()
                except Exception as e_commit:
                    db.session.rollback()
                    current_app.logger.error(f"Transaction {transaction.id}: DB Error committing 'failed_missing_receipt' status: {e_commit}")
                return {"ResultCode": 0, "ResultDesc": "Accepted, MpesaReceiptNumber missing"}, 200
            
            try:
                amount_paid_decimal = Decimal(amount_paid_str)
            except Exception as e_decimal:
                current_app.logger.error(f"Transaction {transaction.id}: Could not convert Daraja Amount '{amount_paid_str}' to Decimal: {e_decimal}. Marking as processing error.")
                transaction.status = 'failed_processing_error'
                transaction.daraja_response_description = f"Invalid amount format from Daraja: {amount_paid_str}"
                try:
                    db.session.commit()
                except Exception as e_commit:
                    db.session.rollback()
                    current_app.logger.error(f"Transaction {transaction.id}: DB Error committing status for invalid amount: {e_commit}")
                return {"ResultCode": 0, "ResultDesc": "Accepted, invalid amount format"}, 200


            if amount_paid_decimal < transaction.amount:
                current_app.logger.warning(f"Transaction {transaction.id}: Amount paid ({amount_paid_decimal}) is less than expected ({transaction.amount}). Marking as underpaid.")
                transaction.status = 'failed_underpaid'
                db.session.commit()
            else:
                try:
                    user = User.query.get(transaction.user_id)
                    shipping_addr = user.address if user and user.address else "Pickup at Dynamic Mall, Shop M90, CBD, Nairobi"
                    
                    items_to_order_snapshot = transaction.cart_items_snapshot
                    if not items_to_order_snapshot:
                        current_app.logger.error(f"Transaction {transaction.id}: Cart items snapshot missing. Cannot create order.")
                        raise ValueError("Cart items snapshot missing for order creation.")

                    new_order = Order(
                        user_id=transaction.user_id,
                        total_price=transaction.amount, 
                        status='paid', 
                        payment_gateway_ref=mpesa_receipt,
                        shipping_address=shipping_addr,
                        billing_address=shipping_addr,
                        payment_transaction_id=transaction.id
                    )
                    db.session.add(new_order)
                    db.session.flush()

                    current_app.logger.info(f"Transaction {transaction.id}: Order {new_order.id} flushed. Populating items.")

                    for item_data in items_to_order_snapshot:
                        artwork = db.session.query(Artwork).filter_by(id=item_data['artwork_id']).with_for_update().first()
                        if not artwork:
                            current_app.logger.error(f"Transaction {transaction.id}, Order {new_order.id}: Artwork ID {item_data['artwork_id']} not found during order creation.")
                            raise ValueError(f"Artwork ID {item_data['artwork_id']} not found.")
                        
                        item_quantity = int(item_data['quantity'])
                        if artwork.stock_quantity < item_quantity:
                            current_app.logger.error(f"Transaction {transaction.id}, Order {new_order.id}: Insufficient stock for {artwork.name} (ID: {artwork.id}). Available: {artwork.stock_quantity}, Requested: {item_quantity}.")
                            raise ValueError(f"Insufficient stock for {artwork.name} (ID: {artwork.id}). Available: {artwork.stock_quantity}, Requested: {item_quantity}.")
                        
                        artwork.stock_quantity -= item_quantity
                        current_app.logger.info(f"Transaction {transaction.id}, Order {new_order.id}: Artwork {artwork.id} stock updated to {artwork.stock_quantity}.")
                        
                        order_item = OrderItem(
                            order_id=new_order.id,
                            artwork_id=item_data['artwork_id'],
                            quantity=item_quantity,
                            price_at_purchase=Decimal(str(item_data['price_at_purchase']))
                        )
                        db.session.add(order_item)
                    
                    current_app.logger.info(f"Transaction {transaction.id}, Order {new_order.id}: All order items added to session.")

                    if transaction.cart_id:
                        deleted_count = CartItem.query.filter_by(cart_id=transaction.cart_id).delete(synchronize_session='fetch')
                        current_app.logger.info(f"Transaction {transaction.id}: Deleted {deleted_count} items from Cart {transaction.cart_id} for Order {new_order.id}")
                    
                    transaction.status = 'successful'
                    
                    db.session.commit()
                    current_app.logger.info(f"Order {new_order.id} created successfully and committed for Transaction {transaction.id} (CRID: {checkout_request_id}).")

                except ValueError as ve:
                    db.session.rollback()
                    current_app.logger.error(f"Transaction {transaction.id}: ValueError during order creation: {ve}")
                    try:
                        txn_to_update = db.session.merge(transaction) if transaction in db.session.dirty else PaymentTransaction.query.get(transaction.id)
                        if txn_to_update:
                           txn_to_update.status = 'failed_processing_error' 
                           txn_to_update.daraja_response_description = f"Order Creation Error: {str(ve)}"
                           db.session.commit()
                        else:
                           current_app.logger.error(f"Transaction {transaction.id}: Could not find transaction to mark as failed_processing_error after ValueError.")
                    except Exception as inner_e:
                        db.session.rollback()
                        current_app.logger.error(f"Transaction {transaction.id}: FAILED to update status to 'failed_processing_error' after ValueError. DB Error: {inner_e}")
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Transaction {transaction.id}: Unexpected Exception during order creation: {e}", exc_info=True)
                    try:
                        txn_to_update = db.session.merge(transaction) if transaction in db.session.dirty else PaymentTransaction.query.get(transaction.id)
                        if txn_to_update:
                            txn_to_update.status = 'failed_processing_error'
                            txn_to_update.daraja_response_description = f"Unexpected Order Creation Error: {str(e)}"
                            db.session.commit()
                        else:
                           current_app.logger.error(f"Transaction {transaction.id}: Could not find transaction to mark as failed_processing_error after unexpected Exception.")
                    except Exception as update_err:
                        db.session.rollback()
                        current_app.logger.error(f"Transaction {transaction.id}: Further error when trying to mark as 'failed_processing_error' after unexpected Exception: {update_err}", exc_info=True)
        else:
            current_app.logger.warning(f"Transaction {transaction.id} (CRID: {checkout_request_id}): Payment reported as FAILED/CANCELLED by Daraja. ResultCode: {result_code_from_daraja}, Desc: {daraja_result_desc}")
            if result_code_from_daraja == "1":
                transaction.status = 'cancelled_by_user'
            elif result_code_from_daraja == "1032":
                transaction.status = 'cancelled_by_user'
            elif result_code_from_daraja == "1037":
                transaction.status = 'failed_timeout'
            else:
                transaction.status = 'failed_daraja'
            
            try:
                db.session.commit()
                current_app.logger.info(f"Transaction {transaction.id}: Status updated to {transaction.status} and committed.")
            except Exception as e_commit:
                db.session.rollback()
                current_app.logger.error(f"Transaction {transaction.id}: DB Error committing failure status '{transaction.status}': {e_commit}")


        return {"ResultCode": 0, "ResultDesc": "Accepted"}, 200

payment_api.add_resource(DarajaCallback, '/callback')