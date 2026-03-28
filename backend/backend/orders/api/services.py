from django.shortcuts import render
from django.db import connection
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation
from exceptions import ValidationError, NotFoundError
from cloudinary import CloudinaryImage

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
                o.rider_tip,
                o.delivery_charge,
                o.service_charge,
                o.discount_amount,
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
                ad.longitude        AS delivery_lng,
                u.first_name        AS rider_first_name,
                u.last_name         AS rider_last_name
            FROM orders_order o
            LEFT JOIN resturants_restaurant r  ON r.id = o.restaurant_id
            LEFT JOIN addresses_deliveryaddress ad ON ad.id = o.address_id
            LEFT JOIN riders_rider ri           ON ri.id = o.rider_id
            LEFT JOIN users_user u              ON u.id = ri.user_id
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
                mi.image      AS item_image
            FROM orders_orderitem oi
            LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
            WHERE oi.order_id = %s
        """, [order_id])
        items = dictfetchall(cursor)

    # Build the Cloudinary URL for each item that has an image
    for item in items:
        raw = item.get('item_image')
        if raw:
            item['item_image'] = CloudinaryImage(str(raw)).build_url()
        else:
            item['item_image'] = None

    return items


def create_order(request, customer_id):
    """
    Accepts the full DRF request and a resolved customer_id.
    Expects request.data to contain:
        restaurant_id, address_id, items, delivery_charge, service_charge,
        email, first_name, last_name, phone_number
        [optional] discount_num  — discount number from resturants_discount table
        [optional] rider_tip
    items: list of { item_id, quantity }
    Returns: { order_id, discount_amount } on success.
    Raises: ValidationError, NotFoundError
    """
    data = request.data

    # ── 1. Extract and validate required top-level fields ──
    restaurant_id  = data.get('restaurant_id')
    address_id     = data.get('address_id')
    items          = data.get('items')

    if not restaurant_id:
        raise ValidationError("restaurant_id is required.")
    if not address_id:
        raise ValidationError("Address must be provided for delivery.")
    if not items or not isinstance(items, list) or len(items) == 0:
        raise ValidationError("items must be a non-empty list.")

    for i, item in enumerate(items):
        if 'item_id' not in item or 'quantity' not in item:
            raise ValidationError(f"Item at index {i} is missing item_id or quantity.")
        if item['quantity'] <= 0:
            raise ValidationError(f"Item at index {i} has an invalid quantity.")

    # ── 2. Parse delivery_charge, service_charge, rider_tip ──
    try:
        delivery_charge = Decimal(str(data.get('delivery_charge', 0)))
        service_charge  = Decimal(str(data.get('service_charge', 0)))
        rider_tip       = Decimal(str(data.get('rider_tip', 0)))
        if delivery_charge < 0 or service_charge < 0:
            raise ValueError()
    except (InvalidOperation, ValueError):
        raise ValidationError("delivery_charge and service_charge must be non-negative numbers.")

    # ── 3. Verify the address exists AND belongs to this customer ──
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM addresses_deliveryaddress
            WHERE id = %s AND customer_id = %s
        """, [address_id, customer_id])
        if not cursor.fetchone():
            raise NotFoundError("Address not found or does not belong to you.")

    # ── 4. Validate all items exist, are available, and belong to the restaurant ──
    item_ids     = [item['item_id'] for item in items]
    placeholders = ', '.join(['%s'] * len(item_ids))

    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT food_id, price, is_available, restaurant_id
            FROM items_menuitem
            WHERE food_id IN ({placeholders})
        """, item_ids)
        db_items = dictfetchall(cursor)

    if len(db_items) != len(item_ids):
        raise NotFoundError("One or more items do not exist.")

    db_items_map = {item['food_id']: item for item in db_items}

    for item in db_items:
        if not item['is_available']:
            raise ValidationError(f"Item {item['food_id']} is currently unavailable.")
        if item['restaurant_id'] != restaurant_id:
            raise ValidationError(f"Item {item['food_id']} does not belong to this restaurant.")

    # ── 5. Calculate items subtotal ──
    items_subtotal = sum(
        Decimal(str(db_items_map[item['item_id']]['price'])) * item['quantity']
        for item in items
    )

    # ── 6. Resolve discount (optional discount_num) ──
    discount_amount = Decimal('0')
    discount_num    = data.get('discount_num')

    if discount_num is not None:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT percentage, min_order, is_active
                FROM resturants_discount
                WHERE resturant_id = %s AND discount_num = %s
            """, [restaurant_id, discount_num])
            discount_row = dictfetchone(cursor)

        if not discount_row:
            raise NotFoundError(
                f"Discount #{discount_num} not found for this restaurant."
            )
        if not discount_row['is_active']:
            raise ValidationError(
                f"Discount #{discount_num} is no longer active."
            )

        min_order = Decimal(str(discount_row['min_order'] or 0))
        if items_subtotal < min_order:
            raise ValidationError(
                f"Your subtotal (৳{items_subtotal}) does not meet the minimum order "
                f"(৳{min_order}) required for this discount."
            )

        percentage      = Decimal(str(discount_row['percentage']))
        discount_amount = (items_subtotal * percentage / Decimal('100')).quantize(Decimal('0.01'))

    # ── 7. Calculate final total ──
    total_amount = items_subtotal - discount_amount + delivery_charge + service_charge + rider_tip

    # ── 8. Build customer_info from request ──
    customer_info = {
        'email':        data.get('email'),
        'first_name':   data.get('first_name'),
        'last_name':    data.get('last_name'),
        'phone_number': data.get('phone_number'),
    }

    # ── 9. Insert the order and order items inside a transaction ──
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO orders_order
                (customer_id, restaurant_id, address_id, status, total_amount,
                 delivery_charge, service_charge, discount_amount,
                 email, first_name, last_name,
                 phone_number, created_at, rider_tip)
            VALUES (%s, %s, %s, 'PENDING', %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
        """, [
            customer_id,
            restaurant_id,
            address_id,
            total_amount,
            delivery_charge,
            service_charge,
            discount_amount,
            customer_info.get('email'),
            customer_info.get('first_name'),
            customer_info.get('last_name'),
            customer_info.get('phone_number'),
            rider_tip,
        ])
        order_id = cursor.lastrowid

        for item in items:
            price_at_purchase = db_items_map[item['item_id']]['price']
            cursor.execute("""
                INSERT INTO orders_orderitem
                    (order_id, item_id, quantity, price_at_purchase)
                VALUES (%s, %s, %s, %s)
            """, [order_id, item['item_id'], item['quantity'], price_at_purchase])

    return {
        'order_id':        order_id,
        'discount_amount': float(discount_amount),
    }


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

def get_rider_orders(rider_id, status_filter=None):
    """
    Returns all orders assigned to this rider.
    Optionally filtered by status.
    Each order includes its items.
    """
    query = """
        SELECT
            o.order_id,
            o.status,
            o.total_amount,
            o.delivery_charge,
            o.service_charge,
            o.rider_tip,
            o.created_at,
            o.est_pickup,
            o.est_delivery,
            o.delivered_at,
            o.first_name        AS customer_first_name,
            o.last_name         AS customer_last_name,
            o.phone_number      AS customer_phone,
            r.name              AS restaurant_name,
            r.image_url         AS restaurant_image,
            ad.street_number,
            ad.apartment_number,
            ad.description      AS address_description,
            ad.latitude         AS delivery_lat,
            ad.longitude        AS delivery_lng
        FROM orders_order o
        LEFT JOIN resturants_restaurant r       ON r.id = o.restaurant_id
        LEFT JOIN addresses_deliveryaddress ad  ON ad.id = o.address_id
        WHERE o.rider_id = %s
    """
    params = [rider_id]
 
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
    order_ids    = [o['order_id'] for o in orders]
    placeholders = ', '.join(['%s'] * len(order_ids))
 
    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT
                oi.order_id,
                oi.quantity,
                oi.price_at_purchase,
                mi.name      AS item_name,
                mi.image     AS item_image
            FROM orders_orderitem oi
            LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
            WHERE oi.order_id IN ({placeholders})
        """, order_ids)
        all_items = dictfetchall(cursor)
 
    # ── Build Cloudinary URLs for item images ──
    for item in all_items:
        raw = item.get('item_image')
        item['item_image'] = CloudinaryImage(str(raw)).build_url() if raw else None
 
    # ── Group items by order_id and attach ──
    items_map = {}
    for item in all_items:
        oid = item.pop('order_id')
        items_map.setdefault(oid, []).append(item)
 
    for order in orders:
        order['items'] = items_map.get(order['order_id'], [])
 
    return orders
