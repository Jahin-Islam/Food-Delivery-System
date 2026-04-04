import traceback
from django.db import connection
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation
from orders.api.services import get_customer_orders, get_order_details, get_order_items, create_order
from exceptions import ConflictError, ValidationError, PermissionError, NotFoundError
from addresses.api.services import get_all_delivery_address, create_delivery_address, get_specific_delivery_address, update_delivery_address, delete_delivery_address
from utility import dictfetchall, dictfetchone
from .services import get_customer_id


# def dictfetchall(cursor):
#     columns = [col[0] for col in cursor.description]
#     return [dict(zip(columns, row)) for row in cursor.fetchall()]

# def dictfetchone(cursor):
#     columns = [col[0] for col in cursor.description]
#     row = cursor.fetchone()
#     return dict(zip(columns, row)) if row else None

# def get_customer_id(user_id):
#     """Resolve auth user_id → customer.id using the SQL function."""
#     with connection.cursor() as cursor:
#         # Call the custom SQL function
#         cursor.execute("SELECT fn_get_customer_id(%s)", [user_id])
#         row = cursor.fetchone()
        
#     # row[0] will be the ID or None (since the function defaults to NULL)
#     return row[0] if row else None

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
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            result = create_order(request, customer_id)

        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except NotFoundError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            tb = traceback.format_exc()
            print("=" * 60)
            print("[create_order] UNEXPECTED ERROR:")
            print(tb)
            print("=" * 60)
            return Response(
                {"error": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {
                "message":         "Order placed successfully.",
                "order_id":        result['order_id'],
                "discount_amount": result['discount_amount'],
            },
            status=status.HTTP_201_CREATED
        )


class CustomerOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        ##Ownership Check##
        customer_id = get_customer_id(request.user.id)

        if not customer_id:
            return Response({"error" : "You are unauthorized to view this api"},
                        status=status.HTTP_403_FORBIDDEN)
        
        with connection.cursor() as cursor:
            cursor.execute("select 1 from orders_order where order_id = %s and customer_id = %s", 
                           [order_id, customer_id])
            
            row = dictfetchone(cursor)
            if not row:
                return Response({"error" : "The order does not belong to you"}, status=status.HTTP_403_FORBIDDEN)
        
        order = get_order_details(order_id)
        order['items'] = get_order_items(order_id)

        return Response(order, status=status.HTTP_200_OK)
            

