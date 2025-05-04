import os

def get_available_filename(base_name, extension):
    """Find the next available filename like art1.jpg, art2.jpg, etc."""
    counter = 1
    while True:
        new_name = f"{base_name}{counter}.{extension}"
        if not os.path.exists(new_name):
            return new_name
        counter += 1

def rename_images():
    images = [f for f in os.listdir('.') if f.lower().endswith('.jpg')]
    images.sort()

    for filename in images:
        new_name = get_available_filename("art", "jpg")
        os.rename(filename, new_name)
        print(f"Renamed '{filename}' to '{new_name}'")

if __name__ == "__main__":
    rename_images()
