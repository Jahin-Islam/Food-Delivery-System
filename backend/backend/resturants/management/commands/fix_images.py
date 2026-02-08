import requests
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from items.models import MenuItem # REPLACE with your app name

class Command(BaseCommand):
    help = 'Downloads images from external_url and uploads to Cloudinary'

    def handle(self, *args, **kwargs):
        # We use ORM here because handling file uploads via Raw SQL is extremely difficult
        items = MenuItem.objects.filter(image_url__isnull=False, image = '')

        for item in items:
            print(f"Downloading {item.name}...")
            
            try:
                # 1. Get the binary data from the dummy website
                response = requests.get(item.image_url)
                
                if response.status_code == 200:
                    # 2. Clean the filename (e.g., "Tasty Pizza.jpg" -> "tasty_pizza.jpg")
                    filename = f"{item.name.replace(' ', '_').lower()}.jpg"
                    
                    # 3. Save it. 
                    # Internally, 'django-cloudinary-storage' takes this ContentFile,
                    # sends it to Cloudinary API, gets the path 'food_images/tasty_pizza.jpg',
                    # and saves that string into the MySQL database.
                    item.image.save(filename, ContentFile(response.content))
                    item.save()
                    
                    print(f"Success: Saved as {filename}")
                else:
                    print(f"Error: Could not access URL for {item.name}")
            
            except Exception as e:
                print(f"Error: {e}")