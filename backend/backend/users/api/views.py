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
        with connection.cursor() as cursor:
            cursor.execute("SELECT email, role, phone_number, is_active FROM users_User WHERE id = %s", [user_id])
            row = cursor.fetchone()
        
        if row:
            user_data = {
                "email": row[0],
                "role": row[1],
                "phone_number": row[2],
                "is_active": row[3]
            }
            return Response(user_data)
        else:
            return Response({"error": "User not found"}, status=404)