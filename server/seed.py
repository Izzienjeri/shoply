import os
import random
from decimal import Decimal
from faker import Faker
from app import create_app, db
from app.models import User, Artist, Artwork, Cart, CartItem, Order, OrderItem, DeliveryOption, PaymentTransaction

NUM_ARTISTS = 10
NUM_USERS = 10
ARTWORK_IMAGE_FOLDER_RELATIVE = 'artwork_images'
IMAGES_BASE_NAME = 'art'
NUM_IMAGES = 48
DEFAULT_PASSWORD = "pass123"
ADMIN_EMAIL = "admin@artistryhaven.io"
TEST_USER_EMAIL = "testuser@artistryhaven.io"

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
    print("Clearing existing data (but not users/artists/artworks/delivery options)...")
    db.session.query(OrderItem).delete()
    db.session.query(Order).delete()
    db.session.query(PaymentTransaction).delete()
    db.session.query(CartItem).delete()
    db.session.query(Cart).delete()
    db.session.commit()
    print("Data cleared.")

def seed_artists(num_artists):
    print(f"Seeding {num_artists} artists...")
    artists = []
    for _ in range(num_artists):
        first_name = fake.first_name() if fake else "John"
        kenyan_last_name = random.choice(KENYAN_NAMES)
        name = f"{first_name} {kenyan_last_name}"
        bio = fake.paragraph(nb_sentences=3) if fake else f"Bio for {name}."
        artists.append(Artist(name=name, bio=bio, is_active=True))
    db.session.add_all(artists)
    db.session.commit()
    print("Artists seeded.")
    return artists

def seed_artworks(artists, num_images_available, media_folder_base):
    if not artists:
        print("No artists available for artworks.")
        return

    print(f"Seeding artworks from {num_images_available} images...")
    artworks = []
    image_folder_full_path = os.path.join(media_folder_base, ARTWORK_IMAGE_FOLDER_RELATIVE)

    for i in range(1, num_images_available + 1):
        image_filename = f"{IMAGES_BASE_NAME}{i}.jpg"
        image_full_path = os.path.join(image_folder_full_path, image_filename)
        if not os.path.exists(image_full_path):
            print(f"Missing image: {image_full_path}, skipping.")
            continue

        artwork = Artwork(
            name=fake.catch_phrase() if fake else f"Artwork {i}",
            description=fake.text(max_nb_chars=200) if fake else f"Description for artwork {i}.",
            price=Decimal(random.randint(500, 15000)),
            stock_quantity=random.randint(0, 10),
            artist_id=random.choice(artists).id,
            image_url=get_image_path(i),
            is_active=True
        )
        artworks.append(artwork)

    if artworks:
        db.session.add_all(artworks)
        db.session.commit()
        print(f"{len(artworks)} artworks seeded.")
    else:
        print("No artworks seeded.")

def seed_users():
    print(f"Seeding 10 users (including 1 admin, 1 test user)...")
    users = []

    if not User.query.filter_by(email=ADMIN_EMAIL).first():
        admin = User(email=ADMIN_EMAIL, name="Admin User", address="Artistry Haven HQ", is_admin=True)
        admin.set_password(DEFAULT_PASSWORD)
        users.append(admin)
        print(f"Admin created: {ADMIN_EMAIL}")
    else:
        print("Admin already exists.")

    if not User.query.filter_by(email=TEST_USER_EMAIL).first():
        test_user = User(email=TEST_USER_EMAIL, name="Test User", address="Nairobi", is_admin=False)
        test_user.set_password(DEFAULT_PASSWORD)
        users.append(test_user)
        print(f"Test user created: {TEST_USER_EMAIL}")
    else:
        print("Test user already exists.")

    for i in range(8):
        email = fake.unique.email() if fake else f"user{i+1}@example.com"
        if User.query.filter_by(email=email).first():
            continue
        user = User(
            email=email,
            name=fake.name() if fake else f"User {i+1}",
            address=random.choice(KENYAN_LOCATIONS),
            is_admin=False
        )
        user.set_password(DEFAULT_PASSWORD)
        users.append(user)

    if users:
        db.session.add_all(users)
        db.session.commit()
        print(f"{len(users)} users seeded. All passwords: '{DEFAULT_PASSWORD}'")
    else:
        print("No new users added.")

def seed_delivery_options():
    print("Seeding delivery options...")
    options_data = [
        {"name": "In Store Pick Up", "price": "0.00", "is_pickup": True, "active": True, "sort_order": 0},
        {"name": "Nairobi CBD", "price": "200.00", "is_pickup": False, "active": True, "sort_order": 10},
        {"name": "Zone 1 (Upper-Hill)", "price": "300.00", "is_pickup": False, "active": True, "sort_order": 20},
        {"name": "Zone 2 (Kilimani, Lavington)", "price": "350.00", "is_pickup": False, "active": True, "sort_order": 30},
        {"name": "Zone 3 (Westlands, Parklands)", "price": "400.00", "is_pickup": False, "active": True, "sort_order": 40},
        {"name": "Zone 4 (Thika Road, Kasarani, Roysambu)", "price": "450.00", "is_pickup": False, "active": True, "sort_order": 50},
        {"name": "Zone 5 (Lang'ata, Rongai, Karen)", "price": "500.00", "is_pickup": False, "active": True, "sort_order": 60},
        {"name": "Outside Nairobi (Other towns)", "price": "1000.00", "is_pickup": False, "active": True, "sort_order": 70},
    ]

    new_options = []
    for opt in options_data:
        if not DeliveryOption.query.filter_by(name=opt["name"]).first():
            new_options.append(DeliveryOption(
                name=opt["name"],
                price=Decimal(opt["price"]),
                is_pickup=opt["is_pickup"],
                active=opt["active"],
                sort_order=opt["sort_order"],
                description=opt.get("description", "")
            ))

    if new_options:
        db.session.add_all(new_options)
        db.session.commit()
        print(f"{len(new_options)} delivery options seeded.")
    else:
        print("Delivery options already exist.")

def run_seed():
    app = create_app()
    with app.app_context():
        media_folder = app.config.get('MEDIA_FOLDER')
        if not media_folder or not os.path.isdir(media_folder):
            print(f"ERROR: MEDIA_FOLDER '{media_folder}' is missing or invalid.")
            return

        clear_data()
        seed_delivery_options()
        artists = seed_artists(NUM_ARTISTS)
        seed_artworks(artists, NUM_IMAGES, media_folder)
        seed_users()
        print("-" * 20)
        print("Seeding complete.")
        print("-" * 20)

if __name__ == '__main__':
    run_seed()
