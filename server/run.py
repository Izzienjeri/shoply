import os
from app import create_app
from seed import run_seed

app = create_app()

@app.cli.command("seed")
def seed_db():
    """Populates the database with initial data."""
    run_seed()

if __name__ =='__main__':
    app.run(debug=True, host=os.getenv("host", "0.0.0.0"), port=os.getenv("port", 5000))