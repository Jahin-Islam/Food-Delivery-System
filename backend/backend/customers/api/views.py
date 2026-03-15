from django.db import connection
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation
from orders.api.services import get_customer_orders, get_order_details, get_order_items, create_order
from addresses.api.services import get_all_delivery_address, create_delivery_address, get_specific_delivery_address, update_delivery_address, delete_delivery_address
from exceptions import ConflictError, ValidationError, PermissionError, NotFoundError


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None

def get_customer_id(user_id):
    """Resolve auth user_id → customer.id. Returns None if no customer profile exists."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM customers_customer WHERE user_id = %s
        """, [user_id])
        row = cursor.fetchone()
    return row[0] if row else None


# ─────────────────────────────────────────────
# GET   /api/customers/me/addresses/
# POST  /api/customers/me/addresses/
# ─────────────────────────────────────────────
class CustomerAddressListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            addresses = get_all_delivery_address(request)
            return Response(addresses, status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        try:
            new_id = create_delivery_address(request)
            return Response(
                {"message": "Address added successfully.", "address_id": new_id},
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return Response({"error" : str(e)}, status= status.HTTP_400_BAD_REQUEST)
        except ConflictError as e:
            return Response({"error" : str(e)}, status= status.HTTP_409_CONFLICT)
        except PermissionError as e:
            return Response({"error" : str(e)}, status= status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────
# GET    /api/customers/me/addresses/<address_id>/
# PUT    /api/customers/me/addresses/<address_id>/
# DELETE /api/customers/me/addresses/<address_id>/
# ─────────────────────────────────────────────
class CustomerAddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, address_id):
        try:
            address = get_specific_delivery_address(request, address_id)
            return Response(address, status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"error" : str(e)}, status=status.HTTP_404_NOT_FOUND)
        except NotFoundError as e:
            return Response({"error" : str(e)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, address_id):
        try:
            updated_address = update_delivery_address(request, address_id)
            return Response(
            {"message": "Address updated successfully.", "address": updated_address},
                status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"error" : str(e)}, status=status.HTTP_404_NOT_FOUND)
        except NotFoundError as e:
            return Response({"error" : str(e)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            return Response({"error" : str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, address_id):
        try:
            delete_delivery_address(request, address_id)
            return Response({"message" :"Address delete successfully"}, status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"error" : str(e)}, status=status.HTTP_404_NOT_FOUND)
        except NotFoundError as e:
            return Response({"error" : str(e)}, status=status.HTTP_404_NOT_FOUND)
            


# ─────────────────────────────────────────────
# GET  /api/customers/me/orders/
# ─────────────────────────────────────────────
class CustomerOrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        orders = get_customer_orders(customer_id)
        return Response(orders, status=status.HTTP_200_OK)

    def post(self, request):
        """
            Body for the post request
            {
            "restaurant_id": 1,
            "address_id": 3,
            "email": "john@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "01712345678",
            "items": [
                {
                    "item_id": 5,
                    "quantity": 2
                },
                {
                    "item_id": 8,
                    "quantity": 1
                }
            ]
            }
        """
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        data = request.data

        # ── Validate required fields ──
        restaurant_id = data.get('restaurant_id')
        items = data.get('items')  # expected: [{ item_id, quantity }]
        address_id = data.get('address_id')

        if not restaurant_id:
            return Response(
                {"error": "restaurant_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not address_id:
            return Response({"error" : "Address must be provided for delivery"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not items or not isinstance(items, list) or len(items) == 0:
            return Response(
                {"error": "items must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST
            )
        for i, item in enumerate(items):
            if 'item_id' not in item or 'quantity' not in item:
                return Response(
                    {"error": f"Item at index {i} is missing item_id or quantity."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if item['quantity'] <= 0:
                return Response(
                    {"error": f"Item at index {i} has invalid quantity."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        customer_info = {
            'email': data.get('email'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'phone_number': data.get('phone_number'),
        }

        try:
            order_id = create_order(
                customer_id=customer_id,
                restaurant_id=restaurant_id,
                address_id=data.get('address_id'),  # optional
                items=items,
                customer_info=customer_info,
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"message": "Order placed successfully.", "order_id": order_id},
            status=status.HTTP_201_CREATED
        )
    
    


# ─────────────────────────────────────────────
# GET  /api/customers/me/orders/<order_id>/
# ─────────────────────────────────────────────

class CustomerOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        ##Ownership Check#
        customer_id = get_customer_id(request.user.id)

        if not customer_id:
            return Response({"error" : "You are unauthorized to view this api"},
                        status=status.HTTP_403_FORBIDDEN)
        
        with connection.cursor() as cursor:
            cursor.execute("select 1 from orders_order where order_id = %s and customer_id = %s", 
                           [order_id, customer_id])
            
            row = dictfetchone(cursor)
            if not row:
                return Response({"error" : "The order does not belog to you"}, status=status.HTTP_403_FORBIDDEN)
        
        order = get_order_details(order_id)
        order['items'] = get_order_items(order_id)

        return Response(order, status=status.HTTP_200_OK)
            


# ─────────────────────────────────────────────
# GET   /api/customers/me/wallet/
# POST  /api/customers/me/wallet/
# ─────────────────────────────────────────────
class CustomerWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT wallet_balance
                FROM customers_customer
                WHERE user_id = %s
            """, [request.user.id])
            row = cursor.fetchone()

        if not row:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({"wallet_balance": row[0]}, status=status.HTTP_200_OK)

    def post(self, request):
        """Top up wallet balance. Body: { "amount": <positive number> }"""
        raw = request.data.get('amount')
        if raw is None:
            return Response(
                {"error": "amount is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(raw))
            if amount <= 0:
                raise ValueError("Must be positive")
        except (InvalidOperation, ValueError):
            return Response(
                {"error": "amount must be a positive number."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE customers_customer
                SET wallet_balance = wallet_balance + %s
                WHERE user_id = %s
            """, [amount, request.user.id])
            if cursor.rowcount == 0:
                return Response(
                    {"error": "Customer profile not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            cursor.execute("""
                SELECT wallet_balance FROM customers_customer WHERE user_id = %s
            """, [request.user.id])
            row = cursor.fetchone()

        return Response(
            {"message": "Wallet topped up successfully.", "new_balance": row[0]},
            status=status.HTTP_200_OK
        )