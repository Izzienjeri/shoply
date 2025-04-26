# Mini E-Commerce Site Backend (Shoply - WIP)

This repository contains the backend server code for a mini e-commerce application, built using Flask.

As of the current version, the backend provides:

*   Basic Flask application structure.
*   Database models for Users, Products, Carts, Orders, and their respective items using Flask-SQLAlchemy.
*   Database migrations setup using Flask-Migrate and Alembic.
*   User Authentication API endpoints (signup, login, logout) using Flask-RESTful and Flask-JWT-Extended for token-based authentication.
*   Password hashing using Flask-Bcrypt.
*   Data serialization and validation using Flask-Marshmallow.
*   Configuration management using environment variables (`.env`).
*   CORS configuration for allowing frontend interaction.

## Technologies Used

*   **Framework:** Flask
*   **Database ORM:** Flask-SQLAlchemy
*   **Database Migrations:** Flask-Migrate, Alembic
*   **Authentication:** Flask-JWT-Extended
*   **Password Hashing:** Flask-Bcrypt
*   **API Development:** Flask-RESTful
*   **Serialization/Validation:** Flask-Marshmallow
*   **Dependency Management:** Pipenv
*   **Database:** MySQL (as indicated by `mysql+pymysql` dialect and schema types)
*   **Environment Variables:** python-dotenv
*   **CORS:** Flask-CORS

## Prerequisites

Before you begin, ensure you have the following installed:

*   Python (3.8+ recommended)
*   pip (Python package installer)
*   Pipenv (`pip install pipenv`)
*   Git
*   MySQL Server (or a compatible alternative like MariaDB)

## Getting Started

Follow these steps to set up and run the project locally:

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```
    *(Replace `<your-repository-url>` and `<repository-directory>` with your actual details)*

2.  **Install Dependencies using Pipenv:**
    *(This step assumes a `Pipfile` exists in the repository root. If not, you'll need to create it by running `pipenv install flask flask-sqlalchemy ...` for all required packages first).*

    Navigate to the project's root directory (the one containing the `Pipfile` and the `server` folder) and run:
    ```bash
    pipenv install --dev
    ```
    This command creates a virtual environment specific to this project (if it doesn't exist) and installs all dependencies listed in the `Pipfile` and `Pipfile.lock`.

3.  **Activate the Virtual Environment:**
    To run commands within the project's specific environment, activate the pipenv shell:
    ```bash
    pipenv shell
    ```
    You should now see the virtual environment's name prefixing your command prompt (e.g., `(repository-directory-XXXX) $`). All subsequent commands in these instructions should be run *inside* this shell.

4.  **Configure Environment Variables:**
    *   Navigate to the `server` directory:
        ```bash
        cd server
        ```
    *   Create a `.env` file in the `server` directory. You can copy `.env.example` if one exists, or create it manually. Add your specific configuration values:
        ```dotenv
        # .env file content
        SECRET_KEY='your_strong_flask_secret_key'
        JWT_SECRET_KEY='your_strong_jwt_secret_key'

        DATABASE_USER='your_mysql_username'
        DATABASE_PASSWORD='your_mysql_password'
        DATABASE_HOST='localhost' # or your db host
        DATABASE_PORT='3306'      # or your db port
        DATABASE_NAME='shoply_db' # choose a database name
        ```
    *   **Important:** Replace the placeholder values with your actual database credentials and secret keys.
    *   Navigate back to the project's root directory:
        ```bash
        cd ..
        ```

5.  **Set Up the Database:**
    *   Ensure your MySQL server is running.
    *   Connect to your MySQL server and create the database specified in your `.env` file:
        ```sql
        CREATE DATABASE shoply_db; -- Or the name you chose in .env
        ```
    *   (Ensure you are still in the `pipenv shell` activated in Step 3, and you are in the project root directory).
    *   Set the `FLASK_APP` environment variable so Flask knows where your application is:
        *   macOS/Linux: `export FLASK_APP=server/run.py`
        *   Windows CMD: `set FLASK_APP=server\run.py`
        *   Windows PowerShell: `$env:FLASK_APP="server\run.py"`
    *   Apply the database migrations:
        ```bash
        flask db upgrade
        ```
        This command uses the migration script (`./server/migrations/versions/7c51b222ed8a_...py`) to create the necessary tables (`users`, `products`, `carts`, `orders`, etc.) in your database based on the models defined in `./server/app/models.py`.

6.  **Run the Application:**
    *   (Ensure you are still in the `pipenv shell` and in the project root directory).
    *   Start the Flask development server:
        ```bash
        python server/run.py
        ```
    *   You should see output indicating the server is running, likely on `http://127.0.0.1:5000/`.
    *   The message `Shoply Backend is running!` should be visible if you navigate to the root URL (`/`) in your browser or using `curl`.

7.  **Exiting the Environment:**
    When you're done working, you can exit the pipenv shell:
    ```bash
    exit
    ```

## Project Structure (Server)
.
├── Pipfile # Pipenv dependency file
├── Pipfile.lock # Pipenv lock file for deterministic builds
├── server/
│ ├── app/ # Core application module
│ │ ├── init.py # Application factory, extension initialization
│ │ ├── config.py # Configuration settings
│ │ ├── models.py # SQLAlchemy database models
│ │ ├── schemas.py # Marshmallow serialization/validation schemas
│ │ └── resources/ # API resources (e.g., auth.py)
│ │ └── auth.py # Authentication endpoints (signup, login, logout)
│ ├── migrations/ # Database migration scripts (Alembic) 
│ │ ├── versions/ # Individual migration files
│ │ │ └── 7c51b222ed8a_...py # Initial schema migration
│ │ ├── env.py # Alembic environment configuration
│ │ └── ... # Other Alembic files
│ ├── run.py # Main entry point to run the Flask app
│ └── .env # Environment variables (MUST be created manually)
└── ... # Other project files (e.g., README.md)


## Available API Endpoints (Current)

All endpoints are prefixed with `/api`.

*   **Authentication:** (`/api/auth`)
    *   `POST /api/auth/signup`: Register a new user. Requires `email` and `password` (min 8 chars) in the JSON body. Optional: `name`, `address`.
    *   `POST /api/auth/login`: Log in a user. Requires `email` and `password` in the JSON body. Returns an `access_token`.
    *   `POST /api/auth/logout`: Log out the current user. Requires a valid `Authorization: Bearer <token>` header. Invalidates the current token.

*(Note: Endpoints for Products, Cart, and Orders are defined by models and schemas but corresponding API resources are not yet implemented in the provided code.)*