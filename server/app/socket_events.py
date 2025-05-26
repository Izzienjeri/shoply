from flask_socketio import emit, join_room, leave_room, disconnect, ConnectionRefusedError
from flask_jwt_extended import decode_token
from flask import request, current_app

from . import socketio, db
from .models import User, Notification

def _get_user_identity_from_token(token_string):
    if not token_string:
        return None
    try:
        if token_string.startswith("Bearer "):
            token_string = token_string.split(" ", 1)[1]
        
        decoded_token = decode_token(token_string)
        identity = decoded_token.get(current_app.config.get('JWT_IDENTITY_CLAIM', 'sub'))
        return identity
    except Exception as e:
        current_app.logger.warning(f"Token validation failed for Socket.IO: {e}")
        return None

@socketio.on('connect')
def handle_connect():
    current_app.logger.info(f"Client connection attempt: SID {request.sid}")
    token = request.args.get('token')
    
    user_id = _get_user_identity_from_token(token)

    if not user_id:
        current_app.logger.warning(f"Client {request.sid} connection refused: No valid token provided.")
        return False

    user = User.query.get(user_id)
    if not user:
        current_app.logger.warning(f"Client {request.sid} connection refused: User {user_id} not found.")
        return False


    current_app.logger.info(f"Client {user.email} (SID: {request.sid}) connected and authenticated.")

    user_room_id = f'user_{user.id}'
    join_room(user_room_id)
    current_app.logger.info(f"User {user.email} (SID: {request.sid}) auto-joined room {user_room_id}")

    if user.is_admin:
        join_room('admin_room')
        current_app.logger.info(f"Admin {user.email} (SID: {request.sid}) auto-joined admin_room")
    
    emit('connection_ack', {'message': 'Successfully connected and authenticated.'})


@socketio.on('disconnect')
def handle_disconnect():
    current_app.logger.info(f"Client disconnected: SID {request.sid}")


def _create_and_emit_notification(
    message: str, 
    type: str, 
    user_id_target: str = None, 
    link: str = None, 
    for_admin_audience: bool = False,
    socket_emit: bool = True
):
    try:
        new_notification = Notification(
            user_id=user_id_target,
            message=message,
            type=type,
            link=link,
            for_admin_audience=for_admin_audience
        )
        db.session.add(new_notification)
        db.session.commit()
        current_app.logger.info(f"Notification created: ID {new_notification.id}, Type: {type}, User: {user_id_target or 'Admin Broadcast'}, ForAdmin: {for_admin_audience}")

        if socket_emit:
            notification_payload = {
                'id': new_notification.id, 
                'message': new_notification.message, 
                'type': new_notification.type,
                'link': new_notification.link,
                'created_at': new_notification.created_at.isoformat() + 'Z',
                'for_admin_audience': new_notification.for_admin_audience,
                'user_id': new_notification.user_id,
                'read_at': None
            }

            if new_notification.for_admin_audience:
                socketio.emit('new_notification_available', notification_payload, room='admin_room')
                current_app.logger.info(f"Emitted 'new_notification_available' to admin_room for Notif ID {new_notification.id}")

            if new_notification.user_id:
                target_user_for_notif = User.query.get(new_notification.user_id)
                if target_user_for_notif:
                    if not new_notification.for_admin_audience or (new_notification.for_admin_audience and not target_user_for_notif.is_admin):
                        socketio.emit('new_notification_available', notification_payload, room=f'user_{new_notification.user_id}')
                        current_app.logger.info(f"Emitted 'new_notification_available' to user_room user_{new_notification.user_id} for Notif ID {new_notification.id}")
                else:
                    current_app.logger.warning(f"Notification {new_notification.id} has user_id {new_notification.user_id} but user not found.")
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to create or emit notification: {e}", exc_info=True)


