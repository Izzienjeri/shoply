# Mini E-Commerce Site Backend (Shoply - Day 2 Update)

This repository contains the backend server code for a mini e-commerce application, built using Flask. We are building this step-by-step.

## Day 2 Update

Today, we focused on bringing the core e-commerce functionality to life by implementing:

1.  **Product API Endpoints:** Added full CRUD (Create, Read, Update, Delete) operations for products under `/api/products`. This allows listing all products, viewing details of a single product, adding new products (individually or in bulk), updating existing ones, and deleting them.
2.  **Shopping Cart API Endpoints:** Implemented endpoints under `/api/cart` for users to manage their shopping carts. This includes viewing the cart, adding products, updating the quantity of items already in the cart, and removing items. These endpoints are protected and require user authentication (JWT).
3.  **Database Schema Finalized (Initial):** The database migration (`1ae97819e612_done.py`) now reflects the complete initial schema including `users`, `products`, `carts`, `cart_items`, `orders`, and `order_items` tables with their relationships.
4.  **Enhanced Schemas:** Updated Marshmallow schemas (`app/schemas.py`) to handle validation and serialization for Products and Cart Items, including nested display of product details within the cart.
5.  **Refined Models:** Updated SQLAlchemy models (`app/models.py`) with relationships and helper methods (like password handling).

---

## Current Features (As of Day 2 End)

*   Basic Flask application structure.
*   Database models for Users, Products, Carts, Orders, and their respective items using Flask-SQLAlchemy.
*   Database migrations setup using Flask-Migrate and Alembic (Initial schema fully migrated).
*   User Authentication API endpoints (signup, login, logout) using Flask-RESTful and Flask-JWT-Extended for token-based authentication.
*   **Product Management API endpoints** (List, Create, View, Update, Delete).
*   **Shopping Cart API endpoints** (View, Add Item, Update Item Quantity, Remove Item - requires authentication).
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
    git clone https://github.com/Izzienjeri/shoply 
    cd shoply
    ```

2.  **Install Dependencies using Pipenv:**
    *(This step assumes a `Pipfile` exists in the repository root. If not, you'll need to create it by running `pipenv install flask flask-restful flask-sqlalchemy pymysql flask-jwt-extended python-dotenv flask-migrate flask-cors flask-bcrypt flask-marshmallow marshmallow-sqlalchemy cryptography` for all required packages first).*

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
        This command uses the migration scripts (like `server/migrations/versions/1ae97819e612_done.py`) to create or update the necessary tables (`users`, `products`, `carts`, `orders`, etc.) in your database based on the models defined in `server/app/models.py`.

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

## Available API Endpoints (As of Day 2)

All endpoints are prefixed with `/api`.

*   **Authentication:** (`/api/auth`)
    *   `POST /signup`: Register a new user. Requires `email` and `password` (min 8 chars) in the JSON body. Optional: `name`, `address`.
    *   `POST /login`: Log in a user. Requires `email` and `password` in the JSON body. Returns an `access_token`.
    *   `POST /logout`: Log out the current user. Requires a valid `Authorization: Bearer <token>` header. Invalidates the current token.

*   **Products:** (`/api/products`) - *Currently Public*
    *   `GET /`: List all products.
    *   `POST /`: Create a new product (expects a single JSON product object) or multiple products (expects a JSON array of product objects). Requires `name`, `price`, `stock_quantity`. Optional: `description`, `image_url`.
    *   `GET /<string:product_id>`: Get details of a specific product by its UUID.
    *   `PATCH /<string:product_id>`: Partially update a specific product. Send only the fields to update in the JSON body.
    *   `DELETE /<string:product_id>`: Delete a specific product.

*   **Cart:** (`/api/cart`) - *Requires Authentication* (`Authorization: Bearer <token>` header)
    *   `GET /`: Get the current user's cart contents.
    *   `POST /`: Add a product to the cart or update quantity if it already exists. Requires `product_id` and `quantity` (positive integer) in the JSON body. Checks against product stock.
    *   `PUT /items/<string:item_id>`: Update the quantity of a specific item *already in the cart*. Requires `quantity` (positive integer) in the JSON body. Checks against product stock. `item_id` refers to the `CartItem` UUID.
    *   `DELETE /items/<string:item_id>`: Remove a specific item from the cart. `item_id` refers to the `CartItem` UUID.

*(Note: Order-related API endpoints are defined by models and schemas but corresponding API resources `/api/orders` are planned for a future step.)*