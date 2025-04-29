import os
from app import create_app

#creating flask app instance 
app = create_app()

if __name__ =='__main__':
    app.run(debug=True, host=os.getenv("host", "0.0.0.0"), port=os.getenv("port", 5000))