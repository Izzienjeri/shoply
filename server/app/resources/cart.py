from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError, fields
from sqlalchemy.orm import joinedload

from .. import db, ma
from ..models import Cart, CartItem, Artwork, User
from ..schemas import cart_schema

from flask_jwt_extended import jwt_required, get_jwt_identity

cart_bp = Blueprint('cart', __name__)
cart_api = Api(cart_bp)

def get_or_create_cart(user_id):
    """Finds the user's cart or creates one if it doesn't exist."""
    user = User.query.get(user_id)
    if not user:
        abort(404, message="User not found.")

    cart = Cart.query.options(
        joinedload(Cart.items).options(
            joinedload(CartItem.artwork).joinedload(Artwork.artist)
        )
    ).filter_by(user_id=user_id).first()

    if not cart:
        cart = Cart(user_id=user_id)
        db.session.add(cart)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error creating new cart: {e}")
            abort(500, message="Could not create cart.")
        cart = Cart.query.options(
            joinedload(Cart.items).options(
                joinedload(CartItem.artwork).joinedload(Artwork.artist)
            )
        ).filter_by(user_id=user_id).first()

    return cart

class AddToCartSchema(ma.Schema):
    artwork_id = fields.Str(required=True)
    quantity = fields.Int(required=True, validate=lambda q: q > 0)

add_to_cart_schema = AddToCartSchema()


class CartResource(Resource):
    @jwt_required()
    def get(self):
        """
        Fetches the current user's cart contents, including artwork and artist details.
        """
        user_id = get_jwt_identity()
        cart = get_or_create_cart(user_id)

        return cart_schema.dump(cart), 200

    @jwt_required()
    def post(self):
        """
        Adds an artwork to the current user's cart or updates its quantity.
        """
        user_id = get_jwt_identity()
        json_data = request.get_json()
        if not json_data:
            abort(400, message="No input data provided")

        try:
            data = add_to_cart_schema.load(json_data)
        except ValidationError as err:
            abort(400, message=err.messages)

        artwork_id = data['artwork_id']
        quantity_to_add = data['quantity']

        cart = get_or_create_cart(user_id)
        if cart.id is None:
            abort(500, message="Failed to retrieve or initialize cart.")

        artwork = Artwork.query.get(artwork_id)

        if not artwork:
            abort(404, message=f"Artwork with ID {artwork_id} not found.")

        if artwork.stock_quantity < quantity_to_add:
             abort(400, message=f"Insufficient stock for Artwork ID {artwork_id}. Available: {artwork.stock_quantity}")

        cart_item = next((item for item in cart.items if item.artwork_id == artwork_id), None)
        if cart_item is None:
             cart_item = CartItem.query.filter_by(cart_id=cart.id, artwork_id=artwork_id).first()


        if cart_item:
            new_quantity = cart_item.quantity + quantity_to_add
            if artwork.stock_quantity < new_quantity:
                 abort(400, message=f"Insufficient stock to increase quantity for Artwork ID {artwork_id}. Available: {artwork.stock_quantity}, In Cart: {cart_item.quantity}")
            cart_item.quantity = new_quantity
        else:
            cart_item = CartItem(cart_id=cart.id, artwork_id=artwork_id, quantity=quantity_to_add)
            db.session.add(cart_item)

        try:
            db.session.commit()
            cart_updated = Cart.query.options(
                 joinedload(Cart.items).options(
                     joinedload(CartItem.artwork).joinedload(Artwork.artist)
                 )
            ).get(cart.id)
            return cart_schema.dump(cart_updated), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error committing cart changes: {e}")
            if "UniqueViolation" in str(e) or "_cart_artwork_uc" in str(e):
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
                abort(400, message="Quantity must be positive. Use DELETE to remove item.")
        except ValueError:
            abort(400, message="Quantity must be an integer.")

        cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
        if not cart_item:
            abort(404, message=f"Cart item with ID {item_id} not found in your cart.")

        artwork = Artwork.query.get(cart_item.artwork_id)
        if not artwork:
             abort(404, message=f"Artwork associated with cart item not found.")

        if artwork.stock_quantity < new_quantity:
            abort(400, message=f"Insufficient stock for Artwork ID {artwork.id}. Available: {artwork.stock_quantity}")

        cart_item.quantity = new_quantity

        try:
            db.session.commit()
            cart_updated = Cart.query.options(
                 joinedload(Cart.items).options(
                     joinedload(CartItem.artwork).joinedload(Artwork.artist)
                 )
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
                 joinedload(Cart.items).options(
                     joinedload(CartItem.artwork).joinedload(Artwork.artist)
                 )
            ).get(cart.id)
            return cart_schema.dump(cart_updated), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting cart item: {e}")
            abort(500, message="An error occurred while removing the item from the cart.")


cart_api.add_resource(CartResource, '/')
cart_api.add_resource(CartItemResource, '/items/<string:item_id>')