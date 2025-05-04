
#  Full Stack E-commerce Platform by izzie

Welcome to Artistry Haven! This is a full-stack web application designed as an online marketplace for unique artwork. Users can browse artwork, learn about artists, manage a shopping cart, and complete purchases using M-Pesa STK Push integration.

This README provides instructions for setting up and running the project locally, aimed especially at beginners.

**Note:** This project is under development. Some features might be incomplete or lack comprehensive testing and documentation.

## Features

*   **User Authentication:** Secure user registration and login using JWT (JSON Web Tokens).
*   **Artwork Browsing:** View a gallery of artworks with details, images, and pricing.
*   **Artist Information:** View artist profiles and their associated artworks.
*   **Shopping Cart:** Add/remove artworks, update quantities.
*   **M-Pesa Checkout:** Initiate secure payments via Safaricom's M-Pesa STK Push.
*   **Order Management:** (Basic) View past orders (after successful payment).
*   **RESTful API:** Backend built with Flask, providing data to the frontend.
*   **Modern Frontend:** Interactive user interface built with Next.js and Tailwind CSS.

## Tech Stack

*   **Backend:**
    *   Python 3.x
    *   Flask (Web Framework)
    *   Flask-SQLAlchemy (ORM)
    *   Flask-Migrate (Database Migrations)
    *   Flask-RESTful (API Building)
    *   Flask-JWT-Extended (Authentication)
    *   Flask-Bcrypt (Password Hashing)
    *   Flask-Marshmallow (Serialization/Validation)
    *   Flask-CORS (Cross-Origin Resource Sharing)
    *   `pipenv` (Dependency Management)
    *   MySQL (Database)
    *   Gunicorn (WSGI Server - for potential deployment)
    *   Daraja API Client (for M-Pesa)
*   **Frontend:**
    *   Node.js / npm / yarn
    *   Next.js (React Framework)
    *   TypeScript
    *   Tailwind CSS (Styling)
    *   shadcn/ui (UI Components)
    *   React Hook Form (Form Handling)
    *   Zod (Schema Validation)
    *   Axios/Fetch (API Client)
    *   Context API (State Management - Auth, Cart)
*   **Development Tools:**
    *   `ngrok` (For exposing local server during development, specifically for Daraja callbacks)
    *   Faker (For generating seed data)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Python:** Version 3.8 or higher.
2.  **`pipenv`:** Python dependency management tool. Install it via pip:
    ```bash
    pip install pipenv
    # or (if using user install)
    python -m pip install --user pipenv
    ```
