from app import create_app, socketio
from seed import run_seed

app = create_app()

@app.cli.command("seed")
def seed_db():
    """Populates the database with initial data."""
    run_seed()

if __name__ =='__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)