# === ./app/schemas.py ===

from marshmallow import fields, validate, post_dump, exceptions as marshmallow_exceptions
from flask import url_for, current_app
from decimal import Decimal, InvalidOperation

from . import ma, db
from .models import User, Artist, Artwork, Cart, CartItem, Order, OrderItem, DeliveryOption

class UserSchema(ma.SQLAlchemyAutoSchema):
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=8))
    email = fields.Email(required=True)
    name = fields.Str()
    address = fields.Str()
    is_admin = fields.Bool(dump_only=True) # Admins can be set via DB directly or a dedicated admin endpoint later

    class Meta:
        model = User
        load_instance = True
        exclude = ('password_hash',)
        sqla_session = db.session

class ArtistSchema(ma.SQLAlchemyAutoSchema):
    name = fields.Str(required=True)
    bio = fields.Str()
    artworks = fields.Nested("ArtworkSchema", many=True, dump_only=True, exclude=("artist",)) # Exclude artist from nested artwork
    is_active = fields.Bool() # For admin to load and dump

    class Meta:
        model = Artist
        load_instance = True
        sqla_session = db.session

class ArtworkSchema(ma.SQLAlchemyAutoSchema):
    price = fields.Decimal(as_string=True, required=True, validate=validate.Range(min=0))
    stock_quantity = fields.Int(validate=validate.Range(min=0))
    image_url = fields.String(dump_only=True, required=False, allow_none=True)
    artist = fields.Nested(ArtistSchema, only=('id', 'name'), dump_only=True)
    artist_id = fields.Str(required=True, load_only=True)
    is_active = fields.Bool() # For admin to load and dump

    class Meta:
        model = Artwork
        load_instance = True
        sqla_session = db.session

    @post_dump
    def make_image_url_absolute(self, data, **kwargs):
        relative_path = data.get('image_url')
        if relative_path:
            try:
                # Ensure we are in an app context if not already
                _app = current_app._get_current_object() if not current_app else current_app
                if _app:
                    with _app.app_context(): # Ensure context for url_for
                         absolute_url = url_for('serve_media', filename=relative_path, _external=True)
                         data['image_url'] = absolute_url
                else:
                    # Log error if app context can't be obtained (e.g. during seeding without app context)
                    # print(f"No Flask app context available for generating URL for '{relative_path}'.")
                    data['image_url'] = relative_path # Return relative if no context
            except RuntimeError as e:
                # print(f"Could not generate URL for '{relative_path}'. Is app context available? Error: {e}")
                data['image_url'] = relative_path # Fallback
            except Exception as e:
                # print(f"Unexpected error generating URL for '{relative_path}': {e}")
                data['image_url'] = relative_path # Fallback
        else:
            data['image_url'] = None
        return data

class CartItemSchema(ma.SQLAlchemyAutoSchema):
    artwork = fields.Nested(
        ArtworkSchema,
        only=('id', 'name', 'price', 'image_url', 'artist', 'stock_quantity', 'is_active') # Add is_active
    )
    quantity = fields.Int(required=True, validate=validate.Range(min=1))

    class Meta:
        model = CartItem
        load_instance = True
        sqla_session = db.session
        exclude = ('cart_id',)

class CartSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(CartItemSchema, many=True)
    total_price = fields.Method("calculate_total", dump_only=True) # This is cart subtotal

    def calculate_total(self, cart):
        total = Decimal('0.00')
        items_iterable = []
        if hasattr(cart, 'items'):
            try:
                items_iterable = cart.items.all() if callable(getattr(cart.items, 'all', None)) else cart.items
            except Exception as e:
                print(f"Could not iterate cart items for cart {getattr(cart, 'id', 'N/A')}: {e}")
                items_iterable = []

        for item in items_iterable:
            if (hasattr(item, 'artwork') and item.artwork and
                hasattr(item.artwork, 'price') and item.artwork.price is not None and
                hasattr(item, 'quantity') and
                item.artwork.is_active): # Only include active artworks in cart total
                try:
                    item_price = Decimal(item.artwork.price)
                    total += item_price * Decimal(item.quantity)
                except (TypeError, ValueError, InvalidOperation) as e:
                    print(f"Could not calculate price for item {getattr(item, 'id', 'N/A')}, artwork {getattr(item.artwork, 'id', 'N/A')}. Price: '{item.artwork.price}', Qty: {item.quantity}. Error: {e}")
                    continue
            elif hasattr(item, 'artwork') and item.artwork and not item.artwork.is_active:
                 print(f"Skipping inactive artwork {item.artwork.name} from cart total calculation.")
            else:
                print(f"Artwork data (price/quantity/active status) missing or incomplete for cart item {getattr(item, 'id', 'N/A')} in cart {getattr(cart, 'id', 'N/A')}. Cannot calculate total accurately.")
        return str(total)

    class Meta:
        model = Cart
        load_instance = True
        sqla_session = db.session

