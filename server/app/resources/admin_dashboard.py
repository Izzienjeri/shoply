from flask import Blueprint, jsonify, current_app, request
from flask_restful import Resource, Api, abort
from sqlalchemy import func, extract
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta 
from decimal import Decimal

from .. import db, ma
from ..models import Artwork, Artist, Order, OrderItem, User, DeliveryOption
from ..schemas import orders_schema, order_schema
from ..decorators import admin_required
from marshmallow import fields, validate as marshmallow_validate, ValidationError

admin_dashboard_bp = Blueprint('admin_dashboard', __name__)
admin_dashboard_api = Api(admin_dashboard_bp)

class AdminDashboardStats(Resource):
    @admin_required
    def get(self):
        try:
            total_artworks = db.session.query(func.count(Artwork.id)).scalar()
            active_artworks = db.session.query(func.count(Artwork.id)).filter(Artwork.is_active == True).scalar()
            
            total_artists = db.session.query(func.count(Artist.id)).scalar()
            active_artists = db.session.query(func.count(Artist.id)).filter(Artist.is_active == True).scalar()

            pending_orders_count = db.session.query(func.count(Order.id)).filter(Order.status == 'pending').scalar()
            paid_orders_count = db.session.query(func.count(Order.id)).filter(Order.status == 'paid').scalar()

            current_month = datetime.utcnow().month
            current_year = datetime.utcnow().year
            
            revenue_this_month = db.session.query(func.sum(Order.total_price))\
                .filter(
                    extract('month', Order.created_at) == current_month,
                    extract('year', Order.created_at) == current_year,
                    Order.status.in_(['paid', 'delivered', 'picked_up'])
                ).scalar() or Decimal('0.00')

            recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
            
            sales_trend_data = []
            for i in range(5, -1, -1):
                month_date = datetime.utcnow() - timedelta(days=i*30)
                month_val = month_date.month
                year_val = month_date.year
                
                monthly_revenue = db.session.query(func.sum(Order.total_price))\
                    .filter(
                        extract('month', Order.created_at) == month_val,
                        extract('year', Order.created_at) == year_val,
                        Order.status.in_(['paid', 'delivered', 'picked_up'])
                    ).scalar() or Decimal('0.00')
                sales_trend_data.append({
                    "month": month_date.strftime("%b %Y"),
                    "revenue": float(monthly_revenue)
                })
            
            stats = {
                "total_artworks": total_artworks,
                "active_artworks": active_artworks,
                "total_artists": total_artists,
                "active_artists": active_artists,
                "pending_orders_count": pending_orders_count,
                "paid_orders_count": paid_orders_count,
                "revenue_this_month": str(revenue_this_month),
                "recent_orders": orders_schema.dump(recent_orders),
                "sales_trend": sales_trend_data
            }
            return jsonify(stats)

        except Exception as e:
            current_app.logger.error(f"Error fetching dashboard stats: {e}", exc_info=True)
            return {"message": "Error fetching dashboard statistics"}, 500

admin_dashboard_api.add_resource(AdminDashboardStats, '/stats')


class AdminOrderList(Resource):
    @admin_required
    def get(self):
        try:
            query = Order.query.options(
                joinedload(Order.user), 
                joinedload(Order.items).options(
                    joinedload(OrderItem.artwork).joinedload(Artwork.artist)
                ),
                joinedload(Order.delivery_option_details)
            ).order_by(Order.created_at.desc())
            
            status_filter = request.args.get('status')
            if status_filter:
                query = query.filter(Order.status == status_filter)

            all_orders = query.all()
            return orders_schema.dump(all_orders), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching all orders for admin: {e}", exc_info=True)
            abort(500, message="Error fetching orders")

admin_dashboard_api.add_resource(AdminOrderList, '/orders')

class AdminOrderUpdateSchema(ma.Schema):
    status = fields.Str(
        validate=marshmallow_validate.OneOf(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'picked_up']),
        required=False
    )
    picked_up_by_name = fields.Str(allow_none=True, required=False)
    picked_up_by_id_no = fields.Str(allow_none=True, required=False)

admin_order_update_schema = AdminOrderUpdateSchema()

class AdminOrderDetail(Resource):
    @admin_required
    def get(self, order_id):
        order = Order.query.options(
            joinedload(Order.user),
            joinedload(Order.items).options(
                joinedload(OrderItem.artwork).joinedload(Artwork.artist)
            ),
            joinedload(Order.delivery_option_details)
        ).get(order_id)
        if not order:
            abort(404, message=f"Order with ID {order_id} not found.")
        return order_schema.dump(order), 200

    @admin_required
    def patch(self, order_id):
        order = Order.query.get(order_id)
        if not order:
            abort(404, message=f"Order with ID {order_id} not found.")

        json_data = request.get_json()
        if not json_data:
            abort(400, message="No input data provided.")

        try:
            data = admin_order_update_schema.load(json_data, partial=True)
        except ValidationError as err:
            abort(400, errors=err.messages)
        
        updated_fields_count = 0
        if 'status' in data:
            new_status = data['status']
            if order.status != new_status:
                order.status = new_status
                if new_status == 'shipped' and not order.shipped_at:
                    order.shipped_at = datetime.utcnow()
                elif new_status == 'picked_up' and not order.picked_up_at:
                    order.picked_up_at = datetime.utcnow()
                updated_fields_count += 1
        
        if 'picked_up_by_name' in data:
            order.picked_up_by_name = data['picked_up_by_name']
            updated_fields_count += 1
        
        if 'picked_up_by_id_no' in data:
            order.picked_up_by_id_no = data['picked_up_by_id_no']
            updated_fields_count += 1

        if updated_fields_count > 0:
            try:
                db.session.commit()
                refreshed_order = Order.query.options(
                    joinedload(Order.user),
                    joinedload(Order.items).options(
                        joinedload(OrderItem.artwork).joinedload(Artwork.artist)
                    ),
                    joinedload(Order.delivery_option_details)
                ).get(order.id)
                return order_schema.dump(refreshed_order), 200
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Error updating order {order_id} by admin: {e}", exc_info=True)
                abort(500, message="An error occurred while updating the order.")
        else:
            return {"message": "No valid fields provided for update or no changes made."}, 200

admin_dashboard_api.add_resource(AdminOrderDetail, '/orders/<string:order_id>')