def notify_new_order_to_admins(order_data_dict):
    """Notifies admins about a new order."""
    socketio.emit('new_order_admin', order_data_dict, room='admin_room')
    current_app.logger.info(f"Original 'new_order_admin' socket emitted. Order ID: {order_data_dict.get('id')}")

    _create_and_emit_notification(
        message=f"New Order #{order_data_dict.get('id', '')[:8]} placed by {order_data_dict.get('user', {}).get('email', 'N/A')}.",
        type='new_order',
        link=f'/admin/orders?view={order_data_dict.get("id")}',
        for_admin_audience=True
    )

def notify_order_status_update(order_data_dict):
    """Notifies relevant user and admins about an order status update."""
    user_id = order_data_dict.get('user_id')
    order_id_short = order_data_dict.get('id', '')[:8]
    status = order_data_dict.get('status', 'updated').replace('_', ' ')
    
    socketio.emit('order_update_user', order_data_dict, room=f'user_{user_id}')
    socketio.emit('order_update_admin', order_data_dict, room='admin_room')
    current_app.logger.info(f"Original 'order_update_user/admin' sockets emitted for Order ID: {order_id_short}")
    
    _create_and_emit_notification(
        message=f"Your order #{order_id_short} status is now: {status}.",
        type='order_update',
        user_id_target=user_id,
        link=f'/orders/{order_data_dict.get("id")}',
        for_admin_audience=False
    )
    _create_and_emit_notification(
        message=f"Order #{order_id_short} (User: {order_data_dict.get('user', {}).get('email', 'N/A')}) status changed to: {status}.",
        type='order_update',
        user_id_target=user_id,
        link=f'/admin/orders?view={order_data_dict.get("id")}',
        for_admin_audience=True
    )

def notify_artwork_update_globally(artwork_data_dict):
    artwork_id = artwork_data_dict.get('id', 'Unknown ID')
    artwork_name = artwork_data_dict.get('name', 'Unknown Artwork')
    is_deleted = artwork_data_dict.get('is_deleted', False)
    
    socketio.emit('artwork_update_global', artwork_data_dict, broadcast=True)
    current_app.logger.info(f"Original 'artwork_update_global' socket emitted for Artwork ID: {artwork_id}")

    message = f"Artwork '{artwork_name}' has been deleted." if is_deleted \
              else f"Artwork '{artwork_name}' has been updated."
    
    _create_and_emit_notification(
        message=message,
        type='artwork_update',
        link=f'/admin/artworks?edit={artwork_id}' if not is_deleted else '/admin/artworks',
        for_admin_audience=True
    )

def notify_artist_update_globally(artist_data_dict):
    artist_id = artist_data_dict.get('id', 'Unknown ID')
    artist_name = artist_data_dict.get('name', 'Unknown Artist')
    is_deleted = artist_data_dict.get('is_deleted', False)

    socketio.emit('artist_update_global', artist_data_dict, broadcast=True)
    current_app.logger.info(f"Original 'artist_update_global' socket emitted for Artist ID: {artist_id}")

    message = f"Artist '{artist_name}' has been deleted." if is_deleted \
              else f"Artist '{artist_name}' has been updated."
    
    _create_and_emit_notification(
        message=message,
        type='artist_update',
        link=f'/admin/artists/{artist_id}' if not is_deleted else '/admin/artists',
        for_admin_audience=True
    )

def notify_delivery_option_update_globally(delivery_option_data_dict):
    option_name = delivery_option_data_dict.get('name', 'Unknown Option')
    is_deleted = delivery_option_data_dict.get('is_deleted', False)

    socketio.emit('delivery_option_update_global', delivery_option_data_dict, broadcast=True)
    current_app.logger.info(f"Original 'delivery_option_update_global' socket emitted for Option: {option_name}")

    message = f"Delivery Option '{option_name}' has been deleted." if is_deleted \
              else f"Delivery Option '{option_name}' has been updated."
    _create_and_emit_notification(
        message=message,
        type='delivery_option_update',
        link='/admin/delivery-options',
        for_admin_audience=True
    )