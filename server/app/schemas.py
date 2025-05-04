
from marshmallow import fields, validate, post_dump
from flask import url_for, current_app

from . import ma, db
from .models import User, Product, Cart, CartItem, Order, OrderItem


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

class ProductSchema(ma.SQLAlchemyAutoSchema):
    price = fields.Decimal(as_string=True, required=True, validate=validate.Range(min=0))
    stock_quantity = fields.Int(validate=validate.Range(min=0))
    image_url = fields.String(dump_only=True, required=False, allow_none=True)

    class Meta:
        model = Product
        load_instance = True
        sqla_session = db.session

    @post_dump
    def make_image_url_absolute(self, data, **kwargs):
        """Converts the stored relative image path to an absolute URL after dumping."""
        relative_path = data.get('image_url')
        if relative_path:
            try:
                absolute_url = url_for('serve_media', filename=relative_path, _external=True)
                data['image_url'] = absolute_url
            except RuntimeError as e:
                print(f"ERROR: Could not generate URL for '{relative_path}'. Is app context available? Error: {e}")
                data['image_url'] = None
            except Exception as e:
                print(f"ERROR: Unexpected error generating URL for '{relative_path}': {e}")
                data['image_url'] = None
        else:
            data['image_url'] = None
        return data

class CartItemSchema(ma.SQLAlchemyAutoSchema):
    product = fields.Nested(ProductSchema, only=('id', 'name', 'price', 'image_url'))
    quantity = fields.Int(required=True, validate=validate.Range(min=1))

    class Meta:
        model = CartItem
        load_instance = True
        sqla_session = db.session
        exclude = ('cart_id',)

class CartSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(CartItemSchema, many=True)

    class Meta:
        model = Cart
        load_instance = True
        sqla_session = db.session

class OrderItemSchema(ma.SQLAlchemyAutoSchema):
    product = fields.Nested(ProductSchema, only=('id', 'name', 'image_url'))
    price_at_purchase = fields.Decimal(as_string=True, dump_only=True)
    quantity = fields.Int(dump_only=True)

    class Meta:
        model = OrderItem
        load_instance = True
        sqla_session = db.session
        exclude = ('order_id',)

class OrderSchema(ma.SQLAlchemyAutoSchema):
    items = fields.Nested(OrderItemSchema, many=True, dump_only=True)
    total_price = fields.Decimal(as_string=True, dump_only=True)
    status = fields.Str(dump_only=True)
    user_id = fields.String(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    shipping_address = fields.Str(dump_only=True, allow_none=True)
    payment_gateway_ref = fields.Str(dump_only=True, allow_none=True)


    class Meta:
        model = Order
        load_instance = True
        sqla_session = db.session


user_schema = UserSchema()
product_schema = ProductSchema()
cart_schema = CartSchema()
order_schema = OrderSchema()

users_schema = UserSchema(many=True)
products_schema = ProductSchema(many=True)
orders_schema = OrderSchema(many=True)

