import os
import random
from decimal import Decimal
from faker import Faker
from app import create_app, db
from app.models import User, Artist, Artwork, Cart, CartItem, Order, OrderItem

NUM_ARTISTS = 10
NUM_USERS = 5
ARTWORK_IMAGE_FOLDER_RELATIVE = 'artwork_images'
IMAGES_BASE_NAME = 'art'
NUM_IMAGES = 48
DEFAULT_PASSWORD = "pass123"

try:
    fake = Faker()
except ImportError:
    print("Faker not installed. Using basic placeholder data. (pip install Faker)")
    fake = None

def get_image_path(image_index):
    """Constructs the relative path for the image URL field."""
    return f"{ARTWORK_IMAGE_FOLDER_RELATIVE}/{IMAGES_BASE_NAME}{image_index}.jpg"

def clear_data():
    """Clears existing data from tables in reverse dependency order."""
    print("Clearing existing data...")
    db.session.query(OrderItem).delete()
    db.session.query(CartItem).delete()
    db.session.query(Order).delete()
    db.session.query(Cart).delete()
    db.session.query(Artwork).delete()
    db.session.query(User).delete()
    db.session.query(Artist).delete()
    db.session.commit()
    print("Data cleared.")

def seed_artists(num_artists):
    """Seeds the database with Artist data."""
    print(f"Seeding {num_artists} artists...")
    artists = []
    for i in range(num_artists):
        artist_name = fake.name() if fake else f"Artist {i+1}"
        artist_bio = fake.paragraph(nb_sentences=3) if fake else f"This is the biography for {artist_name}."
        artist = Artist(name=artist_name, bio=artist_bio)
        artists.append(artist)
    db.session.add_all(artists)
    db.session.commit()
    print("Artists seeded.")
    return artists

def seed_artworks(artists, num_images_available, media_folder_base):
    """Seeds the database with Artwork data, linking to artists and images."""
    if not artists:
        print("No artists available to assign artworks to. Skipping artwork seeding.")
        return

    print(f"Seeding artworks (up to {num_images_available} based on image files)...")
    artworks = []
    image_folder_full_path = os.path.join(media_folder_base, ARTWORK_IMAGE_FOLDER_RELATIVE)
    print(f"Checking for images in: {image_folder_full_path}")

    for i in range(1, num_images_available + 1):
        image_filename = f"{IMAGES_BASE_NAME}{i}.jpg"
        image_full_path = os.path.join(image_folder_full_path, image_filename)
        relative_image_url = get_image_path(i)

        if not os.path.exists(image_full_path):
            print(f"Warning: Image file not found: {image_full_path}. Skipping artwork {i}.")
            continue

        artwork_name = fake.catch_phrase() if fake else f"Artwork {i}: {random.choice(['Sunrise', 'Portrait', 'Abstract', 'Landscape'])}"
        description = fake.text(max_nb_chars=200) if fake else f"A beautiful piece numbered {i}."
        price = Decimal(random.uniform(50.0, 1500.0)).quantize(Decimal("0.01"))
        stock_quantity = random.randint(0, 10)
        assigned_artist = random.choice(artists)

        artwork = Artwork(
            name=artwork_name,
            description=description,
            price=price,
            stock_quantity=stock_quantity,
            artist_id=assigned_artist.id,
            image_url=relative_image_url
        )
        artworks.append(artwork)

    if artworks:
        db.session.add_all(artworks)
        db.session.commit()
        print(f"{len(artworks)} artworks seeded.")
    else:
        print("No artworks were seeded (possibly due to missing images or artists).")

def seed_users(num_users):
    """Seeds the database with User data."""
    print(f"Seeding {num_users} users...")
    users = []
    for i in range(num_users):
        user_email = fake.email() if fake else f"user{i+1}@example.com"
        user_name = fake.name() if fake else f"Test User {i+1}"
        user_address = fake.address() if fake else f"{i+1} Seed St, Testville"

        if User.query.filter_by(email=user_email).first():
            print(f"User with email {user_email} already exists, skipping.")
            continue

        user = User(
            email=user_email,
            name=user_name,
            address=user_address
        )

        user.set_password(DEFAULT_PASSWORD)
        users.append(user)
        print(f"Created user: {user_email}")


    if users:
        db.session.add_all(users)
        db.session.commit()
        print(f"{len(users)} users seeded (default password: '{DEFAULT_PASSWORD}').")
    else:
        print("No new users were seeded.")
        
    return users

def run_seed():
    """Main function to run the seeding process."""
    app = create_app()
    with app.app_context():
        media_folder = app.config.get('MEDIA_FOLDER')
        if not media_folder or not os.path.isdir(media_folder):
             print(f"ERROR: MEDIA_FOLDER ('{media_folder}') is not configured correctly or does not exist.")
             print("Ensure MEDIA_FOLDER is set in your Flask app config and the directory exists.")
             return

        clear_data()
        created_artists = seed_artists(NUM_ARTISTS)
        seed_artworks(created_artists, NUM_IMAGES, media_folder)
        seed_users(NUM_USERS)
        print("-" * 20)
        print("Seeding process completed!")
        print("-" * 20)

