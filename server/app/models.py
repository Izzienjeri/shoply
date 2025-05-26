import uuid
from datetime import datetime
from sqlalchemy.dialects.mysql import DECIMAL
import json
from flask import current_app

from . import db, bcrypt



def generate_uuid():
    return str(uuid.uuid4())

class Artist(db.Model):
    __tablename__ = 'artists'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(150), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    artworks = db.relationship('Artwork', back_populates='artist', cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Artist {self.name}>"

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    address = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)

    cart = db.relationship('Cart', back_populates='user', uselist=False, cascade="all, delete-orphan")
    orders = db.relationship('Order', back_populates='user', lazy='dynamic', cascade="all, delete-orphan")
    payment_transactions = db.relationship('PaymentTransaction', back_populates='user', lazy='dynamic')


    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"

class Artwork(db.Model):
    __tablename__ = 'artworks'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(DECIMAL(precision=10, scale=2), nullable=False)
    stock_quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    image_url = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    artist_id = db.Column(db.String(36), db.ForeignKey('artists.id'), nullable=False)

    artist = db.relationship('Artist', back_populates='artworks')
    cart_items = db.relationship('CartItem', back_populates='artwork', lazy='dynamic')
    order_items = db.relationship('OrderItem', back_populates='artwork', lazy='dynamic')

    def __repr__(self):
        return f"<Artwork {self.name} by Artist {self.artist_id}>"

class Cart(db.Model):
    __tablename__ = 'carts'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', back_populates='cart')
    items = db.relationship('CartItem', back_populates='cart', cascade="all, delete-orphan", lazy='joined')

    def __repr__(self):
        return f"<Cart {self.id} for User {self.user_id}>"

class CartItem(db.Model):
    __tablename__ = 'cart_items'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    cart_id = db.Column(db.String(36), db.ForeignKey('carts.id'), nullable=False)
    artwork_id = db.Column(db.String(36), db.ForeignKey('artworks.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)

    __table_args__ = (db.UniqueConstraint('cart_id', 'artwork_id', name='_cart_artwork_uc'),)

    cart = db.relationship('Cart', back_populates='items')
    artwork = db.relationship('Artwork', back_populates='cart_items', lazy='joined')

    def __repr__(self):
        return f"<CartItem Artwork {self.artwork_id} Qty {self.quantity} in Cart {self.cart_id}>"

class DeliveryOption(db.Model):
    __tablename__ = 'delivery_options'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False, unique=True)
    price = db.Column(DECIMAL(precision=10, scale=2), nullable=False, default=0.00)
    description = db.Column(db.Text, nullable=True)
    is_pickup = db.Column(db.Boolean, default=False, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<DeliveryOption {self.name} Price: {self.price}>"

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    total_price = db.Column(DECIMAL(precision=10, scale=2), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    shipped_at = db.Column(db.DateTime, nullable=True)
    shipping_address = db.Column(db.Text, nullable=True)
    billing_address = db.Column(db.Text, nullable=True)
    payment_gateway_ref = db.Column(db.String(255), nullable=True)

    delivery_option_id = db.Column(db.String(36), db.ForeignKey('delivery_options.id'), nullable=True)
    delivery_fee = db.Column(DECIMAL(precision=10, scale=2), nullable=False, default=0.00)

    picked_up_by_name = db.Column(db.String(150), nullable=True)
    picked_up_by_id_no = db.Column(db.String(50), nullable=True)
    picked_up_at = db.Column(db.DateTime, nullable=True)


    user = db.relationship('User', back_populates='orders')
    items = db.relationship('OrderItem', back_populates='order', cascade="all, delete-orphan", lazy='joined')
    
    payment_transaction_id = db.Column(db.String(36), db.ForeignKey('payment_transactions.id'), nullable=True, index=True)
    payment_transaction = db.relationship('PaymentTransaction', backref=db.backref('order_record', uselist=False))
    
    delivery_option_details = db.relationship('DeliveryOption', lazy='joined')

    @property
    def is_pickup_order(self):
        if self.delivery_option_details:
            return self.delivery_option_details.is_pickup
        return False

    def __repr__(self):
        return f"<Order {self.id} Status {self.status} User {self.user_id} Total {self.total_price}>"

class OrderItem(db.Model):
    __tablename__ = 'order_items'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    order_id = db.Column(db.String(36), db.ForeignKey('orders.id'), nullable=False)
    artwork_id = db.Column(db.String(36), db.ForeignKey('artworks.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_at_purchase = db.Column(DECIMAL(precision=10, scale=2), nullable=False)

    order = db.relationship('Order', back_populates='items')
    artwork = db.relationship('Artwork', back_populates='order_items', lazy='joined')

    def __repr__(self):
        return f"<OrderItem Artwork {self.artwork_id} Qty {self.quantity} Price {self.price_at_purchase} in Order {self.order_id}>"

class PaymentTransaction(db.Model):
    __tablename__ = 'payment_transactions'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    checkout_request_id = db.Column(db.String(100), unique=True, nullable=True, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    cart_id = db.Column(db.String(36), db.ForeignKey('carts.id'), nullable=True) 
    amount = db.Column(DECIMAL(precision=10, scale=2), nullable=False)
    phone_number = db.Column(db.String(15), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='initiated') 
    daraja_response_description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    _cart_items_snapshot = db.Column(db.Text, nullable=True)

    selected_delivery_option_id = db.Column(db.String(36), db.ForeignKey('delivery_options.id'), nullable=True)
    applied_delivery_fee = db.Column(DECIMAL(precision=10, scale=2), nullable=True)

    user = db.relationship('User', back_populates='payment_transactions')


    @property
    def cart_items_snapshot(self):
        if self._cart_items_snapshot:
            try:
                return json.loads(self._cart_items_snapshot)
            except json.JSONDecodeError:
                current_app.logger.error(f"Failed to decode cart_items_snapshot for PaymentTransaction {self.id}")
                return None
        return None

    @cart_items_snapshot.setter
    def cart_items_snapshot(self, value):
        if value:
            self._cart_items_snapshot = json.dumps(value)
        else:
            self._cart_items_snapshot = None
            
    def __repr__(self):
        return f"<PaymentTransaction {self.id} CRID: {self.checkout_request_id} Status: {self.status} Amount: {self.amount}>"