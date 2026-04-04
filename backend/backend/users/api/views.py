from datetime import datetime
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import connection, IntegrityError, transaction

from ..models import User
from .serializers import UserRegistrationSerializer, MyTokenObtainPairSerializer
from riders.api.services import validate_rider_fields, insert_rider
from customers.api.services import insert_customer
from resturants.api.services import insert_restaurant


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email        = serializer.validated_data['email']
        password     = make_password(serializer.validated_data['password'])
        phone_number = serializer.validated_data.get('phone_number', '')
        role         = serializer.validated_data.get('role', 'CUSTOMER')
        first_name   = serializer.validated_data.get('first_name', '')
        last_name    = serializer.validated_data.get('last_name', '')

        is_superuser = 0
        is_staff     = 0
        is_active    = 1
        date_joined  = datetime.now()

        if role == 'RIDER':
            error_msg = validate_rider_fields(request.data, request.FILES)
            if error_msg:
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        elif role == 'RESTAURANT':
            if not request.data.get('restaurant_name', '').strip():
                return Response(
                    {"error": "restaurant_name is required for Restaurant registration."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
                
            with connection.cursor() as cursor:
                cursor.execute("START TRANSACTION;")
                cursor.execute(
                    """
                    INSERT INTO users_user
                        (password, is_superuser, email, is_staff, is_active,
                            date_joined, role, phone_number, image_url,
                            first_name, last_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    [
                        password, is_superuser, email, is_staff, is_active,
                        date_joined, role, phone_number, '',
                        first_name, last_name,
                    ]
                )

                cursor.execute("SELECT LAST_INSERT_ID()")
                row = cursor.fetchone()
                if not row or not row[0]:
                    raise Exception("MySQL did not return a valid user ID after INSERT.")
                new_user_id = row[0]

                if role == 'CUSTOMER':
                    insert_customer(cursor, new_user_id)

                elif role == 'RIDER':
                    insert_rider(cursor, new_user_id, request)

                elif role == 'RESTAURANT':
                    insert_restaurant(
                        cursor, new_user_id, phone_number, request.data
                    )
                cursor.execute("COMMIT;")

            return Response(
                {"message": f"{role.capitalize()} registered successfully"},
                status=status.HTTP_201_CREATED
            )

        except IntegrityError:
            cursor.execute("ROLLBACK;")
            return Response(
                {"error": "A user with this email or phone number already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            cursor.execute("ROLLBACK;")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class MyLoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Uses MyTokenObtainPairSerializer (already written) which adds
    role + user info to the JWT payload.
    No changes needed here.
    """
    serializer_class = MyTokenObtainPairSerializer


def format_time(val):
    """Convert MySQL TimeField value (timedelta or time or string) to HH:MM string."""
    if val is None:
        return None
    if hasattr(val, 'seconds'):
        total = int(val.total_seconds())
        h, m = divmod(total // 60, 60)
        return f"{h:02d}:{m:02d}"
    return str(val)[:5]


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id       = request.user.id
        response_data = {}

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT first_name, last_name, email,
                       phone_number, role, image_url
                FROM users_user
                WHERE id = %s
            """, [user_id])
            user_row = cursor.fetchone()

            if not user_row:
                return Response(
                    {"error": "User not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            response_data = {
                "first_name":   user_row[0],
                "last_name":    user_row[1],
                "email":        user_row[2],
                "phone_number": user_row[3],
                "role":         user_row[4],
                "image_url":    user_row[5],
            }
            role = response_data['role']

            if role == 'CUSTOMER':
                cursor.execute("""
                    SELECT wallet_balance
                    FROM customers_customer
                    WHERE user_id = %s
                """, [user_id])
                row = cursor.fetchone()
                response_data["wallet_balance"] = row[0] if row else 0.00

            elif role == 'RIDER':
                cursor.execute("""
                    SELECT id, is_available, vehicle, license_plate,
                           current_latitude, current_longitude
                    FROM riders_rider
                    WHERE user_id = %s
                """, [user_id])
                rider_row = cursor.fetchone()

                if rider_row:
                    rider_id = rider_row[0]
                    response_data["rider_info"] = {
                        "is_available":    bool(rider_row[1]),
                        "vehicle":         rider_row[2],
                        "license_plate":   rider_row[3],
                        "current_lat":     rider_row[4],
                        "current_lng":     rider_row[5],
                    }

                    # Additional info
                    cursor.execute("""
                        SELECT
                            rai.nid_number,
                            rai.gender,
                            rai.wallet_balace,
                            rai.emergency_contact_name,
                            rai.emergency_contact_number,
                            a.street_address,
                            a.city,
                            a.latitude,
                            a.longitude
                        FROM riders_rider_additional_information rai
                        LEFT JOIN addresses_address a ON a.address_id = rai.address_id
                        WHERE rai.rider_id = %s
                    """, [rider_id])
                    add_row = cursor.fetchone()

                    if add_row:
                        response_data["rider_additional_info"] = {
                            "nid_number":               add_row[0],
                            "gender":                   add_row[1],
                            "wallet_balance":           str(add_row[2]),
                            "emergency_contact_name":   add_row[3],
                            "emergency_contact_number": add_row[4],
                            "address": {
                                "street_address": add_row[5],
                                "city":           add_row[6],
                                "latitude":       add_row[7],
                                "longitude":      add_row[8],
                            }
                        }

            elif role == 'RESTAURANT':
                cursor.execute("""
                    SELECT id, name, restaurant_category, rating,
                           phone, opening_time, closing_time, image_url
                    FROM resturants_restaurant
                    WHERE user_id = %s
                    LIMIT 1
                """, [user_id])
                row = cursor.fetchone()
                if row:
                    response_data["restaurant_info"] = {
                        "id":               row[0],
                        "restaurant_name":  row[1],
                        "category":         row[2],
                        "rating":           row[3],
                        "contact_phone":    row[4],
                        "opening_time":     format_time(row[5]),
                        "closing_time":     format_time(row[6]),
                        "restaurant_image": row[7],
                    }

        return Response(response_data)
    def patch(self, request):
        user_id = request.user.id
        data    = request.data
        ALLOWED_FIELDS = {'first_name', 'last_name', 'phone_number'}
        updates = {field: data[field] for field in ALLOWED_FIELDS if field in data}

        new_password     = data.get('new_password')
        current_password = data.get('current_password')

        if not updates and not new_password:
            return Response(
                {"error": "No updatable fields provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        for field, value in updates.items():
            if not isinstance(value, str) or not value.strip():
                return Response(
                    {"error": f"{field} must be a non-empty string."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        if new_password:
            if not current_password:
                return Response(
                    {"error": "current_password is required to set a new password."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if len(new_password) < 8:
                return Response(
                    {"error": "New password must be at least 8 characters."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT password FROM users_user WHERE id = %s", [user_id]
                )
                row = cursor.fetchone()

            if not row or not check_password(current_password, row[0]):
                return Response(
                    {"error": "Current password is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            updates['password'] = make_password(new_password)

        set_clause = ', '.join(f"{col} = %s" for col in updates)
        values     = list(updates.values()) + [user_id]

        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"UPDATE users_user SET {set_clause} WHERE id = %s",
                    values
                )
                if cursor.rowcount == 0:
                    return Response(
                        {"error": "User not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )
        except IntegrityError:
            return Response(
                {"error": "Phone number is already in use by another account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"message": "Profile updated successfully."},
            status=status.HTTP_200_OK
        )
    ##############################       FIX NEEDED HERE ########################################
    def delete(self, request):
        user_id = request.user.id
        try:
            with connection.cursor() as cursor:

                # 1. Get the customer.id
                cursor.execute(
                    "SELECT id FROM customers_customer WHERE user_id = %s", [user_id]
                )
                row = cursor.fetchone()
                customer_id = row[0] if row else None

                if customer_id:
                    # 2. Delete order items
                    cursor.execute("""
                        DELETE oi FROM orders_orderitem oi
                        INNER JOIN orders_order o ON o.order_id = oi.order_id
                        WHERE o.customer_id = %s
                    """, [customer_id])

                    # 3. Delete orders
                    cursor.execute(
                        "DELETE FROM orders_order WHERE customer_id = %s", [customer_id]
                    )

                    # 4. Delete delivery addresses — try both possible table names
                    for tbl in ('addresses_deliveryaddress', 'addresses_deliveryadress'):
                        try:
                            cursor.execute(
                                f"DELETE FROM {tbl} WHERE customer_id = %s", [customer_id]
                            )
                            break
                        except Exception:
                            connection.connection.rollback()  # clear failed statement in MySQL

                    # 5. Delete customer profile
                    cursor.execute(
                        "DELETE FROM customers_customer WHERE id = %s", [customer_id]
                    )

                # 6. Delete rider additional info then rider
                try:
                    cursor.execute("""
                        DELETE rai FROM riders_rider_additional_information rai
                        INNER JOIN riders_rider r ON r.id = rai.rider_id
                        WHERE r.user_id = %s
                    """, [user_id])
                except Exception:
                    connection.connection.rollback()

                cursor.execute("DELETE FROM riders_rider WHERE user_id = %s", [user_id])

                # 7. Delete restaurant discounts then restaurant
                try:
                    cursor.execute("""
                        DELETE d FROM resturants_discount d
                        INNER JOIN resturants_restaurant r ON r.id = d.resturant_id
                        WHERE r.user_id = %s
                    """, [user_id])
                except Exception:
                    connection.connection.rollback()

                cursor.execute("DELETE FROM resturants_restaurant WHERE user_id = %s", [user_id])

                # 8. Delete the user
                cursor.execute("DELETE FROM users_user WHERE id = %s", [user_id])

            return Response(
                {"message": "Account deleted successfully."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DeliveryAddressView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id  = request.user.id
        data     = request.data
        address  = (data.get('address') or '').strip()
        latitude = data.get('latitude')
        longitude= data.get('longitude')

        if not address:
            return Response(
                {"error": "address is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM customers_customer WHERE user_id = %s",
                [user_id]
            )
            row = cursor.fetchone()
            if not row:
                return Response({"message": "Only Customer can delivery address"}, status=status.HTTP_401_UNAUTHORIZED)

            customer_id = row[0]

            cursor.execute("""
                SELECT id FROM addresses_deliveryaddress
                WHERE customer_id = %s AND address_type = 'HOME'
                LIMIT 1
            """, [customer_id])
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE addresses_deliveryaddress
                    SET description  = %s,
                        latitude     = %s,
                        longitude    = %s
                    WHERE id = %s
                """, [address, latitude, longitude, existing[0]])
                return Response(
                    {"message": "Delivery address updated.", "address_id": existing[0]},
                    status=status.HTTP_200_OK
                )
            else:
                cursor.execute("""
                    INSERT INTO addresses_deliveryaddress
                        (customer_id, address_type, street_number,
                         apartment_number, description, latitude, longitude)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, [
                    customer_id,
                    'HOME',
                    None,
                    None,
                    address,
                    latitude,
                    longitude,
                ])
                cursor.execute("SELECT LAST_INSERT_ID()")
                new_id = cursor.fetchone()[0]
                return Response(
                    {"message": "Delivery address saved.", "address_id": new_id},
                    status=status.HTTP_201_CREATED
                )