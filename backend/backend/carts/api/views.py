from django.db import connection, transaction
from rest_framework.views import APIView 
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
from cloudinary import CloudinaryImage

# Helper function to execute read queries and return a list of dicts
def fetch_all_as_dict(cursor):
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

class AllCartsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        
        query = """
            SELECT 
                c.cart_id, 
                c.created_at,
                res.id as restaurant_id,
                res.name as restaurant_name,
                res.image as restaurant_image,
                ci.id as cart_item_id,
                ci.quantity,
                mi.food_id as item_id,
                mi.name as item_name,
                mi.price as item_price,
                mi.image as image_url
            FROM carts_cart c
            JOIN customers_customer cust ON c.customer_id = cust.id
            JOIN resturants_restaurant res ON c.restaurant_id = res.id
            LEFT JOIN carts_cartitem ci ON c.cart_id = ci.cart_id
            LEFT JOIN items_menuitem mi ON ci.item_id = mi.food_id
            WHERE cust.user_id = %s
            ORDER BY c.created_at DESC
        """

        with connection.cursor() as cursor:
            cursor.execute(query, [user_id])
            flat_data = fetch_all_as_dict(cursor)

        # Return empty list if no carts found
        if not flat_data:
            return Response([], status=status.HTTP_200_OK)

        cart_map = {}

        for row in flat_data:
            c_id = row['cart_id']
            
            if c_id not in cart_map:
                cart_map[c_id] = {
                    'cart_id': c_id,
                    'restaurant': {
                        'id': row['restaurant_id'],
                        'name': row['restaurant_name'],
                        'image_url' : CloudinaryImage(row['restaurant_image']).build_url(secure=True) if row['restaurant_image'] else None
                    },
                    'created_at': row['created_at'],
                    'total_price': 0,
                    'items': []
                }

            if row['cart_item_id']:
                item_total = row['quantity'] * row['item_price']
                cart_map[c_id]['total_price'] += item_total
                
                cart_map[c_id]['items'].append({
                    'item_id': row['item_id'],
                    'name': row['item_name'],
                    'price': row['item_price'],
                    'quantity': row['quantity'],
                    'sub_total': item_total,
                    # ✅ Added Cloudinary image URL
                    'image_url': CloudinaryImage(row['image_url']).build_url(secure=True) if row['image_url'] else None
                })

        return Response(list(cart_map.values()), status=status.HTTP_200_OK)


