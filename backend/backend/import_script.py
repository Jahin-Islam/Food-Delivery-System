import os
import sys
import csv
import glob
import django
import hashlib
import random
from decimal import Decimal
from datetime import datetime

# 1. Setup Django
# Ensure this matches your project folder name
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') 
django.setup()

# 2. Import Models
from django.contrib.auth import get_user_model
from resturants.models import Restaurant, Serve, Discount
from cuisines.models import Cuisine
from items.models import MenuItem, Category
from addresses.models import Address

User = get_user_model()

def parse_bool(value):
    return str(value).lower() in ['true', '1', 'yes']

def get_stable_phone(text_seed):
    """Generates a consistent fake phone number based on the input text."""
    hash_object = hashlib.md5(text_seed.encode())
    hash_int = int(hash_object.hexdigest(), 16)
    phone_suffix = hash_int % 100000000
    return f"017{phone_suffix:08d}"

def parse_time(time_str):
    """Parses time strings like '12:00' or '23:59'."""
    try:
        return datetime.strptime(time_str, '%H:%M').time()
    except (ValueError, TypeError):
        return datetime.strptime("09:00", '%H:%M').time() # Default fallback

def create_random_discounts(restaurant_obj):
    """Creates random discounts for a new restaurant."""
    descriptions = [
        "Summer Special", "New User Promo", "Festival Deal", 
        "Midnight Blast", "Lunch Hour Saver", "Weekend Bonanza"
    ]
    
    # Create 1 to 3 discounts randomly
    num_discounts = random.randint(1, 3)
    
    for _ in range(num_discounts):
        percent = random.choice([10.0, 15.0, 20.0, 25.0, 50.0])
        min_ord = random.choice([100, 200, 500, 0])
        
        Discount.objects.create(
            resturant=restaurant_obj,  # Note: Using field name 'resturant' as per your model definition
            percentage=percent,
            min_order=min_ord,
            description=f"{random.choice(descriptions)} - {int(percent)}% Off"
        )
    print(f"    -> Added {num_discounts} random discounts.")

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
                # 1. Handle User, Address & Restaurant
                # =========================================================
                rest_name = row.get('Restaurant Name', '').strip()
                if not rest_name: continue

                if rest_name not in restaurant_cache:
                    # Generate unique email and phone
                    email_slug = rest_name.lower().replace(' ', '').replace('-', '').replace("'", "")[:15]
                    rest_email = f"{email_slug}@example.com"
                    fake_phone = get_stable_phone(rest_name)

                    # Check if User exists to avoid duplicates
                    user = User.objects.filter(email=rest_email).first()

                    if not user:
                        # A. Create Address Entry first (Since User needs it)
                        address_obj = Address.objects.create(
                            street_address=row.get('Address', '')[:255],
                            city=row.get('City', 'Dhaka')[:100],
                            latitude=float(row.get('Latitude', 0) or 0.0),
                            longitude=float(row.get('Longitude', 0) or 0.0)
                        )

                        # B. Create User linked to Address
                        user = User.objects.create(
                            email=rest_email,
                            role='RESTAURANT',
                            phone_number=fake_phone,
                            address=address_obj
                        )
                        user.set_password("1234")
                        user.save()
                        print(f"  Created User: {rest_name}")

                        # C. Create Restaurant linked to User
                        op_time = parse_time(row.get('Opening Hours', '09:00'))
                        cl_time = parse_time(row.get('Closing Hours', '22:00'))

                        restaurant = Restaurant.objects.create(
                            user=user,
                            name=rest_name,
                            address=row.get('Address', '')[:200], # Text address for Restaurant model
                            rating=Decimal(row.get('Rating', 0) or 0),
                            total_rated=int(row.get('Review Count', 0) or 0),
                            min_order=Decimal(row.get('Minimum Order', 0) or 0),
                            opening_time=op_time, 
                            closing_time=cl_time,
                            phone=fake_phone,
                            image_url=row.get('Restaurant Image', '')
                        )

                        # D. Create Random Discounts for this new Restaurant
                        create_random_discounts(restaurant)

                    else:
                        # If user exists, try to fetch the restaurant profile
                        if hasattr(user, 'restaurant_profile'):
                            restaurant = user.restaurant_profile
                        else:
                            # Edge case: User exists but no restaurant profile
                            print(f"  Warning: User {rest_email} exists but no restaurant profile.")
                            continue

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
                    # Create a composite key for cache because different restaurants might have same category name
                    cache_key = f"{rest_name}_{cat_name}"
                    
                    if cache_key in category_cache:
                        category_obj = category_cache[cache_key]
                    else:
                        # Note: Categories in your model seem global (not linked to restaurant directly),
                        # but usually categories are reused.
                        category_obj, _ = Category.objects.get_or_create(
                            category_name=cat_name
                        )
                        category_cache[cache_key] = category_obj

                # =========================================================
                # 3. Handle MenuItem
                # =========================================================
                # Check if item exists to prevent duplicates on re-run
                item_name = row.get('Item Name', 'Unknown Item')
                
                # Simple check to avoid creating exact duplicates if script runs twice
                if not MenuItem.objects.filter(restaurant=restaurant, name=item_name).exists():
                    MenuItem.objects.create(
                        restaurant=restaurant,
                        category=category_obj, 
                        name=item_name,
                        price=Decimal(row.get('Price', 0) or 0),
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
    # Look for all CSV files in the folder
    csv_files = glob.glob(os.path.join(current_directory, "*.csv"))

    if not csv_files:
        print("No CSV files found in the current folder.")
    else:
        print(f"Found {len(csv_files)} CSV file(s). Starting batch process...")
        for csv_file in csv_files:
            import_data(csv_file)
        print("All files processed.")