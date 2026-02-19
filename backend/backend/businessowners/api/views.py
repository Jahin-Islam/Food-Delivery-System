from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class RestaurantDiscountView(APIView):
    # We enforce basic token auth availability, but we check role manually below
    permission_classes = [IsAuthenticated]

    def dictfetchall(self, cursor):
        """
        Helper function to convert raw SQL rows into a list of dictionaries.
        This replaces the Serializer's job of formatting data.
        """
        columns = [col[0] for col in cursor.description]
        return [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

    def check_restaurant_owner(self, request):
        """
        Validates if user is authenticated and has the correct role.
        """
        # 1. Check Role
        if request.user.role != 'RESTAURANT':
            return False
        return True

    def get_restaurant_id(self, user_id):
        """
        Raw SQL to find the restaurant ID associated with the user.
        """
        with connection.cursor() as cursor:
            # Table name assumption: 'restaurants_restaurant' 
            # (app_name + "_" + model_name in lowercase)
            cursor.execute(
                "SELECT id FROM resturants_restaurant WHERE user_id = %s LIMIT 1", 
                [user_id]
            )
            row = cursor.fetchone()
            return row[0] if row else None

    def get(self, request):
        if not self.check_restaurant_owner(request):
            return Response(
                {"detail": "Access denied. Only Restaurant owners allowed."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        restaurant_id = self.get_restaurant_id(request.user.id)
        
        if not restaurant_id:
            return Response(
                {"detail": "Restaurant profile not found for this user."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # RAW SQL: Get all discounts for this restaurant
        with connection.cursor() as cursor:
            # We select specific fields to return cleanly
            sql = """
                SELECT id, discount_num, percentage, min_order, description, is_active 
                FROM resturants_discount 
                WHERE resturant_id = %s
                ORDER BY discount_num ASC
            """
            cursor.execute(sql, [restaurant_id])
            discounts = self.dictfetchall(cursor)

        return Response(discounts, status=status.HTTP_200_OK)

    def post(self, request):
        if not self.check_restaurant_owner(request):
            return Response(
                {"detail": "Access denied. Only Restaurant owners allowed."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        restaurant_id = self.get_restaurant_id(request.user.id)

        if not restaurant_id:
            return Response(
                {"detail": "Restaurant profile not found. Please create one first."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Extract data from request body (Manual parsing, no serializer validation)
        data = request.data
        try:
            percentage = float(data.get('percentage'))
            min_order = data.get('min_order') # Can be None/Null
            description = data.get('description', '')
            is_active = data.get('is_active', True)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid input data. Percentage is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            # RAW SQL: Logic to find current max discount_num
            # COALESCE ensures if result is NULL (no records), we get 0
            count_sql = """
                SELECT COALESCE(MAX(discount_num), 0) 
                FROM resturants_discount 
                WHERE resturant_id = %s
            """
            cursor.execute(count_sql, [restaurant_id])
            current_max = cursor.fetchone()[0]
            
            # Logic: Add 1 to the max number
            next_discount_num = current_max + 1

            # RAW SQL: Insert the new discount
            insert_sql = """
                INSERT INTO resturants_discount 
                (resturant_id, discount_num, percentage, min_order, description, is_active) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_sql, [
                restaurant_id, 
                next_discount_num, 
                percentage, 
                min_order, 
                description, 
                is_active
            ])

        return Response({
            "message": "Discount created successfully",
            "discount_num": next_discount_num,
            "percentage": percentage,
            "description": description
        }, status=status.HTTP_201_CREATED)
    


class RestaurantDiscountDetailedView(APIView):
    permission_classes = [IsAuthenticated]

    # --- Helper Methods ---
    def get_restaurant_id(self, user_id):
        """Finds the restaurant ID for the logged-in user."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM resturants_restaurant WHERE user_id = %s LIMIT 1", 
                [user_id]
            )
            row = cursor.fetchone()
            return row[0] if row else None
    
    def check_restaurant_owner(self, request):
        """
        Validates if user is authenticated and has the correct role.
        """
        # 1. Check Role
        if request.user.role != 'RESTAURANT':
            return False
        return True

    def dictfetchone(self, cursor):
        """Converts a single raw SQL row into a dictionary."""
        row = cursor.fetchone()
        if row is None:
            return None
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))

    # --- HTTP Methods ---

    def get(self, request, pk):
        """
        Retrieve a specific discount by ID (pk).
        Ensures the discount belongs to the requesting user's restaurant.
        """
        if not self.check_restaurant_owner(request):
            return Response(
                {"detail": "Access denied. Only Restaurant owners allowed."}, 
                status=status.HTTP_403_FORBIDDEN
            )
           
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant not found."}, status=404)

        with connection.cursor() as cursor:
            # SQL: specific ID AND belonging to specific restaurant
            sql = """
                SELECT id, discount_num, percentage, min_order, description, is_active
                FROM resturants_discount
                WHERE id = %s AND resturant_id = %s
            """
            cursor.execute(sql, [pk, restaurant_id])
            discount = self.dictfetchone(cursor)

        if discount:
            return Response(discount, status=status.HTTP_200_OK)
        else:
            return Response(
                {"detail": "Discount not found or you do not have permission to view it."}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def delete(self, request, pk):
        """
        Delete a specific discount.
        """
        if not self.check_restaurant_owner(request):
            return Response(
                {"detail": "Access denied. Only Restaurant owners allowed."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant not found."}, status=404)

        with connection.cursor() as cursor:
            # SQL: Delete only if ID matches AND restaurant matches
            sql = "DELETE FROM resturants_discount WHERE id = %s AND resturant_id = %s"
            cursor.execute(sql, [pk, restaurant_id])
            
            # Check if any row was actually deleted
            if cursor.rowcount == 0:
                return Response(
                    {"detail": "Discount not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response({"detail": "Discount deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def put(self, request, pk):
        """
        Update a specific discount.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant not found."}, status=404)

        data = request.data
        
        # 1. Construct SQL Update Query dynamically based on input
        # We generally do not update 'discount_num' manually as it's sequential
        update_fields = []
        params = []

        if 'percentage' in data:
            update_fields.append("percentage = %s")
            params.append(data['percentage'])
        
        if 'min_order' in data:
            update_fields.append("min_order = %s")
            params.append(data['min_order'])
            
        if 'description' in data:
            update_fields.append("description = %s")
            params.append(data['description'])

        if 'is_active' in data:
            update_fields.append("is_active = %s")
            # Convert boolean to 1 or 0 for SQL if needed, though Postgres/MySQL often handle True/False
            params.append(data['is_active'])

        if not update_fields:
            return Response({"detail": "No valid fields provided for update."}, status=status.HTTP_400_BAD_REQUEST)

        # Add ID and Restaurant ID to params for the WHERE clause
        params.append(pk)
        params.append(restaurant_id)

        sql = f"""
            UPDATE resturants_discount 
            SET {', '.join(update_fields)} 
            WHERE id = %s AND resturant_id = %s
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            
            if cursor.rowcount == 0:
                return Response(
                    {"detail": "Discount not found or permission denied."}, 
                    status=status.HTTP_404_NOT_FOUND
                )

        # 2. Return the updated object
        return self.get(request, pk)