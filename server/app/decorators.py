from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask_jwt_extended.exceptions import JWTExtendedException
from flask import current_app
from flask_restful import abort

from .models import User

def admin_required(fn):
    """
    A decorator to protect routes that require admin privileges.
    Uses flask_restful.abort for proper error handling with Flask-RESTful.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except JWTExtendedException as e:
            current_app.logger.warning(f"JWT verification failed in admin_required: {e}")
            abort(401, message=getattr(e, 'description', str(e)) or "Unauthorized: JWT verification failed.")
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            current_app.logger.warning(f"Admin access denied: User ID {user_id} not found in database.")
            abort(403, message="Admin access denied. User not found.")
        
        if not user.is_admin:
            current_app.logger.warning(f"Admin access denied: User {user.email} (ID: {user_id}) is not an admin.")
            abort(403, message="Administrator access required.")
        
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            if hasattr(e, 'data') and 'message' in e.data and hasattr(e, 'code') and e.code >= 400:
                current_app.logger.warning(f"Route function {fn.__name__} aborted with status {e.code}: {e.data['message']}")
                raise
            
            current_app.logger.error(f"Error in protected route {fn.__name__}: {e}", exc_info=True)
            abort(500, message="An internal server error occurred in the requested operation.")
            
    return wrapper