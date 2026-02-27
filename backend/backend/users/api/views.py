from datetime import datetime
from django.contrib.auth.hashers import make_password
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import connection, IntegrityError, transaction
from ..models import User
from .serializers import UserRegistrationSerializer, MyTokenObtainPairSerializer

class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):

        serializer = UserRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Extract User Data
        email = serializer.validated_data['email']
        password = make_password(serializer.validated_data['password'])
        phone_number = serializer.validated_data.get('phone_number', '')
        role = serializer.validated_data.get('role', 'CUSTOMER')
        first_name = serializer.validated_data.get('first_name', '')
        last_name = serializer.validated_data.get('last_name', '')
        
        # Default User Flags
        is_superuser = 0
        is_staff = 0
        is_active = 1
        date_joined = datetime.now()

        # Extract Rider specific data
        vehicle = request.data.get('vehicle', None)
        license_plate = request.data.get('license_plate', None)

        # Extract Restaurant specific data
        # Note: 'restaurant_name' usually maps to "Business Name" from the frontend form
        restaurant_name = request.data.get('restaurant_name', None) 
        restaurant_category = request.data.get('restaurant_category', 'RESTAURANT')

        # --- Validation ---
        
        # Validation for Rider
        if role == 'RIDER' and (not vehicle or not license_plate):
            return Response(
                {"error": "Vehicle type and License plate are required for Riders."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validation for Restaurant
        if role == 'RESTAURANT' and not restaurant_name:
            return Response(
                {"error": "Business Name (restaurant_name) is required for Restaurant registration."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Use atomic transaction to ensure integrity
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # 1. Insert into Users Table
                    sql_user = """
                    INSERT INTO users_User 
                    (password, is_superuser, email, is_staff, is_active, date_joined, role, phone_number, image_url, first_name, last_name) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql_user, [
                        password, is_superuser, email, is_staff, is_active, date_joined, role, phone_number, '', first_name, last_name
                    ])

                    # 2. Retrieve the ID of the newly created user
                    cursor.execute("SELECT id FROM users_User WHERE email = %s", [email])
                    row = cursor.fetchone()
                    if not row:
                        raise Exception("Failed to retrieve new user ID.")
                    new_user_id = row[0]

                    # 3. Insert into Profile Table based on Role
                    if role == 'CUSTOMER':
                        sql_customer = """
                        INSERT INTO customers_customer (user_id, wallet_balance)
                        VALUES (%s, %s)
                        """
                        cursor.execute(sql_customer, [new_user_id, 0.00])

                    elif role == 'RIDER':
                        sql_rider = """
                        INSERT INTO riders_rider 
                        (user_id, is_available, vehicle, license_plate, current_latitude, current_longitude)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """
                        cursor.execute(sql_rider, [
                            new_user_id, 0, vehicle, license_plate, None, None
                        ])
                    
                    elif role == 'RESTAURANT':
                        # Validating DB Constraints from models.py:
                        # min_order: Required (Decimal) -> Defaulting to 0.00
                        # rating: Default 0.00
                        # total_rated: Default 0
                        # address_id: Nullable -> Defaulting to NULL
                        
                        sql_restaurant = """
                        INSERT INTO resturants_restaurant 
                        (user_id, name, restaurant_category, phone, min_order, rating, total_rated, image_url, opening_time, closing_time)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """
                        
                        # We use the user's phone number as the default contact phone for the restaurant entry
                        # We set opening/closing times to NULL initially
                        cursor.execute(sql_restaurant, [
                            new_user_id, 
                            restaurant_name, 
                            restaurant_category, 
                            phone_number, 
                            0.00,  # min_order default
                            0.00,  # rating default
                            0,     # total_rated default
                            '',    # image_url default
                            None,  # opening_time
                            None   # closing_time
                        ])

            return Response({"message": f"{role.capitalize()} registered successfully"}, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            return Response({"error": "User with this email or phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # It's often good to log 'e' here for debugging
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MyLoginView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


############## Shows Users Profile Data ###############
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        response_data = {}

        with connection.cursor() as cursor:
            # 1. FETCH ONLY BASIC IDENTITY INFO FROM USER TABLE
            # Excluded: password, is_superuser, is_staff, date_joined, etc.
            user_query = """
                SELECT 
                    first_name, 
                    last_name, 
                    email, 
                    phone_number, 
                    role, 
                    image_url
                FROM users_user 
                WHERE id = %s
            """
            cursor.execute(user_query, [user_id])
            user_row = cursor.fetchone()

            if not user_row:
                return Response({"error": "User not found"}, status=404)

            # Manually mapping to ensure we control exactly what goes out
            response_data = {
                "first_name": user_row[0],
                "last_name": user_row[1],
                "email": user_row[2],
                "phone_number": user_row[3],
                "role": user_row[4],
                "profile_image": user_row[5],
            }

            role = response_data['role']

            # 2. FETCH ONLY ROLE-SPECIFIC NECESSARY INFO
            
            # --- CUSTOMER: Only Wallet Balance ---
            if role == "CUSTOMER":
                cursor.execute("""
                    SELECT wallet_balance 
                    FROM customers_customer 
                    WHERE user_id = %s
                """, [user_id])
                
                row = cursor.fetchone()
                if row:
                    response_data["wallet_balance"] = row[0]
                else:
                    response_data["wallet_balance"] = 0.00

            # --- RIDER: Only Availability & Vehicle Type ---
            # Excluded: current_latitude, current_longitude (tracking data), license_plate (sensitive)
            elif role == "RIDER":
                cursor.execute("""
                    SELECT is_available, vehicle
                    FROM riders_rider 
                    WHERE user_id = %s
                """, [user_id])
                
                row = cursor.fetchone()
                if row:
                    response_data["rider_info"] = {
                        "is_available": row[0],
                        "vehicle_type": row[1]
                    }

            # --- RESTAURANT: Name, Rating, Contact & Category ---
            # Excluded: min_order, total_rated, internal IDs
            # Note: Since Restaurant is a ForeignKey (One User -> Many Restaurants), 
            # we fetch the first one associated with this profile.
            elif role == "RESTAURANT":
                cursor.execute("""
                    SELECT 
                        name, 
                        restaurant_category, 
                        rating, 
                        phone, 
                        opening_time, 
                        closing_time, 
                        image_url 
                    FROM restaurants_restaurant 
                    WHERE user_id = %s
                    LIMIT 1
                """, [user_id])
                
                row = cursor.fetchone()
                if row:
                    response_data["restaurant_info"] = {
                        "restaurant_name": row[0],
                        "category": row[1],
                        "rating": row[2],
                        "contact_phone": row[3],
                        "opening_time": row[4],
                        "closing_time": row[5],
                        "restaurant_image": row[6]
                    }

        return Response(response_data)