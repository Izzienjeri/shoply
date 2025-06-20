"""done

Revision ID: 434351ac22af
Revises: 
Create Date: 2025-05-27 07:25:35.835536

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '434351ac22af'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('artists',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('bio', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('delivery_options',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('price', mysql.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_pickup', sa.Boolean(), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('users',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('password_hash', sa.String(length=128), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('is_admin', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('artworks',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('price', mysql.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('stock_quantity', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('image_url', sa.String(length=255), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('artist_id', sa.String(length=36), nullable=False),
    sa.ForeignKeyConstraint(['artist_id'], ['artists.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('carts',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_table('notifications',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=True),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('read_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('link', sa.String(length=255), nullable=True),
    sa.Column('for_admin_audience', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_user_id'), ['user_id'], unique=False)

    op.create_table('cart_items',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('cart_id', sa.String(length=36), nullable=False),
    sa.Column('artwork_id', sa.String(length=36), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['artwork_id'], ['artworks.id'], ),
    sa.ForeignKeyConstraint(['cart_id'], ['carts.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('cart_id', 'artwork_id', name='_cart_artwork_uc')
    )
    op.create_table('payment_transactions',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('checkout_request_id', sa.String(length=100), nullable=True),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('cart_id', sa.String(length=36), nullable=True),
    sa.Column('amount', mysql.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('phone_number', sa.String(length=15), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('daraja_response_description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('_cart_items_snapshot', sa.Text(), nullable=True),
    sa.Column('selected_delivery_option_id', sa.String(length=36), nullable=True),
    sa.Column('applied_delivery_fee', mysql.DECIMAL(precision=10, scale=2), nullable=True),
    sa.ForeignKeyConstraint(['cart_id'], ['carts.id'], ),
    sa.ForeignKeyConstraint(['selected_delivery_option_id'], ['delivery_options.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('payment_transactions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_payment_transactions_checkout_request_id'), ['checkout_request_id'], unique=True)

    op.create_table('orders',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('total_price', mysql.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('shipped_at', sa.DateTime(), nullable=True),
    sa.Column('shipping_address', sa.Text(), nullable=True),
    sa.Column('billing_address', sa.Text(), nullable=True),
    sa.Column('payment_gateway_ref', sa.String(length=255), nullable=True),
    sa.Column('delivery_option_id', sa.String(length=36), nullable=True),
    sa.Column('delivery_fee', mysql.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('picked_up_by_name', sa.String(length=150), nullable=True),
    sa.Column('picked_up_by_id_no', sa.String(length=50), nullable=True),
    sa.Column('picked_up_at', sa.DateTime(), nullable=True),
    sa.Column('payment_transaction_id', sa.String(length=36), nullable=True),
    sa.ForeignKeyConstraint(['delivery_option_id'], ['delivery_options.id'], ),
    sa.ForeignKeyConstraint(['payment_transaction_id'], ['payment_transactions.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_orders_payment_transaction_id'), ['payment_transaction_id'], unique=False)

    op.create_table('order_items',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('order_id', sa.String(length=36), nullable=False),
    sa.Column('artwork_id', sa.String(length=36), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('price_at_purchase', mysql.DECIMAL(precision=10, scale=2), nullable=False),
    sa.ForeignKeyConstraint(['artwork_id'], ['artworks.id'], ),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('order_items')
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_orders_payment_transaction_id'))

    op.drop_table('orders')
    with op.batch_alter_table('payment_transactions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_payment_transactions_checkout_request_id'))

    op.drop_table('payment_transactions')
    op.drop_table('cart_items')
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_user_id'))

    op.drop_table('notifications')
    op.drop_table('carts')
    op.drop_table('artworks')
    op.drop_table('users')
    op.drop_table('delivery_options')
    op.drop_table('artists')
    # ### end Alembic commands ###
