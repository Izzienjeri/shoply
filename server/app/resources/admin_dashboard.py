from flask import Blueprint, jsonify, current_app, request
from flask_restful import Resource, Api, abort
from sqlalchemy import func, extract, and_
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from dateutil import parser
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
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')

            start_date, end_date = None, None
            if start_date_str:
                try:
                    start_date = parser.parse(start_date_str).date()
                except (ValueError, TypeError):
                    abort(400, message="Invalid start_date format. Use YYYY-MM-DD.")
            if end_date_str:
                try:
                    end_date = parser.parse(end_date_str).date() + timedelta(days=1)
                except (ValueError, TypeError):
                    abort(400, message="Invalid end_date format. Use YYYY-MM-DD.")
            
            if start_date and end_date and start_date >= end_date:
                 abort(400, message="start_date cannot be after or the same as end_date.")


            total_artworks = db.session.query(func.count(Artwork.id)).scalar()
            active_artworks = db.session.query(func.count(Artwork.id)).filter(Artwork.is_active == True).scalar()
            total_artists = db.session.query(func.count(Artist.id)).scalar()
            active_artists = db.session.query(func.count(Artist.id)).filter(Artist.is_active == True).scalar()
            pending_orders_count = db.session.query(func.count(Order.id)).filter(Order.status == 'pending').scalar()
            paid_orders_count = db.session.query(func.count(Order.id)).filter(Order.status == 'paid').scalar()

            revenue_query = db.session.query(func.sum(Order.total_price))\
                .filter(Order.status.in_(['paid', 'delivered', 'picked_up']))

            if start_date and end_date:
                revenue_query = revenue_query.filter(Order.created_at >= start_date, Order.created_at < end_date)
            else:
                current_month = datetime.utcnow().month
                current_year = datetime.utcnow().year
                revenue_query = revenue_query.filter(
                    extract('month', Order.created_at) == current_month,
                    extract('year', Order.created_at) == current_year
                )
            
            revenue_for_period = revenue_query.scalar() or Decimal('0.00')

            recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
            
            sales_trend_data = []
            if start_date and end_date:
                num_days = (end_date - start_date).days
                if num_days > 90:
                    sales_trend_query = db.session.query(
                        extract('year', Order.created_at).label('year'),
                        extract('month', Order.created_at).label('month'),
                        func.sum(Order.total_price).label('revenue')
                    ).filter(
                        Order.created_at >= start_date,
                        Order.created_at < end_date,
                        Order.status.in_(['paid', 'delivered', 'picked_up'])
                    ).group_by('year', 'month').order_by('year', 'month')
                    
                    for row in sales_trend_query.all():
                        sales_trend_data.append({
                            "month": datetime(int(row.year), int(row.month), 1).strftime("%b %Y"),
                            "revenue": float(row.revenue or 0)
                        })
                else:
                    sales_trend_query = db.session.query(
                        func.date(Order.created_at).label('day'),
                        func.sum(Order.total_price).label('revenue')
                    ).filter(
                        Order.created_at >= start_date,
                        Order.created_at < end_date,
                        Order.status.in_(['paid', 'delivered', 'picked_up'])
                    ).group_by('day').order_by('day')
                    for row in sales_trend_query.all():
                         sales_trend_data.append({
                            "month": row.day.strftime("%b %d"),
                            "revenue": float(row.revenue or 0)
                        })

            else:
                for i in range(5, -1, -1):
                    month_date = datetime.utcnow() - timedelta(days=i*30)
                    month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    
                    next_month_start = (month_start + timedelta(days=32)).replace(day=1)

                    monthly_revenue = db.session.query(func.sum(Order.total_price))\
                        .filter(
                            Order.created_at >= month_start,
                            Order.created_at < next_month_start,
                            Order.status.in_(['paid', 'delivered', 'picked_up'])
                        ).scalar() or Decimal('0.00')
                    sales_trend_data.append({
                        "month": month_start.strftime("%b %Y"),
                        "revenue": float(monthly_revenue)
                    })
            
            stats = {
                "total_artworks": total_artworks,
                "active_artworks": active_artworks,
                "total_artists": total_artists,
                "active_artists": active_artists,
                "pending_orders_count": pending_orders_count,
                "paid_orders_count": paid_orders_count,
                "revenue_this_month": str(revenue_for_period),
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