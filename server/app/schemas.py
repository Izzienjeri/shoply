# === ./app/schemas.py ===
from marshmallow import fields, validate, post_dump, exceptions as marshmallow_exceptions
from flask import url_for, current_app

from . import ma, db
from .models import User, Artist, Artwork, Cart, CartItem, Order, OrderItem
from decimal import Decimal, InvalidOperation


class UserSchema(ma.SQLAlchemyAutoSchema):
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=8))
    email = fields.Email(required=True)
    name = fields.Str()
    address = fields.Str()

    class Meta:
        model = User
        load_instance = True
        exclude = ('password_hash',)
        sqla_session = db.session

class ArtistSchema(ma.SQLAlchemyAutoSchema):
    name = fields.Str(required=True)
    bio = fields.Str()
    artworks = fields.Nested("ArtworkSchema", many=True, dump_only=True) # Already using string ref, good

    class Meta:
        model = Artist
        load_instance = True
        sqla_session = db.session

class ArtworkSchema(ma.SQLAlchemyAutoSchema):
    price = fields.Decimal(as_string=True, required=True, validate=validate.Range(min=0))
    stock_quantity = fields.Int(validate=validate.Range(min=0))
    image_url = fields.String(dump_only=True, required=False, allow_none=True)

    artist = fields.Nested("ArtistSchema", only=('id', 'name'), dump_only=True) # CHANGED: Used string reference "ArtistSchema"
    artist_id = fields.Str(required=True, load_only=True)

    class Meta:
        model = Artwork
        load_instance = True
        sqla_session = db.session

    @post_dump
    def make_image_url_absolute(self, data, **kwargs):
        """Converts the stored relative image path to an absolute URL after dumping."""
        relative_path = data.get('image_url')
        if relative_path:
            try:
                # Ensure app context is available. This check might be redundant if always called within one.
                if current_app:
                     absolute_url = url_for('serve_media', filename=relative_path, _external=True)
                     data['image_url'] = absolute_url
                else: # Should not happen in normal request cycle
                    current_app.logger.error(f"No Flask app context available for generating URL for '{relative_path}'.")
                    data['image_url'] = None # Or keep relative_path, or a placeholder
            except RuntimeError as e: # Catch if url_for is called outside app/request context
                # Log the error, but avoid crashing. 'current_app' might not be available here either.
                # Consider using a generic logger if current_app is the issue.
                print(f"Could not generate URL for '{relative_path}'. Is app context available? Error: {e}")
                data['image_url'] = None # Or some fallback
            except Exception as e:
                print(f"Unexpected error generating URL for '{relative_path}': {e}")
                data['image_url'] = None # Or some fallback
        else:
            data['image_url'] = None
        return data

class CartItemSchema(ma.SQLAlchemyAutoSchema):
    artwork = fields.Nested(
        "ArtworkSchema", # Using string reference for consistency
        only=('id', 'name', 'price', 'image_url', 'artist', 'stock_quantity')
    )
    quantity = fields.Int(required=True, validate=validate.Range(min=1))

    class Meta:
        model = CartItem
        load_instance = True
        sqla_session = db.session
        exclude = ('cart_id',)

class CartSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(CartItemSchema, many=True) # CartItemSchema is defined above, direct ref is fine
    total_price = fields.Method("calculate_total", dump_only=True)

    def calculate_total(self, cart):
        """Calculates the total price of the cart items."""
        total = Decimal('0.00')
        items_iterable = []
        if hasattr(cart, 'items'):
            try:
                # items can be a list (if manually populated) or a SQLAlchemy dynamic relationship
                items_iterable = cart.items.all() if callable(getattr(cart.items, 'all', None)) else cart.items
            except Exception as e:
                 # Use current_app.logger if available and in context
                 print(f"Could not iterate cart items for cart {getattr(cart, 'id', 'N/A')}: {e}")
                 items_iterable = [] # Ensure it's an empty list

        for item in items_iterable:
             if (hasattr(item, 'artwork') and item.artwork and
                 hasattr(item.artwork, 'price') and item.artwork.price is not None and
                 hasattr(item, 'quantity')):
                 try:
                      item_price = Decimal(item.artwork.price) # Price from artwork should already be Decimal
                      total += item_price * Decimal(item.quantity)
                 except (TypeError, ValueError, InvalidOperation) as e:
                      print(f"Could not calculate price for item {getattr(item, 'id', 'N/A')}, artwork {getattr(item.artwork, 'id', 'N/A')}. Price: '{item.artwork.price}', Qty: {item.quantity}. Error: {e}")
                      continue
             else:
                 print(f"Artwork data (price/quantity) missing or incomplete for cart item {getattr(item, 'id', 'N/A')} in cart {getattr(cart, 'id', 'N/A')}. Cannot calculate total accurately.")

        return str(total)

    class Meta:
        model = Cart
        load_instance = True
        sqla_session = db.session


class OrderItemSchema(ma.SQLAlchemyAutoSchema):
    artwork = fields.Nested("ArtworkSchema", only=('id', 'name', 'image_url', 'artist')) # Using string reference
    price_at_purchase = fields.Decimal(as_string=True, dump_only=True)
    quantity = fields.Int(dump_only=True)

    class Meta:
        model = OrderItem
        load_instance = True
        sqla_session = db.session
        exclude = ('order_id',)

class OrderSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(OrderItemSchema, many=True, dump_only=True) # OrderItemSchema is defined above
    total_price = fields.Decimal(as_string=True, dump_only=True)
    status = fields.Str(dump_only=True)
    user_id = fields.String(dump_only=True) # Or fields.Nested("UserSchema", only=("id", "email")) if you want user details
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    shipped_at = fields.DateTime(dump_only=True, allow_none=True)
    shipping_address = fields.Str(dump_only=True, allow_none=True)
    billing_address = fields.Str(dump_only=True, allow_none=True)
    payment_gateway_ref = fields.Str(dump_only=True, allow_none=True)


    class Meta:
        model = Order
        load_instance = True
        sqla_session = db.session


user_schema = UserSchema()
artist_schema = ArtistSchema()
artwork_schema = ArtworkSchema()
cart_schema = CartSchema()
order_schema = OrderSchema()

users_schema = UserSchema(many=True)
artists_schema = ArtistSchema(many=True)
artworks_schema = ArtworkSchema(many=True)
orders_schema = OrderSchema(many=True)