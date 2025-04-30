from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError, fields
from sqlalchemy.orm import joinedload

from .. import db, ma
from ..models import Cart, CartItem, Product, User
from ..schemas import cart_schema

from flask_jwt_extended import jwt_required, get_jwt_identity

cart_bp = Blueprint('cart', __name__)
cart_api = Api(cart_bp)

def get_or_create_cart(user_id):
    """Finds the user's cart or creates one if it doesn't exist."""
    user = User.query.get(user_id)
    if not user:
        abort(404, message="User not found.")

    cart = Cart.query.filter_by(user_id=user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.session.add(cart)
    return cart

class AddToCartSchema(ma.Schema):
    product_id = fields.Str(required=True)
    quantity = fields.Int(required=True, validate=lambda q: q > 0)

add_to_cart_schema = AddToCartSchema()


class CartResource(Resource):
    @jwt_required()
    def get(self):
        """
        Fetches the current user's cart contents.
        """
        user_id = get_jwt_identity()
        cart = get_or_create_cart(user_id)


        if cart.id is None:
             try:
                 db.session.commit()
             except Exception as e:
                 db.session.rollback()
                 print(f"Error committing new cart: {e}")
                 abort(500, message="Could not retrieve or create cart.")

        return cart_schema.dump(cart), 200

    @jwt_required()
    def post(self):
        """
        Adds a product to the current user's cart or updates its quantity.
        """
        user_id = get_jwt_identity()
        json_data = request.get_json()
        if not json_data:
            abort(400, message="No input data provided")

        try:
            data = add_to_cart_schema.load(json_data)
        except ValidationError as err:
            abort(400, message=err.messages)

        product_id = data['product_id']
        quantity_to_add = data['quantity']

        cart = get_or_create_cart(user_id)
        product = Product.query.get(product_id)

        if not product:
            abort(404, message=f"Product with ID {product_id} not found.")

        if product.stock_quantity < quantity_to_add:
             abort(400, message=f"Insufficient stock for Product ID {product_id}. Available: {product.stock_quantity}")

        cart_item = cart.items.filter_by(product_id=product_id).first()

        if cart_item:
            new_quantity = cart_item.quantity + quantity_to_add
            if product.stock_quantity < new_quantity:
                 abort(400, message=f"Insufficient stock to increase quantity for Product ID {product_id}. Available: {product.stock_quantity}, In Cart: {cart_item.quantity}")
            cart_item.quantity = new_quantity
        else:
            cart_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity_to_add)
            db.session.add(cart_item)
            if cart.id is None:
                try:
                    db.session.flush()
                    cart_item.cart_id = cart.id
                except Exception as e:
                     db.session.rollback()
                     print(f"Error flushing cart for item add: {e}")
                     abort(500, message="Error adding item to cart.")


        try:
            db.session.commit()
            cart_updated = Cart.query.options(
                joinedload(Cart.items).joinedload(CartItem.product)
            ).get(cart.id)
            return cart_schema.dump(cart_updated), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error committing cart changes: {e}")
            if "UniqueViolation" in str(e) or "_cart_product_uc" in str(e):
                 abort(409, message="Item already exists in cart or concurrent modification error.")
            abort(500, message="An error occurred while updating the cart.")


class CartItemResource(Resource):

    @jwt_required()
    def put(self, item_id):
        """
        Updates the quantity of a specific item in the cart.
        """
        user_id = get_jwt_identity()
        cart = get_or_create_cart(user_id)

        json_data = request.get_json()
        if not json_data or 'quantity' not in json_data:
             abort(400, message="Quantity is required.")

        try:
            new_quantity = int(json_data['quantity'])
            if new_quantity <= 0:
                abort(400, message="Quantity must be positive.")
        except ValueError:
            abort(400, message="Quantity must be an integer.")

        cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
        if not cart_item:
            abort(404, message=f"Cart item with ID {item_id} not found in your cart.")

        product = Product.query.get(cart_item.product_id)
        if not product:
             abort(404, message=f"Product associated with cart item not found.")

        if product.stock_quantity < new_quantity:
            abort(400, message=f"Insufficient stock for Product ID {product.id}. Available: {product.stock_quantity}")

        cart_item.quantity = new_quantity

        try:
            db.session.commit()
            cart_updated = Cart.query.options(
                joinedload(Cart.items).joinedload(CartItem.product)
            ).get(cart.id)
            return cart_schema.dump(cart_updated), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error updating cart item: {e}")
            abort(500, message="An error occurred while updating the cart item.")


    @jwt_required()
    def delete(self, item_id):
        """
        Removes a specific item from the cart.
        """
        user_id = get_jwt_identity()
        cart = get_or_create_cart(user_id)

        cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
        if not cart_item:
            abort(404, message=f"Cart item with ID {item_id} not found in your cart.")

        try:
            db.session.delete(cart_item)
            db.session.commit()
            cart_updated = Cart.query.options(
                joinedload(Cart.items).joinedload(CartItem.product)
            ).get(cart.id)
            return cart_schema.dump(cart_updated), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting cart item: {e}")
            abort(500, message="An error occurred while removing the item from the cart.")


cart_api.add_resource(CartResource, '/')
cart_api.add_resource(CartItemResource, '/items/<string:item_id>')
