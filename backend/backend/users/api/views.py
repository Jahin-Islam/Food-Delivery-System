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
        print(email, phone_number, role)
        
        # Default User Flags
        is_superuser = 0
        is_staff = 0
        is_active = 1
        date_joined = datetime.now()

        # Extract Rider specific data
        vehicle = request.data.get('vehicle', None)
        license_plate = request.data.get('license_plate', None)

        # Extract Restaurant specific data
        restaurant_name = request.data.get('restaurant_name', None) 
        restaurant_category = request.data.get('restaurant_category', 'RESTAURANT')

        # --- Validation ---
        if role == 'RIDER' and (not vehicle or not license_plate):
            return Response(
                {"error": "Vehicle type and License plate are required for Riders."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if role == 'RESTAURANT' and not restaurant_name:
            return Response(
                {"error": "Business Name (restaurant_name) is required for Restaurant registration."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    sql_user = """
                    INSERT INTO users_User 
                    (password, is_superuser, email, is_staff, is_active, date_joined, role, phone_number, image_url, first_name, last_name) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql_user, [
                        password, is_superuser, email, is_staff, is_active, date_joined, role, phone_number, '', first_name, last_name
                    ])

                    cursor.execute("SELECT id FROM users_User WHERE email = %s", [email])
                    row = cursor.fetchone()
                    if not row:
                        raise Exception("Failed to retrieve new user ID.")
                    new_user_id = row[0]

                    if role == 'CUSTOMER':
                        cursor.execute("""
                            INSERT INTO customers_customer (user_id, wallet_balance)
                            VALUES (%s, %s)
                        """, [new_user_id, 0.00])

                    elif role == 'RIDER':
                        cursor.execute("""
                            INSERT INTO riders_rider 
                            (user_id, is_available, vehicle, license_plate, current_latitude, current_longitude)
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, [new_user_id, 0, vehicle, license_plate, None, None])
                    
                    elif role == 'RESTAURANT':
                        cursor.execute("""
                            INSERT INTO resturants_restaurant 
                            (user_id, name, restaurant_category, phone, min_order, rating, total_rated, image_url, opening_time, closing_time)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, [
                            new_user_id, 
                            restaurant_name, 
                            restaurant_category, 
                            phone_number, 
                            0.00,
                            0.00,
                            0,
                            '',
                            None,
                            None
                        ])

            return Response({"message": f"{role.capitalize()} registered successfully"}, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            return Response({"error": "User with this email or phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
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
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            response_data = {
                "first_name": user_row[0],
                "last_name": user_row[1],
                "email": user_row[2],
                "phone_number": user_row[3],
                "role": user_row[4],
                "image_url": user_row[5],
            }

            role = response_data['role']

            if role == "CUSTOMER":
                cursor.execute("""
                    SELECT wallet_balance 
                    FROM customers_customer 
                    WHERE user_id = %s
                """, [user_id])
                row = cursor.fetchone()
                response_data["wallet_balance"] = row[0] if row else 0.00

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

            elif role == "RESTAURANT":
                cursor.execute("""
                    SELECT 
                        id,
                        name, 
                        restaurant_category, 
                        rating, 
                        phone, 
                        opening_time, 
                        closing_time, 
                        image_url 
                    FROM resturants_restaurant 
                    WHERE user_id = %s
                    LIMIT 1
                """, [user_id])
                
                row = cursor.fetchone()
                if row:
                    response_data["restaurant_info"] = {
                        "id": row[0],
                        "restaurant_name": row[1],
                        "category": row[2],
                        "rating": row[3],
                        "contact_phone": row[4],
                        "opening_time": row[5],
                        "closing_time": row[6],
                        "restaurant_image": row[7]
                    }

        return Response(response_data)