# === ./app/decorators.py ===
from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify, current_app

from .models import User

def admin_required(fn):
    """
    A decorator to protect routes that require admin privileges.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                current_app.logger.warning(f"Admin access denied: User ID {user_id} not found in database.")
                return jsonify(msg="Admin access denied. User not found."), 403
            
            if not user.is_admin:
                current_app.logger.warning(f"Admin access denied: User {user.email} (ID: {user_id}) is not an admin.")
                return jsonify(msg="Administrator access required."), 403
            
            return fn(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"Error in admin_required decorator: {e}", exc_info=True)
            return jsonify(msg="An error occurred while verifying admin privileges."), 500
    return wrapper