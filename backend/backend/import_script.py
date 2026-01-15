import os
import sys
import csv
import glob
import django
import hashlib
from decimal import Decimal
from datetime import datetime

# 1. Setup Django
# Ensure this matches your project folder name
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') 
django.setup()

# 2. Import Models
from django.contrib.auth import get_user_model
from resturants.models import Restaurant, Serve
from cuisines.models import Cuisine
from items.models import MenuItem, Category

User = get_user_model()

def parse_bool(value):
    return str(value).lower() in ['true', '1', 'yes']

def get_stable_phone(text_seed):
    """
    Generates a consistent fake phone number based on the input text.
    """
    hash_object = hashlib.md5(text_seed.encode())
    hash_int = int(hash_object.hexdigest(), 16)
    phone_suffix = hash_int % 100000000
    return f"017{phone_suffix:08d}"

def import_data(csv_file_path):
    if not os.path.exists(csv_file_path):
        print(f"Error: File {csv_file_path} not found.")
        return

    print(f"--- Importing data from: {os.path.basename(csv_file_path)} ---")
    
    with open(csv_file_path, newline='', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile)
        
        restaurant_cache = {} 
        category_cache = {}

        count = 0
        for row in reader:
            try:
                # =========================================================
                # 1. Handle User & Restaurant
                # =========================================================
                rest_name = row.get('Restaurant Name', '').strip()
                if not rest_name: continue

                if rest_name not in restaurant_cache:
                    # Create email based on name
                    email_slug = rest_name.lower().replace(' ', '').replace('-', '')[:15]
                    rest_email = f"{email_slug}@example.com"
                    
                    fake_phone = get_stable_phone(rest_name)

                    # === FIX IS HERE ===
                    # Removed 'username': rest_email from defaults
                    user, created = User.objects.get_or_create(
                        email=rest_email,
                        defaults={
                            'role': 'RESTAURANT',
                            'address': row.get('Address', ''),
                            'phone_number': fake_phone 
                        }
                    )
                    
                    if created: 
                        user.set_password("1234")
                        user.save()

                    # Time Parsing
                    try:
                        op_str = row.get('Opening Hours', '09:00')
                        cl_str = row.get('Closing Hours', '22:00')
                        op_time = datetime.strptime(op_str, '%H:%M').time()
                        cl_time = datetime.strptime(cl_str, '%H:%M').time()
                    except ValueError:
                        op_time = datetime.strptime("09:00", '%H:%M').time()
                        cl_time = datetime.strptime("22:00", '%H:%M').time()

                    # Get or Create Restaurant
                    restaurant, _ = Restaurant.objects.get_or_create(
                        user=user,
                        defaults={
                            'name': rest_name,
                            'address': row.get('Address', ''),
                            'rating': Decimal(row.get('Rating', 0) or 0),
                            'min_order': Decimal(row.get('Minimum Order', 0) or 0),
                            'latitude': float(row.get('Latitude', 0) or 0.0),
                            'longitude': float(row.get('Longitude', 0) or 0.0),
                            'opening_time': op_time, 
                            'closing_time': cl_time,
                            'image_url': row.get('Restaurant Image', '')
                        }
                    )
                    
                    # Handle Cuisines
                    if row.get('Cuisines'):
                        for c in row['Cuisines'].split(','):
                            c_clean = c.strip()
                            if c_clean:
                                c_obj, _ = Cuisine.objects.get_or_create(name=c_clean[:20])
                                Serve.objects.get_or_create(restaurant=restaurant, cuisine=c_obj)

                    restaurant_cache[rest_name] = restaurant
                else:
                    restaurant = restaurant_cache[rest_name]

                # =========================================================
                # 2. Handle Category
                # =========================================================
                cat_name = row.get('Category', '').strip()
                category_obj = None

                if cat_name:
                    cache_key = f"{rest_name}_{cat_name}"
                    
                    if cache_key in category_cache:
                        category_obj = category_cache[cache_key]
                    else:
                        # Assuming your Category model uses category_name
                        category_obj, _ = Category.objects.get_or_create(
                            category_name=cat_name
                        )
                        category_cache[cache_key] = category_obj

                # =========================================================
                # 3. Handle MenuItem
                # =========================================================
                MenuItem.objects.create(
                    restaurant=restaurant,
                    category=category_obj, 
                    name=row.get('Item Name', 'Unknown Item'),
                    price=Decimal(row.get('Price', 0)),
                    description=row.get('Description', ''),
                    is_available=not parse_bool(row.get('Is Sold Out', False)),
                    image_url=row.get('Item Image', '')
                )

                count += 1
                if count % 20 == 0:
                    print(f"  Processed {count} items...")

            except Exception as e:
                print(f"  [Skipping Row] Error on item '{row.get('Item Name', 'Unknown')}': {e}")

    print(f"--- Finished {os.path.basename(csv_file_path)} (Imported {count} items) ---\n")

if __name__ == '__main__':
    current_directory = os.path.dirname(os.path.abspath(__file__))
    csv_files = glob.glob(os.path.join(current_directory, "*.csv"))

    if not csv_files:
        print("No CSV files found in the current folder.")
    else:
        print(f"Found {len(csv_files)} CSV file(s). Starting batch process...")
        for csv_file in csv_files:
            import_data(csv_file)
        print("All files processed.")