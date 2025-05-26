from flask_socketio import emit, join_room, leave_room, disconnect, ConnectionRefusedError
from flask_jwt_extended import decode_token
from flask import request, current_app

from . import socketio
from .models import User

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


def notify_new_order_to_admins(order_data_dict):
    """Notifies admins about a new order."""
    current_app.logger.info(f"Emitting 'new_order_admin' to admin_room. Order ID: {order_data_dict.get('id')}")
    socketio.emit('new_order_admin', order_data_dict, room='admin_room')

def notify_order_status_update(order_data_dict):
    """Notifies relevant user and admins about an order status update."""
    user_id = order_data_dict.get('user_id')
    order_id = order_data_dict.get('id')
    current_app.logger.info(f"Emitting 'order_update_user' for Order ID: {order_id} to room user_{user_id}")
    socketio.emit('order_update_user', order_data_dict, room=f'user_{user_id}')
    
    current_app.logger.info(f"Emitting 'order_update_admin' for Order ID: {order_id} to admin_room")
    socketio.emit('order_update_admin', order_data_dict, room='admin_room')

def notify_artwork_update_globally(artwork_data_dict):
    """Notifies all clients about an artwork update (e.g., stock, price, active status, deletion)."""
    artwork_id = artwork_data_dict.get('id')
    current_app.logger.info(f"Emitting 'artwork_update_global' for Artwork ID: {artwork_id} (broadcast)")
    socketio.emit('artwork_update_global', artwork_data_dict, broadcast=True)

def notify_artist_update_globally(artist_data_dict):
    """Notifies all clients about an artist update (create, update, delete)."""
    artist_id = artist_data_dict.get('id')
    current_app.logger.info(f"Emitting 'artist_update_global' for Artist ID: {artist_id} (broadcast)")
    socketio.emit('artist_update_global', artist_data_dict, broadcast=True)

def notify_delivery_option_update_globally(delivery_option_data_dict):
    """Notifies all clients about a delivery option update (create, update, delete)."""
    option_id = delivery_option_data_dict.get('id')
    current_app.logger.info(f"Emitting 'delivery_option_update_global' for Option ID: {option_id} (broadcast)")
    socketio.emit('delivery_option_update_global', delivery_option_data_dict, broadcast=True)