## Initial installations

pipenv install flask flask-restful flask-sqlalchemy PyMySQL flask-jwt-extended python-dotenv Flask-Migrate flask-cors flask-bcrypt flask-marshmallow marshmallow-sqlalchemy



shoply_backend/
├── app/
│   ├── __init__.py       # Initialize Flask app, extensions
│   ├── models.py         # Database models (Users, Products, etc.)
│   ├── schemas.py        # Marshmallow schemas for serialization/validation
│   ├── resources/        # Flask-RESTful resources (API endpoints)
│   │   ├── __init__.py
│   │   ├── auth.py         # Authentication endpoints
│   │   ├── product.py      # Product endpoints
│   │   ├── cart.py         # Cart endpoints
│   │   ├── order.py        # Order endpoints
│   │   └── payment.py      # Payment webhook endpoint
│   └── config.py         # Configuration settings
├── migrations/         # Folder for Flask-Migrate
├── run.py              # Script to run the Flask development server
├── .env                # Environment variables (DB URI, secrets - DO NOT COMMIT)
├── .gitignore          # Files/folders to ignore in Git
└── Pipfile
└── Pipfile.lock



