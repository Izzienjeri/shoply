from marshmallow import fields, validate, post_dump, exceptions as marshmallow_exceptions, missing as marshmallow_missing_value
from flask import url_for, current_app
from decimal import Decimal, InvalidOperation

from . import ma, db
from .models import User, Artist, Artwork, Cart, CartItem, Order, OrderItem, DeliveryOption, Notification


class UserSchema(ma.SQLAlchemyAutoSchema):
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=8))
    email = fields.Email(required=True)
    name = fields.Str()
    address = fields.Str()
    is_admin = fields.Bool(dump_only=True)

    class Meta:
        model = User
        load_instance = True
        exclude = ('password_hash',)
        sqla_session = db.session

class ArtworkSchema(ma.SQLAlchemyAutoSchema):
    price = fields.Decimal(as_string=True, required=True, validate=validate.Range(min=0))
    stock_quantity = fields.Int(validate=validate.Range(min=0))
    image_url = fields.String(required=False, allow_none=True)
    artist = fields.Nested("ArtistSchema", only=('id', 'name', 'is_active'), dump_only=True)
    artist_id = fields.Str(required=True, load_only=True)
    is_active = fields.Bool(load_default=True)

    class Meta:
        model = Artwork
        load_instance = True
        sqla_session = db.session
        include_fk = True

    @post_dump
    def make_image_url_absolute(self, data, **kwargs):
        relative_path = data.get('image_url')
        if relative_path:
            try:
                _app = current_app._get_current_object() if not current_app else current_app
                if _app:
                    absolute_url = url_for('serve_media', filename=relative_path, _external=True)
                    data['image_url'] = absolute_url
                else:
                    data['image_url'] = relative_path
            except RuntimeError:
                data['image_url'] = relative_path
            except Exception:
                data['image_url'] = relative_path
        else:
            data['image_url'] = None
        return data

class ArtistSchema(ma.SQLAlchemyAutoSchema):
    name = fields.Str(required=True, validate=validate.Length(min=1))
    bio = fields.Str(allow_none=True)
    artworks = fields.Nested(ArtworkSchema, many=True, dump_only=True)
    artworks_count = fields.Method("get_artworks_count", dump_only=True)
    is_active = fields.Bool(load_default=True)

    def get_artworks_count(self, obj):
        if hasattr(obj, '_artworks_count_val'):
            return obj._artworks_count_val
        if hasattr(obj, 'artworks_for_display'):
            return len(obj.artworks_for_display)
        return len(obj.artworks) if obj.artworks else 0


    class Meta:
        model = Artist
        load_instance = True
        sqla_session = db.session
        include_relationships = True


class CartItemSchema(ma.SQLAlchemyAutoSchema):
    artwork = fields.Nested(
        ArtworkSchema,
        only=('id', 'name', 'price', 'image_url', 'artist', 'stock_quantity', 'is_active')
    )
    quantity = fields.Int(required=True, validate=validate.Range(min=1))

    class Meta:
        model = CartItem
        load_instance = True
        sqla_session = db.session
        exclude = ('cart_id',)

class CartSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(CartItemSchema, many=True)
    total_price = fields.Method("calculate_total", dump_only=True)

    def calculate_total(self, cart):
        total = Decimal('0.00')
        items_iterable = []

        if hasattr(cart, 'items'):
            try:
                items_iterable = cart.items if cart.items is not None else []
            except Exception as e:
                current_app.logger.error(f"Could not iterate cart items for cart {getattr(cart, 'id', 'N/A')}: {e}", exc_info=True)
                items_iterable = []

        for item in items_iterable:
            if (item and item.artwork and item.artwork.is_active and
                item.artwork.artist and item.artwork.artist.is_active and
                hasattr(item.artwork, 'price') and item.artwork.price is not None and
                hasattr(item, 'quantity') and item.quantity is not None):
                try:
                    item_price = Decimal(str(item.artwork.price))
                    total += item_price * Decimal(item.quantity)
                except (TypeError, ValueError, InvalidOperation) as e:
                    current_app.logger.error(f"Could not calculate price for item {getattr(item, 'id', 'N/A')}, artwork {getattr(item.artwork, 'id', 'N/A')}. Price: '{item.artwork.price}', Qty: {item.quantity}. Error: {e}", exc_info=True)
                    continue
            elif item and item.artwork and (not item.artwork.is_active or (item.artwork.artist and not item.artwork.artist.is_active)):
                 current_app.logger.info(f"Skipping inactive artwork '{item.artwork.name}' or artwork by inactive artist from cart total calculation for cart {getattr(cart, 'id', 'N/A')}.")
            else:
                current_app.logger.warning(f"Artwork data (price/quantity/active status/artist status) missing or incomplete for cart item {getattr(item, 'id', 'N/A')} in cart {getattr(cart, 'id', 'N/A')}. Cannot calculate total accurately.")
        return str(total)

    class Meta:
        model = Cart
        load_instance = True
        sqla_session = db.session

