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

class CategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get_restaurant_id(self, user_id):
        """Helper to get restaurant ID from user ID"""
        with connection.cursor() as cursor:
            # Assuming table is restaurants_restaurant
            cursor.execute("SELECT id FROM resturants_restaurant WHERE user_id = %s LIMIT 1", [user_id])
            row = cursor.fetchone()
            return row[0] if row else None

    def get(self, request):
        """
        List all categories created by THIS specific restaurant.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant profile not found."}, status=status.HTTP_401_UNAUTHORIZED)

        with connection.cursor() as cursor:
            # RAW SQL: Select categories belonging to this restaurant
            # CHANGE 'menus_category' to your actual table name (e.g., appname_category)
            sql = "SELECT category_id, category_name FROM items_category WHERE restaurant_id = %s"
            cursor.execute(sql, [restaurant_id])
            
            # Convert rows to list of dicts
            columns = [col[0] for col in cursor.description]
            categories = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response(categories, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Create a new category for this restaurant.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant profile not found."}, status=status.HTTP_401_UNAUTHORIZED)

        category_name = request.data.get('category_name')
        if not category_name:
            return Response({"detail": "Category name is required."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            # RAW SQL: Insert new category linked to this restaurant
            sql = """
                INSERT INTO items_category (category_name, restaurant_id)
                VALUES (%s, %s)
            """
            cursor.execute(sql, [category_name, restaurant_id])
            
            # Get the ID of the item we just created
            # (Note: specific syntax depends on DB, usually last_insert_id works)
            new_id = cursor.lastrowid

        return Response({
            "message": "Category created successfully",
            "category_id": new_id, 
            "category_name": category_name
        }, status=status.HTTP_201_CREATED)


class CategoryDetailedView(APIView):
    permission_classes = [IsAuthenticated]

    def get_restaurant_id(self, user_id):
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM resturants_restaurant WHERE user_id = %s LIMIT 1", [user_id])
            row = cursor.fetchone()
            return row[0] if row else None

    def put(self, request, pk):
        """
        Update the name of a category.
        Strictly checks that the category belongs to the logged-in restaurant.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant profile not found."}, status=status.HTTP_401_UNAUTHORIZED)

        new_name = request.data.get('category_name')
        if not new_name:
            return Response({"detail": "New category name is required."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            # RAW SQL: Update ONLY if category_id matches AND restaurant_id matches
            sql = """
                UPDATE items_category 
                SET category_name = %s 
                WHERE category_id = %s AND restaurant_id = %s
            """
            cursor.execute(sql, [new_name, pk, restaurant_id])

            if cursor.rowcount == 0:
                return Response(
                    {"detail": "Category not found or you do not have permission to edit it."}, 
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response({"message": "Category updated", "category_name": new_name}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        """
        Delete a category.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant profile not found."}, status=status.HTTP_401_UNAUTHORIZED)
        
        with connection.cursor() as cursor:
            # RAW SQL: Delete with ownership check
            sql = "DELETE FROM items_category WHERE category_id = %s AND restaurant_id = %s"
            cursor.execute(sql, [pk, restaurant_id])

            if cursor.rowcount == 0:
                return Response({"detail": "Category not found."}, status=404)

        return Response({"detail": "Category deleted."}, status=204)

class MenuItemView(APIView):
    permission_classes = [IsAuthenticated]

    def get_restaurant_id(self, user_id):
        """Helper to find the restaurant ID for the logged-in user."""
        with connection.cursor() as cursor:
            # Table: restaurants_restaurant
            cursor.execute("SELECT id FROM resturants_restaurant WHERE user_id = %s LIMIT 1", [user_id])
            row = cursor.fetchone()
            return row[0] if row else None

    def dictfetchall(self, cursor):
        """Helper to return list of dictionaries."""
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def get(self, request):
        """
        Show all items of the logged-in restaurant owner.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant profile not found."}, status=status.HTTP_401_UNAUTHORIZED)

        with connection.cursor() as cursor:
            # RAW SQL: Select all items belonging to this restaurant
            # We also join with Category to get the category name for frontend convenience
            sql = """
                SELECT 
                    m.food_id, m.name, m.price, m.description, 
                    m.is_available, m.image_url, m.category_id,
                    m.image,
                    c.category_id,
                    c.category_name,
                    m.discount_amount,
                    m.discount_description
                FROM items_menuitem m
                LEFT JOIN items_category c ON m.category_id = c.category_id
                WHERE m.restaurant_id = %s
                ORDER BY m.food_id DESC
            """
            cursor.execute(sql, [restaurant_id])
            items = self.dictfetchall(cursor)

        return Response(items, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Add an item to a certain category for the restaurant.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant profile not found."}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        
        # 1. Basic Validation
        name = data.get('item_name')
        price = data.get('price')
        category_id = data.get('category_id') # Essential per your request

        
        if not name or not price or not category_id:
            return Response({"detail": "Name, Price, and Category ID are required."}, status=400)

        with connection.cursor() as cursor:
            # 2. SECURITY CHECK: Ensure the Category belongs to THIS restaurant
            # We don't want Vendor A adding items to Vendor B's category.
            check_cat_sql = "SELECT category_id FROM items_category WHERE category_id = %s AND restaurant_id = %s"
            cursor.execute(check_cat_sql, [category_id, restaurant_id])
            if not cursor.fetchone():
                return Response({"detail": "Invalid Category. It may not belong to your restaurant."}, status=status.HTTP_400_BAD_REQUEST)

            # 3. RAW SQL: Insert the Item
            insert_sql = """
                INSERT INTO items_menuitem 
                (restaurant_id, category_id, name, price, description, is_available, image_url, discount_amount, discount_description, image)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            # Handling optional fields
            description = data.get('description', '')
            is_available = data.get('is_available', 1) # Default true
            image_url = data.get('image_url', '')
            discount_amount = data.get('discount_amount', None)
            discount_description = data.get('discount_description', None)
            image = data.get('image', '')

            cursor.execute(insert_sql, [
                restaurant_id, category_id, name, price, 
                description, is_available, image_url, 
                discount_amount, discount_description, image
            ])
            
            # 4. Get the new ID (MySQL specific)
            new_id = cursor.lastrowid

        return Response({
            "message": "Item created successfully",
            "food_id": new_id,
            "name": name,
            "category_id": category_id
        }, status=status.HTTP_201_CREATED)


class MenuItemDetailedView(APIView):
    permission_classes = [IsAuthenticated]

    def get_restaurant_id(self, user_id):
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM resturants_restaurant WHERE user_id = %s LIMIT 1", [user_id])
            row = cursor.fetchone()
            return row[0] if row else None
    
    def get(self, request, pk):
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant not found."}, status=status.HTTP_401_UNAUTHORIZED)
            
        with connection.cursor() as cursor:
            # RAW SQL: Select specific item fields where food_id AND restaurant_id match
            sql = """
                SELECT 
                    food_id, name, price, description, is_available,image, 
                    image_url, discount_amount, discount_description, category_id
                FROM items_menuitem
                WHERE food_id = %s AND restaurant_id = %s
            """
            cursor.execute(sql, [pk, restaurant_id])
            row = cursor.fetchone()

            # If no row is returned, the item doesn't exist or doesn't belong to this user
            if not row:
                return Response({"detail": "Item not found."}, status=status.HTTP_404_NOT_FOUND)

            # Convert the raw SQL tuple (e.g., (1, "Burger"...)) into a Dictionary
            columns = [col[0] for col in cursor.description]
            item_data = dict(zip(columns, row))

        return Response(item_data, status=status.HTTP_200_OK)
        
    def put(self, request, pk):
        """
        Update item. 
        Flow: 
        1. Check if Restaurant exists.
        2. Check if Food Item belongs to Restaurant (Security Check).
        3. Check if new Category belongs to Restaurant (Logic Check).
        4. Update Data.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response({"detail": "Restaurant profile not found."}, status=status.HTTP_401_UNAUTHORIZED)

        with connection.cursor() as cursor:
            # ---------------------------------------------------------
            # 1. SECURITY CHECK: Verify Food ID and Restaurant ID match
            # ---------------------------------------------------------
            # We select 1 just to see if a row exists. Efficient and fast.
            check_item_sql = "SELECT 1 FROM items_menuitem WHERE food_id = %s AND restaurant_id = %s"
            cursor.execute(check_item_sql, [pk, restaurant_id])
            
            if not cursor.fetchone():
                return Response(
                    {"detail": "This item does not exist or does not belong to your restaurant."}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            data = request.data

            # ---------------------------------------------------------
            # 2. CATEGORY CHECK: If moving to a new category, verify it
            # ---------------------------------------------------------
            if 'category_id' in data:
                check_cat_sql = "SELECT 1 FROM items_category WHERE category_id = %s AND restaurant_id = %s"
                cursor.execute(check_cat_sql, [data['category_id'], restaurant_id])
                
                if not cursor.fetchone():
                    return Response(
                        {"detail": "Invalid Category. You cannot move an item to a category that is not yours."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # ---------------------------------------------------------
            # 3. BUILD UPDATE QUERY
            # ---------------------------------------------------------
            update_fields = []
            params = []

            # Mapping: JSON Key -> DB Column Name
            field_map = {
                'name': 'name',
                'price': 'price',
                'description': 'description',
                'is_available': 'is_available',
                'image_url': 'image_url',
                'discount_amount': 'discount_amount', # Corrected spelling
                'discount_description': 'discount_description',
                'category_id': 'category_id'
            }

            for json_key, db_col in field_map.items():
                if json_key in data:
                    update_fields.append(f"{db_col} = %s")
                    params.append(data[json_key])

            if not update_fields:
                return Response({"detail": "No valid fields provided for update."}, status=status.HTTP_400_BAD_REQUEST)

            # Add WHERE clause parameters
            params.append(pk)
            params.append(restaurant_id)

            # ---------------------------------------------------------
            # 4. EXECUTE UPDATE
            # ---------------------------------------------------------
            # We already verified ownership in Step 1, so this is safe.
            sql = f"UPDATE items_menuitem SET {', '.join(update_fields)} WHERE food_id = %s AND restaurant_id = %s"
            
            try:
                cursor.execute(sql, params)
            except Exception as e:
                return Response({"detail": f"Database Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({"message": "Item updated successfully"}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        """
        Delete the item.
        """
        restaurant_id = self.get_restaurant_id(request.user.id)
        
        with connection.cursor() as cursor:
            # RAW SQL: Delete with strict ownership check
            sql = "DELETE FROM items_menuitem WHERE food_id = %s AND restaurant_id = %s"
            cursor.execute(sql, [pk, restaurant_id])

            if cursor.rowcount == 0:
                return Response({"detail": "Item not found or permission denied."}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({"detail": "Item deleted successfully."}, status=status.HTTP_204_NO_CONTENT)