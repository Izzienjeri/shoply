# === ./seed.py ===

import os
import random
from decimal import Decimal
from faker import Faker
from app import create_app, db
from app.models import User, Artist, Artwork, Cart, CartItem, Order, OrderItem, DeliveryOption, PaymentTransaction # Added DeliveryOption

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
    # Clear in order of dependencies to avoid FK constraint errors
    db.session.query(OrderItem).delete()
    # Order has FK to PaymentTransaction and DeliveryOption. PaymentTransaction has FK to Cart and DeliveryOption.
    # So Order, then PaymentTransaction, then CartItem, then Cart.
    # DeliveryOption can be cleared before or after PaymentTransaction/Order if those FKs are nullable.
    # Let's clear Order and PaymentTransaction before DeliveryOption just to be safe.
    db.session.query(Order).delete() 
    db.session.query(PaymentTransaction).delete() 
    db.session.query(CartItem).delete()
    db.session.query(Cart).delete()
    db.session.query(Artwork).delete()
    db.session.query(DeliveryOption).delete() # Clear DeliveryOption
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

        if not one_shilling_added: # Ensure at least one item is Ksh 1 for testing STK push
            price = Decimal(1)  # Corrected if this was an issue
            one_shilling_added = True
        else:
            price = Decimal(random.randint(500, 15000))

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
        user_address = random.choice(KENYAN_LOCATIONS) # Default address

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

def seed_delivery_options():
    print("Seeding delivery options...")
    options_data = [
        {"name": "In Store Pick Up", "price": "0.00", "is_pickup": True, "active": True, "sort_order": 0, "description": "Collect your order from Dynamic Mall, Shop M90, CBD, Nairobi."},
        {"name": "Diaspora (Kitengela Via Rembo)", "price": "200.00", "is_pickup": False, "active": True, "sort_order": 10},
        {"name": "Nairobi CBD", "price": "200.00", "is_pickup": False, "active": True, "sort_order": 20},
        {"name": "Zone 1 (Upper-Hill, Statehouse, etc. - 6km Proximity)", "price": "300.00", "is_pickup": False, "active": True, "sort_order": 30, "description": "Upper-Hill, Statehouse, Rhapta Road, Parklands, Pangani, City Stadium"},
        {"name": "Zone 2 (N/West, Madaraka, South B/C, etc.)", "price": "400.00", "is_pickup": False, "active": True, "sort_order": 40, "description": "N/ West, Madaraka, South B/C, Mbagathi, Kilimani, Riara Road, Jamhuri, Yaya, Prestige, Kileleshwa, Westlands"},
        {"name": "The Central Region", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 50},
        {"name": "The Coastal Region", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 51},
        {"name": "The Eastern Region", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 52},
        {"name": "The North Eastern Region", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 53},
        {"name": "The Nyanza Region", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 54},
        {"name": "The Rift Valley Region", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 55},
        {"name": "The Western Region", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 56},
        {"name": "Zone 3 (Kikuyu, Kinoo, Kahawa, JKIA, etc.)", "price": "500.00", "is_pickup": False, "active": True, "sort_order": 60, "description": "Kikuyu, Kinoo, Muthiga, Kahawa Sukari, Kahawa West, KU, Nyayo Estate, Kayole, Nasra Garden, JKIA, Kerarapon-Karen"},
        {"name": "Zone 4 (Kiambu Town, Ruiru, Utawala, etc.)", "price": "700.00", "is_pickup": False, "active": True, "sort_order": 70, "description": "Kiambu Town ,Ruiru,Kimbo,Utawala"},
        {"name": "To Door Couriers (G4S/Fargo)", "price": "1000.00", "is_pickup": False, "active": True, "sort_order": 80},
        {"name": "Zone 5 (Ngong Town, Rongai)", "price": "1000.00", "is_pickup": False, "active": True, "sort_order": 90},
    ]

    options_to_add = []
    for opt_data in options_data:
        if not DeliveryOption.query.filter_by(name=opt_data["name"]).first():
            option = DeliveryOption(
                name=opt_data["name"],
                price=Decimal(opt_data["price"]),
                is_pickup=opt_data.get("is_pickup", False),
                active=opt_data.get("active", True),
                sort_order=opt_data.get("sort_order", 0),
                description=opt_data.get("description")
            )
            options_to_add.append(option)
    
    if options_to_add:
        db.session.add_all(options_to_add)
        db.session.commit()
        print(f"{len(options_to_add)} new delivery options seeded.")
    else:
        print("All delivery options already exist.")


def run_seed():
    app = create_app()
    with app.app_context():
        media_folder = app.config.get('MEDIA_FOLDER')
        if not media_folder or not os.path.isdir(media_folder):
            print(f"ERROR: MEDIA_FOLDER ('{media_folder}') is not configured correctly or does not exist.")
            print("Ensure MEDIA_FOLDER is set in your Flask app config and the directory exists.")
            return

        clear_data()
        seed_delivery_options() # Seed delivery options first
        created_artists = seed_artists(NUM_ARTISTS)
        seed_artworks(created_artists, NUM_IMAGES, media_folder)
        seed_users(NUM_USERS)
        print("-" * 20)
        print("Seeding process completed!")
        print("-" * 20)

if __name__ == '__main__': # Allows running seed.py directly
    run_seed()