class SingleRestaurantCart(APIView):
    permission_classes = [IsAuthenticated]

    def get_customer_id(self, user_id):
        """ Helper to get customer ID from user ID using Raw SQL """
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM customers_customer WHERE user_id = %s", [user_id])
            row = cursor.fetchone()
            return row[0] if row else None

    def get(self, request, restaurant_id):
        user_id = request.user.id
        
        # CORRECTED QUERY
        query = """
            SELECT
                mi.food_id as food_id,  
                mi.name as item_name,
                ci.quantity,
                mi.price as item_price, -- Fixed: Added comma here
                mi.image as image_url
            FROM carts_cart c
            JOIN customers_customer cust ON c.customer_id = cust.id
            LEFT JOIN carts_cartitem ci ON c.cart_id = ci.cart_id
            LEFT JOIN items_menuitem mi ON ci.item_id = mi.food_id
            WHERE cust.user_id = %s AND c.restaurant_id = %s -- Fixed: Filter by cust.user_id
        """

        with connection.cursor() as cursor:
            cursor.execute(query, [user_id, restaurant_id])
            flat_data = fetch_all_as_dict(cursor)

        if not flat_data:
            return Response({"message": "Cart is empty or does not exist"}, status=status.HTTP_404_NOT_FOUND)

        response_data = {
            'items': [],
            'total_price': 0,
        }

        for row in flat_data:
            # IMPORTANT: Handle empty carts
            # If cart exists but has no items, LEFT JOIN returns None for item fields
            if row['item_name'] is None:
                continue

            item_total = row['quantity'] * row['item_price']
            response_data['total_price'] += item_total
            
            response_data['items'].append({
                'food_id' : row['food_id'],
                'name': row['item_name'],
                'price': row['item_price'],
                'quantity': row['quantity'],
                'sub_total': item_total,
                'image_url': CloudinaryImage(row['image_url']).build_url(secure = True)
            })

        return Response(response_data, status=status.HTTP_200_OK)

    def post(self, request, restaurant_id):
        user_id = request.user.id
        item_id = request.data.get('item_id')
        
        # Ensure quantity is at least 1
        try:
            quantity = int(request.data.get('quantity', 1))
        except ValueError:
            quantity = 1

        if not item_id:
            return Response({"error": "item_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        customer_id = self.get_customer_id(user_id)
        if not customer_id:
            return Response({"error": "Customer profile not found"}, status=status.HTTP_404_NOT_FOUND)

        # MySQL Datetime format
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        with transaction.atomic():
            with connection.cursor() as cursor:
            # 1. Check if Cart exists (Using 'carts_cart' based on your GET query)
                cursor.execute(
                    "SELECT cart_id FROM carts_cart WHERE customer_id = %s AND restaurant_id = %s", 
                    [customer_id, restaurant_id]
                )
                cart_row = cursor.fetchone()

                if cart_row:
                    cart_id = cart_row[0]
                else:
                    # 2. Create Cart if not exists
                    cursor.execute(
                        "INSERT INTO carts_cart (customer_id, restaurant_id, created_at) VALUES (%s, %s, %s)",
                        [customer_id, restaurant_id, current_time]
                    )
                    # MySQL specific: get the ID of the row just inserted
                    cart_id = cursor.lastrowid

                # 3. Check if Item exists in CartItem (Using 'carts_cartitem')
                cursor.execute(
                    "SELECT id FROM carts_cartitem WHERE cart_id = %s AND item_id = %s",
                    [cart_id, item_id]
                )
                item_row = cursor.fetchone()

                if item_row:
                    # 4. Update Quantity (Add to existing)
                    return Response(
                    {"error": "Item already in cart. Use PUT request to update quantity."},
                        status=status.HTTP_409_CONFLICT
                    )
                else:
                    # 5. Insert New Item
                    cursor.execute(
                        "INSERT INTO carts_cartitem (cart_id, item_id, quantity) VALUES (%s, %s, %s)",
                        [cart_id, item_id, quantity]
                    )

        return Response({"message": "Item added to cart successfully"}, status=status.HTTP_201_CREATED)
    def put(self, request, restaurant_id):
        user_id = request.user.id
        item_id = request.data.get('item_id')
        
        # Ensure quantity is at least 1
        try:
            quantity = int(request.data.get('quantity', 1))
            if quantity < 1:
                return Response({"error": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"error": "Invalid quantity"}, status=status.HTTP_400_BAD_REQUEST)

        if not item_id:
            return Response({"error": "item_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        customer_id = self.get_customer_id(user_id)
        if not customer_id:
            return Response({"error": "Customer profile not found"}, status=status.HTTP_404_NOT_FOUND)

        with connection.cursor() as cursor:
            # 1. Check if Cart exists
            cursor.execute(
                "SELECT cart_id FROM carts_cart WHERE customer_id = %s AND restaurant_id = %s",
                [customer_id, restaurant_id]
            )
            cart_row = cursor.fetchone()

            if not cart_row:
                return Response({"error": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)
            
            cart_id = cart_row[0]

            # 2. Check if Item exists in CartItem
            cursor.execute(
                "SELECT id FROM carts_cartitem WHERE cart_id = %s AND item_id = %s",
                [cart_id, item_id]
            )
            item_row = cursor.fetchone()

            if not item_row:
                return Response({"error": "Item not found in cart. Use POST to add it first."}, status=status.HTTP_404_NOT_FOUND)

            # 3. Update Quantity
            cursor.execute(
                "UPDATE carts_cartitem SET quantity = %s WHERE id = %s",
                [quantity, item_row[0]]
            )

        return Response({"message": "Cart item updated successfully"}, status=status.HTTP_200_OK)

    def delete(self, request, restaurant_id):
        user_id = request.user.id
        item_id = request.data.get('item_id')

        if not item_id:
            return Response({"error": "item_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        customer_id = self.get_customer_id(user_id)
        if not customer_id:
            return Response({"error": "Customer profile not found"}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            with connection.cursor() as cursor:
                # 1. Check if Cart exists
                cursor.execute(
                    "SELECT cart_id FROM carts_cart WHERE customer_id = %s AND restaurant_id = %s",
                    [customer_id, restaurant_id]
                )
                cart_row = cursor.fetchone()

                if not cart_row:
                    return Response({"error": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)
                
                cart_id = cart_row[0]

                # 2. Check if the specific item exists in the cart
                cursor.execute(
                    "SELECT id FROM carts_cartitem WHERE cart_id = %s AND item_id = %s",
                    [cart_id, item_id]
                )
                item_row = cursor.fetchone()

                if not item_row:
                    return Response({"error": "Item not found in cart"}, status=status.HTTP_404_NOT_FOUND)

                # 3. Delete the specific item from CartItem
                cursor.execute(
                    "DELETE FROM carts_cartitem WHERE id = %s",
                    [item_row[0]]
                )

                # 4. Check if cart has any remaining items
                cursor.execute(
                    "SELECT COUNT(*) FROM carts_cartitem WHERE cart_id = %s",
                    [cart_id]
                )
                remaining_items = cursor.fetchone()[0]

                # 5. If no items left, delete the cart itself too
                if remaining_items == 0:
                    cursor.execute(
                        "DELETE FROM carts_cart WHERE cart_id = %s",
                        [cart_id]
                    )
                    return Response({"message": "Item and empty cart removed successfully"}, status=status.HTTP_200_OK)

        return Response({"message": "Item removed from cart successfully"}, status=status.HTTP_200_OK)
    