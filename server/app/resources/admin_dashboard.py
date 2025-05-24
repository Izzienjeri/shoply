from flask import Blueprint, jsonify, current_app
from flask_restful import Resource, Api
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from decimal import Decimal

from .. import db
from ..models import Artwork, Artist, Order, OrderItem
from ..decorators import admin_required

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


            from ..schemas import orders_schema
            
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