class OrderItemSchema(ma.SQLAlchemyAutoSchema):
    artwork = fields.Nested(ArtworkSchema, only=('id', 'name', 'image_url', 'artist', 'is_active'))
    price_at_purchase = fields.Decimal(as_string=True, dump_only=True)
    quantity = fields.Int(dump_only=True)

    class Meta:
        model = OrderItem
        load_instance = True
        sqla_session = db.session
        exclude = ('order_id',)

class DeliveryOptionSchema(ma.SQLAlchemyAutoSchema):
    id = fields.Str(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, error="Name is required."))
    price = fields.Decimal(as_string=True, required=True, validate=validate.Range(min=0, error="Price must be non-negative."))
    description = fields.Str(allow_none=True)
    is_pickup = fields.Bool(load_default=False)
    active = fields.Bool(load_default=True)
    sort_order = fields.Int(load_default=0)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    class Meta:
        model = DeliveryOption
        load_instance = True
        sqla_session = db.session

class OrderSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(OrderItemSchema, many=True, dump_only=True)
    total_price = fields.Decimal(as_string=True, dump_only=True)
    status = fields.Str(dump_only=True)
    user_id = fields.String(dump_only=True)
    user = fields.Nested(UserSchema, only=('id', 'email', 'name'), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    shipped_at = fields.DateTime(dump_only=True, allow_none=True)
    shipping_address = fields.Str(dump_only=True, allow_none=True)
    billing_address = fields.Str(dump_only=True, allow_none=True)
    payment_gateway_ref = fields.Str(dump_only=True, allow_none=True)
    delivery_fee = fields.Decimal(as_string=True, dump_only=True, allow_none=True)
    delivery_option_details = fields.Nested(
        DeliveryOptionSchema,
        dump_only=True,
        only=("id", "name", "price", "is_pickup", "description")
    )
    picked_up_by_name = fields.Str(allow_none=True, dump_only=True)
    picked_up_by_id_no = fields.Str(allow_none=True, dump_only=True)
    picked_up_at = fields.DateTime(allow_none=True, dump_only=True)
    is_pickup_order = fields.Boolean(dump_only=True)

    class Meta:
        model = Order
        load_instance = True
        sqla_session = db.session

class NotificationSchema(ma.SQLAlchemyAutoSchema):
    user = fields.Nested(UserSchema, only=('id', 'email', 'name'), dump_only=True, allow_none=True)
    created_at = fields.DateTime(format='%Y-%m-%dT%H:%M:%S.%f')

    class Meta:
        model = Notification
        load_instance = True
        sqla_session = db.session
        include_fk = True


user_schema = UserSchema()
cart_schema = CartSchema()
order_schema = OrderSchema()
artist_schema = ArtistSchema()
artwork_schema = ArtworkSchema()
notification_schema = NotificationSchema()

users_schema = UserSchema(many=True)
artists_schema = ArtistSchema(many=True)
artworks_schema = ArtworkSchema(many=True)
orders_schema = OrderSchema(many=True)
notifications_schema = NotificationSchema(many=True)


delivery_option_schema_admin = DeliveryOptionSchema()
delivery_options_schema_admin = DeliveryOptionSchema(many=True)

delivery_option_schema_public = DeliveryOptionSchema(
    only=('id', 'name', 'price', 'description', 'is_pickup')
)
delivery_options_schema_public = DeliveryOptionSchema(
    many=True,
    only=('id', 'name', 'price', 'description', 'is_pickup')
)

admin_artist_schema = ArtistSchema()
admin_artwork_schema = ArtworkSchema()