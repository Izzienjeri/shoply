from flask import request, Blueprint, current_app
from flask_restful import Resource, Api, abort
from sqlalchemy import desc, or_, and_
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from .. import db
from ..models import Notification, User
from ..schemas import notification_schema, notifications_schema

notification_bp = Blueprint('notifications', __name__)
notification_api = Api(notification_bp)

class NotificationListResource(Resource):
    @jwt_required()
    def get(self):
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        if not current_user:
            current_app.logger.warning(f"NotificationList GET: User ID {user_id} not found in token context.")
            abort(401, message="User not found.")

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        unread_only_str = request.args.get('unread_only', 'false')
        unread_only = unread_only_str.lower() == 'true'


        query = Notification.query

        if current_user.is_admin:
            admin_audience_filter = Notification.for_admin_audience == True
            own_notifications_filter = and_(Notification.user_id == user_id, Notification.for_admin_audience == False)
            query = query.filter(or_(admin_audience_filter, own_notifications_filter))
            current_app.logger.debug(f"Admin {user_id} fetching notifications. Unread only: {unread_only}. Page: {page}")
        else:
            query = query.filter(Notification.user_id == user_id, Notification.for_admin_audience == False)
            current_app.logger.debug(f"User {user_id} fetching notifications. Unread only: {unread_only}. Page: {page}")
        
        if unread_only:
            query = query.filter(Notification.read_at.is_(None))

        query = query.order_by(desc(Notification.created_at))
        
        paginated_notifications = query.paginate(page=page, per_page=per_page, error_out=False)
        
        results = notifications_schema.dump(paginated_notifications.items)
        
        base_unread_query = Notification.query.filter(Notification.read_at.is_(None))
        if current_user.is_admin:
            admin_audience_filter_uc = Notification.for_admin_audience == True
            own_notifications_filter_uc = and_(Notification.user_id == user_id, Notification.for_admin_audience == False)
            base_unread_query = base_unread_query.filter(or_(admin_audience_filter_uc, own_notifications_filter_uc))
        else:
            base_unread_query = base_unread_query.filter(Notification.user_id == user_id, Notification.for_admin_audience == False)
        
        total_unread_for_user_or_admin = base_unread_query.count()
        
        return {
            "notifications": results,
            "total": paginated_notifications.total,
            "pages": paginated_notifications.pages,
            "current_page": paginated_notifications.page,
            "per_page": paginated_notifications.per_page,
            "has_next": paginated_notifications.has_next,
            "has_prev": paginated_notifications.has_prev,
            "unread_count": total_unread_for_user_or_admin
        }, 200

class NotificationMarkReadResource(Resource):
    @jwt_required()
    def post(self, notification_id):
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        if not current_user:
            current_app.logger.warning(f"MarkRead: User ID {user_id} not found for notification {notification_id}.")
            abort(401, message="User not found.")

        notification = Notification.query.get(notification_id)
        if not notification:
            abort(404, message="Notification not found.")

        can_mark_read = False
        if notification.user_id == user_id and not notification.for_admin_audience:
            can_mark_read = True
        elif current_user.is_admin and notification.for_admin_audience:
            can_mark_read = True
        elif current_user.is_admin and notification.user_id == user_id :
             can_mark_read = True

        if not can_mark_read:
            current_app.logger.warning(f"User {user_id} (admin: {current_user.is_admin}) tried to mark notification {notification_id} (user_id: {notification.user_id}, for_admin: {notification.for_admin_audience}) as read - FORBIDDEN.")
            abort(403, message="You are not authorized to mark this notification as read.")

        if notification.read_at is None:
            notification.read_at = datetime.utcnow()
            try:
                db.session.commit()
                current_app.logger.info(f"Notification {notification_id} marked as read by user {user_id}.")
                return notification_schema.dump(notification), 200
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Error marking notification {notification_id} as read: {e}", exc_info=True)
                abort(500, message="Could not mark notification as read.")
        return notification_schema.dump(notification), 200

class NotificationMarkAllReadResource(Resource):
    @jwt_required()
    def post(self):
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        if not current_user:
            current_app.logger.warning(f"MarkAllRead: User ID {user_id} not found.")
            abort(401, message="User not found.")

        query = Notification.query.filter(Notification.read_at.is_(None))

        if current_user.is_admin:
            admin_audience_filter = Notification.for_admin_audience == True
            own_notifications_filter = and_(Notification.user_id == user_id, Notification.for_admin_audience == False)
            query = query.filter(or_(admin_audience_filter, own_notifications_filter))
        else:
            query = query.filter(Notification.user_id == user_id, Notification.for_admin_audience == False)
        
        notifications_to_mark = query.all()
        
        if not notifications_to_mark:
            return {"message": "No unread notifications to mark.", "unread_count": 0}, 200

        updated_count = 0
        for notification in notifications_to_mark:
            notification.read_at = datetime.utcnow()
            updated_count += 1
        
        try:
            db.session.commit()
            current_app.logger.info(f"{updated_count} notifications marked as read for user {user_id}.")
            final_unread_query = Notification.query.filter(Notification.read_at.is_(None))
            if current_user.is_admin:
                 final_unread_query = final_unread_query.filter(or_(
                     Notification.for_admin_audience == True, 
                     and_(Notification.user_id == user_id, Notification.for_admin_audience == False)
                 ))
            else:
                 final_unread_query = final_unread_query.filter(
                     Notification.user_id == user_id, 
                     Notification.for_admin_audience == False
                 )
            final_unread_count = final_unread_query.count()

            return {"message": f"Marked {updated_count} notifications as read.", "unread_count": final_unread_count}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error marking all notifications as read for user {user_id}: {e}", exc_info=True)
            abort(500, message="Could not mark all notifications as read.")

notification_api.add_resource(NotificationListResource, '/')
notification_api.add_resource(NotificationMarkReadResource, '/<string:notification_id>/read')
notification_api.add_resource(NotificationMarkAllReadResource, '/read-all')