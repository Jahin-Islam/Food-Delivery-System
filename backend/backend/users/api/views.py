from datetime import datetime
from django.contrib.auth.hashers import make_password
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import connection, IntegrityError
from ..models import User
from .serializers import UserRegistrationSerializer, MyTokenObtainPairSerializer

class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):

        serializer = UserRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


        email = serializer.validated_data['email']
        password = make_password(serializer.validated_data['password'])
        phone_number = serializer.validated_data.get('phone_number', '')
        role = serializer.validated_data.get('role', 'CUSTOMER')
        first_name = ''
        last_name = ''
        is_superuser = 0
        is_staff = 0
        is_active = 1
        date_joined = datetime.now()
        try:
            with connection.cursor() as cursor:
                sql = """
                INSERT INTO users_User 
                (password, is_superuser, email, is_staff, is_active, date_joined, role, phone_number, image_url, first_name, last_name) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """

                cursor.execute(sql, [
                    password, is_superuser, email, is_staff, is_active, date_joined, role, phone_number, '', first_name, last_name
                ])
                
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
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