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

KENYAN_NAMES = [
    "Wanjiku", "Omondi", "Achieng", "Kamau", "Otieno", "Njeri", "Mwangi", "Kiplagat", "Cherono", "Nyambura"
]

KENYAN_LOCATIONS = [
    "Westlands, Nairobi", "Kisumu CBD", "Mombasa Island", "Eldoret Town", "Thika Road, Nairobi",
    "Nyali, Mombasa", "Kasarani, Nairobi", "Lang'ata, Nairobi", "Kakamega", "Machakos Town",
    "Kikuyu, Kiambu", "Ngong Road, Nairobi", "Rongai", "Meru Town", "Kitale"
]

def get_image_path(image_index):
    return f"{ARTWORK_IMAGE_FOLDER_RELATIVE}/{IMAGES_BASE_NAME}{image_index}.jpg"

def clear_data():
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
    print(f"Seeding {num_artists} artists...")
    artists = []
    for i in range(num_artists):
        first_name = fake.first_name() if fake else f"John"
        kenyan_last_name = random.choice(KENYAN_NAMES)
        artist_name = f"{first_name} {kenyan_last_name}"
        artist_bio = fake.paragraph(nb_sentences=3) if fake else f"This is the biography for {artist_name}."
        artist = Artist(name=artist_name, bio=artist_bio)
        artists.append(artist)
    db.session.add_all(artists)
    db.session.commit()
    print("Artists seeded.")
    return artists

def seed_artworks(artists, num_images_available, media_folder_base):
    if not artists:
        print("No artists available to assign artworks to. Skipping artwork seeding.")
        return

    print(f"Seeding artworks (up to {num_images_available} based on image files)...")
    artworks = []
    image_folder_full_path = os.path.join(media_folder_base, ARTWORK_IMAGE_FOLDER_RELATIVE)
    print(f"Checking for images in: {image_folder_full_path}")

    one_shilling_added = False

    for i in range(1, num_images_available + 1):
        image_filename = f"{IMAGES_BASE_NAME}{i}.jpg"
        image_full_path = os.path.join(image_folder_full_path, image_filename)
        relative_image_url = get_image_path(i)

        if not os.path.exists(image_full_path):
            print(f"Warning: Image file not found: {image_full_path}. Skipping artwork {i}.")
            continue

        artwork_name = fake.catch_phrase() if fake else f"Artwork {i}"
        description = fake.text(max_nb_chars=200) if fake else f"A beautiful piece numbered {i}."

        if not one_shilling_added:
            price = Decimal(1)
            one_shilling_added = True
        else:
            price = Decimal(random.randint(500, 15000))  # Prices between KSh 500 and 15,000

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
        print("No artworks were seeded.")

def seed_users(num_users):
    print(f"Seeding {num_users} users...")
    users = []
    for i in range(num_users):
        user_email = fake.email() if fake else f"user{i+1}@example.com"
        user_name = fake.name() if fake else f"Test User {i+1}"
        user_address = random.choice(KENYAN_LOCATIONS)

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
        print(f"Created user: {user_email}, Address: {user_address}")

    if users:
        db.session.add_all(users)
        db.session.commit()
        print(f"{len(users)} users seeded (default password: '{DEFAULT_PASSWORD}').")
    else:
        print("No new users were seeded.")
        
    return users

def run_seed():
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