3.  **Node.js:** Version 18 or higher (includes npm). (You can use `nvm` to manage Node versions).
4.  **MySQL Server:** A running MySQL database instance.
5.  **`ngrok`:** A tool to expose local servers to the internet. Download from [ngrok.com](https://ngrok.com/). You'll need a free account.
6.  **Daraja Developer Account:** Register at [Safaricom Developers Portal](https://developer.safaricom.co.ke/) to get API credentials (Consumer Key, Consumer Secret) for the Sandbox environment.

## Setup Instructions

Follow these steps to set up the project locally:

### 1. Clone the Repository

```bash
git clone git@github.com:Izzienjeri/shoply.git
cd shoply
```

### 2. Backend Setup (`server/` directory)

Navigate to the backend directory:

```bash
cd server
```

#### a. Install Dependencies using `pipenv`

`pipenv` manages dependencies and creates a virtual environment.

```bash
pipenv install --dev
```
*(This installs both regular and development dependencies specified in the `Pipfile`)*

#### b. Activate the Virtual Environment

To run backend commands, you need to be inside the virtual environment managed by `pipenv`.

```bash
pipenv shell
```
*(You should see your shell prompt change, indicating you're in the environment)*

#### c. Configure Environment Variables (`.env` file)

*   Create a `.env` file in the `server/` directory.
*   Copy the contents from a template file if available (e.g., `.env.example`), or add the following variables, replacing the placeholder values:

    ```ini
    # Flask Configuration
    SECRET_KEY='your_strong_random_secret_key' # Important for session security
    JWT_SECRET_KEY='your_strong_random_jwt_secret_key' # Important for JWT security

    # Database Configuration (Update with your MySQL details)
    DATABASE_USER='your_mysql_username'
    DATABASE_PASSWORD='your_mysql_password'
    DATABASE_HOST='localhost' # Or your DB host IP/domain
    DATABASE_PORT='3306' # Default MySQL port
    DATABASE_NAME='shoply_db' # Choose a name for your database

    # Daraja API Credentials (Get these from Safaricom Developer Portal)
    DARAJA_ENVIRONMENT='sandbox' # Use 'sandbox' for testing, 'production' for live
    DARAJA_CONSUMER_KEY='your_safaricom_consumer_key'
    DARAJA_CONSUMER_SECRET='your_safaricom_consumer_secret'
    DARAJA_SHORTCODE='your_business_shortcode' # e.g., 174379 for sandbox
    DARAJA_PASSKEY='your_lipa_na_mpesa_online_passkey' # From the portal
    DARAJA_TRANSACTION_TYPE='CustomerPayBillOnline' # Usually this for STK Push

    # Daraja Callback URL (IMPORTANT - see Ngrok section below)
    DARAJA_CALLBACK_URL_BASE='<your_ngrok_https_url>' # Example: https://abcdef123456.ngrok-free.app
    ```

#### d. Set up `ngrok` for Daraja Callbacks

The Daraja API needs a publicly accessible URL to send payment confirmation callbacks *to your local machine*. `ngrok` provides this.

1.  **Start ngrok:** Open a *new separate terminal* (do not close your `pipenv shell` terminal) and run:
    ```bash
    ngrok http 5000
    ```
    *(This exposes your local port 5000, where the Flask app runs by default)*
2.  **Copy the HTTPS URL:** `ngrok` will display forwarding URLs. Copy the `https://` URL (e.g., `https://random-string.ngrok-free.app`).
3.  **Update `.env`:** Paste the copied `ngrok` HTTPS URL into the `DARAJA_CALLBACK_URL_BASE` variable in your `server/.env` file.
4.  **Keep ngrok running:** Leave this `ngrok` terminal window open while you are developing and testing payments.

#### e. Database Setup

1.  **Create the Database:** Manually create the database specified in your `.env` file (`DATABASE_NAME`) using a MySQL client (like MySQL Workbench, DBeaver, or the command line).
    ```sql
    -- Example SQL command:
    CREATE DATABASE artistry_haven_db;
    ```
2.  **Apply Migrations:** Run the database migrations to create the tables. Make sure you are in the `pipenv shell` (`cd server` then `pipenv shell`).
    ```bash
    flask db upgrade
    ```

#### f. Seed the Database (Optional but Recommended)

Populate the database with initial sample data (artists, artworks, users). Ensure the image files mentioned in `seed.py` exist in the `server/media/artwork_images/` folder.

```bash
flask seed
```
*Note: The default password for seeded users is `pass123`.*

### 3. Frontend Setup (`main/` directory)

Navigate to the frontend directory in a *new terminal* (or exit the `pipenv shell` in the backend terminal first using `exit`):

```bash
cd ../main # Assuming you are in server/, otherwise navigate to the 'main' directory
```

#### a. Install Dependencies

```bash
npm install
# OR if you prefer yarn
# yarn install
```

#### b. Configure Environment Variables (`.env.local` file)

*   Create a `.env.local` file in the `main/` directory.
*   Add the following variable, pointing to your running backend API:

    ```ini
    NEXT_PUBLIC_API_URL=http://localhost:5000/api
    ```
    *(Ensure the port matches where your Flask backend is running)*

## Running the Application

You need to run both the backend and frontend servers simultaneously.

1.  **Start the Backend Server:**
    *   Open a terminal.
    *   Navigate to the `server/` directory (`cd path/to/your/project/server`).
    *   Activate the virtual environment: `pipenv shell`.
    *   Start the Flask development server:
        ```bash
        flask run
        ```
    *   The backend should now be running, typically at `http://localhost:5000`.

2.  **Start the Frontend Server:**
    *   Open a *separate* terminal.
    *   Navigate to the `main/` directory (`cd path/to/your/project/main`).
    *   Start the Next.js development server:
        ```bash
        npm run dev
        # OR if using yarn
        # yarn dev
        ```
    *   The frontend should now be running, typically at `http://localhost:3000`.

3.  **Access the Application:** Open your web browser and navigate to `http://localhost:3000`.

4.  **Remember:** Keep the `ngrok` tunnel running in its terminal if you plan to test M-Pesa payments.

## Key Concepts for Beginners

*   **`pipenv`:** This tool helps manage the specific Python libraries (dependencies) your backend needs. It creates an isolated environment (`virtualenv`) so project dependencies don't clash with other Python projects on your system.
    *   `pipenv install`: Installs dependencies listed in the `Pipfile`.
    *   `pipenv shell`: Activates the isolated environment for the project. You run `flask` commands inside this shell.
    *   `Pipfile` & `Pipfile.lock`: Files that define and lock down your project's dependencies.
*   **`.env` Files:** These files store configuration secrets (like API keys, database passwords) outside of your code. This is crucial for security – **never commit `.env` files to Git**.
*   **`ngrok`:** When testing features like webhooks or callbacks (like the one from Daraja), the external service needs to send a message *back* to your local computer. Since your computer isn't usually directly accessible from the internet, `ngrok` creates a secure tunnel, giving you a temporary public URL that forwards traffic to your local development server.
*   **Flask Migrations (`flask db upgrade`):** SQLAlchemy (the ORM) defines your database tables in Python code (models). Migrations are scripts (managed by Flask-Migrate/Alembic) that apply changes from your models to the actual database schema. `flask db upgrade` runs these scripts to keep your database structure in sync with your code.
*   **Seeding (`flask seed`):** This process populates your database with initial dummy data, making it easier to test the application without manually creating users, products, etc.

## API Endpoints Overview

The backend provides the following main API endpoint groups under the `/api` prefix (e.g., `http://localhost:5000/api/...`):

*   `/auth`: User registration (`signup`), login (`login`), logout (`logout`).
*   `/artists`: List and get details for artists.
*   `/artworks`: List, get details, create, update, delete artworks.
*   `/cart`: Get cart contents, add items, update item quantity, remove items.
*   `/orders`: List user's orders, initiate checkout (POST).
*   `/payments`: Handles the Daraja callback (`/callback`).

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues. (Add more specific contribution guidelines if desired).



Good luck, and happy coding! Feel free to open an issue if you encounter problems during setup.