class OrderItemSchema(ma.SQLAlchemyAutoSchema):
    artwork = fields.Nested(ArtworkSchema, only=('id', 'name', 'image_url', 'artist', 'is_active')) # Add is_active
    price_at_purchase = fields.Decimal(as_string=True, dump_only=True)
    quantity = fields.Int(dump_only=True)

    class Meta:
        model = OrderItem
        load_instance = True
        sqla_session = db.session
        exclude = ('order_id',)

class DeliveryOptionSchema(ma.SQLAlchemyAutoSchema):
    price = fields.Decimal(as_string=True, required=True)
    name = fields.Str(required=True)
    description = fields.Str(allow_none=True)
    is_pickup = fields.Bool(required=True)
    id = fields.Str(dump_only=True)
    active = fields.Bool() # For admin to load and dump
    sort_order = fields.Int() # For admin to load and dump

    class Meta:
        model = DeliveryOption
        load_instance = True
        sqla_session = db.session
        # For admin endpoints, you might want to include all fields
        # exclude = ('created_at', 'updated_at')

delivery_option_schema_admin = DeliveryOptionSchema() # More complete schema for admin
delivery_options_schema_admin = DeliveryOptionSchema(many=True)

# Schema for public display (active only, fewer fields)
delivery_option_schema_public = DeliveryOptionSchema(exclude=('created_at', 'updated_at', 'active', 'sort_order'))
delivery_options_schema_public = DeliveryOptionSchema(many=True, exclude=('created_at', 'updated_at', 'active', 'sort_order'))


class OrderSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(OrderItemSchema, many=True, dump_only=True)
    total_price = fields.Decimal(as_string=True, dump_only=True)
    status = fields.Str(dump_only=True)
    user_id = fields.String(dump_only=True)
    user = fields.Nested(UserSchema, only=('id', 'email', 'name'), dump_only=True) # For admin view
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    shipped_at = fields.DateTime(dump_only=True, allow_none=True)
    shipping_address = fields.Str(dump_only=True, allow_none=True)
    billing_address = fields.Str(dump_only=True, allow_none=True)
    payment_gateway_ref = fields.Str(dump_only=True, allow_none=True)

    delivery_fee = fields.Decimal(as_string=True, dump_only=True)
    delivery_option_details = fields.Nested(DeliveryOptionSchema, dump_only=True, only=("id", "name", "price", "is_pickup", "description"))

    # New pickup fields
    picked_up_by_name = fields.Str(allow_none=True)
    picked_up_by_id_no = fields.Str(allow_none=True)
    picked_up_at = fields.DateTime(allow_none=True)


    class Meta:
        model = Order
        load_instance = True # Will be used for admin updates
        sqla_session = db.session

# Instantiate schemas
user_schema = UserSchema()
artist_schema = ArtistSchema()
artwork_schema = ArtworkSchema()
cart_schema = CartSchema()
order_schema = OrderSchema()

users_schema = UserSchema(many=True)
artists_schema = ArtistSchema(many=True)
artworks_schema = ArtworkSchema(many=True)
orders_schema = OrderSchema(many=True)

# For specific admin POST/PATCH where all fields might be settable
admin_artist_schema = ArtistSchema()
admin_artwork_schema = ArtworkSchema()