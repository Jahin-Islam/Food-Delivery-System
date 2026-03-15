from django.shortcuts import render
from django.db import connection
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation

RESTAURANT_VALID_TRANSITIONS = {
    'PENDING': ['PREPARING', 'CANCELLED'],
}

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



def get_customer_orders(customer_id):
    with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    o.order_id,
                    o.status,
                    o.total_amount,
                    o.created_at,
                    o.est_delivery,
                    o.delivered_at,
                    r.name          AS restaurant_name,
                    r.image_url     AS restaurant_image
                FROM orders_order o
                LEFT JOIN resturants_restaurant r ON r.id = o.restaurant_id
                WHERE o.customer_id = %s
                ORDER BY o.created_at DESC
            """, [customer_id])
            orders = dictfetchall(cursor)
            return orders

def get_order_details(order_id):
     with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    o.order_id,
                    o.status,
                    o.total_amount,
                    o.created_at,
                    o.est_pickup,
                    o.est_delivery,
                    o.delivered_at,
                    o.email,
                    o.first_name,
                    o.last_name,
                    o.phone_number,
                    r.name              AS restaurant_name,
                    ad.street_number,
                    ad.apartment_number,
                    ad.description      AS address_description,
                    ad.latitude         AS delivery_lat,
                    ad.longitude        AS delivery_lng
                FROM orders_order o
                LEFT JOIN resturants_restaurant r ON r.id = o.restaurant_id
                LEFT JOIN addresses_deliveryaddress ad ON ad.id = o.address_id
                WHERE o.order_id = %s
            """, [order_id])
            order = dictfetchone(cursor)
            return order

def get_order_items(order_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                oi.id,
                oi.quantity,
                oi.price_at_purchase,
                mi.name       AS item_name,
                mi.image_url  AS item_image
            FROM orders_orderitem oi
            LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
            WHERE oi.order_id = %s
        """, [order_id])
        return dictfetchall(cursor)

def create_order(customer_id, restaurant_id, address_id, items, customer_info):
    """
    items: list of { item_id, quantity }
    customer_info: { email, first_name, last_name, phone_number }
    Returns: order_id on success, raises ValueError on validation failure
    """

    # ── 1. Validate all items exist, are available, and belong to the restaurant ──
    item_ids = [item['item_id'] for item in items]
    placeholders = ', '.join(['%s'] * len(item_ids))

    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT food_id, price, is_available, restaurant_id
            FROM items_menuitem
            WHERE food_id IN ({placeholders})
        """, item_ids)
        db_items = dictfetchall(cursor)

    if len(db_items) != len(item_ids):
        raise ValueError("One or more items do not exist.")

    db_items_map = {item['food_id']: item for item in db_items}

    for item in db_items:
        if not item['is_available']:
            raise ValueError(f"Item {item['food_id']} is currently unavailable.")
        if item['restaurant_id'] != restaurant_id:
            raise ValueError(f"Item {item['food_id']} does not belong to this restaurant.")

    # ── 2. Calculate total from DB prices, ignore frontend prices ──
    total_amount = sum(
        db_items_map[item['item_id']]['price'] * item['quantity']
        for item in items
    )

    # ── 3. Insert the order and order items inside a transaction ──
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO orders_order
                (customer_id, restaurant_id, address_id, status, total_amount,
                 email, first_name, last_name, phone_number, created_at)
            VALUES (%s, %s, %s, 'PENDING', %s, %s, %s, %s, %s, NOW())
        """, [
            customer_id,
            restaurant_id,
            address_id,
            total_amount,
            customer_info.get('email'),
            customer_info.get('first_name'),
            customer_info.get('last_name'),
            customer_info.get('phone_number'),
        ])
        order_id = cursor.lastrowid

        for item in items:
            price_at_purchase = db_items_map[item['item_id']]['price']
            cursor.execute("""
                INSERT INTO orders_orderitem
                    (order_id, item_id, quantity, price_at_purchase)
                VALUES (%s, %s, %s, %s)
            """, [order_id, item['item_id'], item['quantity'], price_at_purchase])

    return order_id


def get_restaurant_orders(restaurant_id, status_filter=None):
    query = """
        SELECT
            o.order_id,
            o.status,
            o.total_amount,
            o.created_at,
            o.first_name,
            o.last_name,
            o.phone_number
        FROM orders_order o
        WHERE o.restaurant_id = %s
    """
    params = [restaurant_id]

    if status_filter:
        query += " AND o.status = %s"
        params.append(status_filter)

    query += " ORDER BY o.created_at DESC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        orders = dictfetchall(cursor)

    if not orders:
        return []

    # ── Fetch items for all orders in one query ──
    order_ids = [o['order_id'] for o in orders]
    placeholders = ', '.join(['%s'] * len(order_ids))

    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT
                oi.order_id,
                oi.quantity,
                oi.price_at_purchase,
                mi.name         AS item_name,
                mi.image_url    AS item_image
            FROM orders_orderitem oi
            LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
            WHERE oi.order_id IN ({placeholders})
        """, order_ids)
        all_items = dictfetchall(cursor)

    # ── Group items by order_id and attach ──
    items_map = {}
    for item in all_items:
        order_id = item.pop('order_id') 
        if order_id not in items_map:
            items_map[order_id] = []
        items_map[order_id].append(item)

    for order in orders:
        order['items'] = items_map.get(order['order_id'], [])

    return orders

def update_order_status_by_restaurant(order_id, restaurant_id, new_status):
    """
    Validates ownership, validates transition, updates status.
    Raises ValueError on any failure.
    """
    # ── 1. Fetch the order and verify it belongs to this restaurant ──
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT status FROM orders_order
            WHERE order_id = %s AND restaurant_id = %s
        """, [order_id, restaurant_id])
        row = cursor.fetchone()

    if not row:
        raise ValueError("Order not found or does not belong to your restaurant.")

    current_status = row[0]

    # ── 2. Validate the transition ──
    allowed = RESTAURANT_VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValueError(
            f"Cannot transition order from '{current_status}' to '{new_status}'. "
            f"Allowed transitions: {allowed}"
        )

    # ── 3. Update the status ──
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE orders_order
            SET status = %s
            WHERE order_id = %s
        """, [new_status, order_id])