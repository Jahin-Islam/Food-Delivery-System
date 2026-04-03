from django.shortcuts import render
from django.db import connection, transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation
from exceptions import ValidationError, NotFoundError
from cloudinary import CloudinaryImage

# ─── TRANSITION RULES ─────────────────────────────────────────────────────────
# Restaurant can move: PENDING → PREPARING or CANCELLED
# Restaurant CANNOT jump past PREPARING (rider handles PICKED_UP / DELIVERED)
RESTAURANT_VALID_TRANSITIONS = {
    'PENDING':   ['PREPARING', 'CANCELLED'],
    'PREPARING': ['CANCELLED'],  # restaurant can still cancel while cooking
}

# ─── HELPERS ──────────────────────────────────────────────────────────────────
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

    try:
        delivery_charge = Decimal(str(data.get('delivery_charge', 0)))
        service_charge  = Decimal(str(data.get('service_charge', 0)))
        rider_tip       = Decimal(str(data.get('rider_tip', 0)))
        if delivery_charge < 0 or service_charge < 0:
            raise ValueError()
    except (InvalidOperation, ValueError):
        raise ValidationError("delivery_charge and service_charge must be non-negative numbers.")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM addresses_deliveryaddress
            WHERE id = %s AND customer_id = %s
        """, [address_id, customer_id])
        if not cursor.fetchone():
            raise NotFoundError("Address not found or does not belong to you.")

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
        if int(item['restaurant_id']) != int(restaurant_id):
            raise ValidationError(f"Item {item['food_id']} does not belong to this restaurant.")

    items_subtotal = sum(
        Decimal(str(db_items_map[item['item_id']]['price'])) * item['quantity']
        for item in items
    )

    discount_amount = Decimal('0')
    discount_num    = data.get('discount_num')

    if discount_num:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT percentage, min_order, is_active
                FROM resturants_discount
                WHERE resturant_id = %s AND discount_num = %s
            """, [restaurant_id, discount_num])
            discount_row = cursor.fetchone()

        if discount_row:
            percentage, min_order, is_active = discount_row
            if is_active and (min_order is None or items_subtotal >= Decimal(str(min_order))):
                discount_amount = (items_subtotal * Decimal(str(percentage)) / 100).quantize(Decimal('0.01'))

    total_amount = items_subtotal + delivery_charge + service_charge + rider_tip - discount_amount

    email        = data.get('email', '')
    first_name   = data.get('first_name', '')
    last_name    = data.get('last_name', '')
    phone_number = data.get('phone_number', '')

    # Inside create_order(), replace the transaction.atomic() INSERT block:
    with transaction.atomic():
        with connection.cursor() as cursor:
            # Call stored procedure to insert the order atomically
            cursor.execute("""
                CALL sp_place_order(
                    %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    @order_id
                )
            """, [
                restaurant_id, customer_id, address_id,
                total_amount, discount_amount, delivery_charge,
                service_charge, rider_tip,
                email, first_name, last_name, phone_number,
            ])
            cursor.execute("SELECT @order_id")
            order_id = cursor.fetchone()[0]

        with connection.cursor() as cursor:
            for item in items:
                cursor.execute("""
                    INSERT INTO orders_orderitem (order_id, item_id, quantity, price_at_purchase)
                    VALUES (%s, %s, %s, %s)
                """, [
                    order_id,
                    item['item_id'],
                    item['quantity'],
                    db_items_map[item['item_id']]['price'],
                ])

    return {'order_id': order_id, 'discount_amount': float(discount_amount)}


def get_restaurant_orders(restaurant_id, status_filter=None):
    query = """
        SELECT
            o.order_id,
            o.status,
            o.total_amount,
            o.discount_amount,
            o.delivery_charge,
            o.service_charge,
            o.rider_tip,
            o.created_at,
            o.first_name,
            o.last_name,
            o.phone_number,
            o.email,
            u.first_name    AS rider_first_name,
            u.last_name     AS rider_last_name
        FROM orders_order o
        LEFT JOIN riders_rider ri ON ri.id = o.rider_id
        LEFT JOIN users_user u   ON u.id  = ri.user_id
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

    order_ids    = [o['order_id'] for o in orders]
    placeholders = ', '.join(['%s'] * len(order_ids))

    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT
                oi.order_id,
                oi.id,
                oi.quantity,
                oi.price_at_purchase,
                mi.name      AS item_name,
                mi.image     AS item_image
            FROM orders_orderitem oi
            LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
            WHERE oi.order_id IN ({placeholders})
        """, order_ids)
        all_items = dictfetchall(cursor)

    for item in all_items:
        raw = item.get('item_image')
        try:
            item['item_image'] = CloudinaryImage(str(raw)).build_url() if raw else None
        except Exception:
            item['item_image'] = None

    items_map = {}
    for item in all_items:
        order_id = item.pop('order_id')
        items_map.setdefault(order_id, []).append(item)

    for order in orders:
        order['items'] = items_map.get(order['order_id'], [])

    return orders


def update_order_status_by_restaurant(order_id, restaurant_id, new_status):
    """
    Validates ownership, validates transition, updates status.
    Also clears rider_id when CANCELLED so the rider's dashboard
    reflects the cancellation immediately.
    Raises ValueError on any failure.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT status FROM orders_order
            WHERE order_id = %s AND restaurant_id = %s
        """, [order_id, restaurant_id])
        row = cursor.fetchone()

    if not row:
        raise ValueError("Order not found or does not belong to your restaurant.")

    current_status = row[0]

    allowed = RESTAURANT_VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValueError(
            f"Cannot transition order from '{current_status}' to '{new_status}'. "
            f"Allowed transitions: {allowed}"
        )

    # FIX: when cancelling, also clear rider_id so rider dashboard updates
    if new_status == 'CANCELLED':
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE orders_order
                SET status = %s, rider_id = NULL
                WHERE order_id = %s
            """, [new_status, order_id])
    else:
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE orders_order
                SET status = %s
                WHERE order_id = %s
            """, [new_status, order_id])


def cancel_order(order_id, cancelled_by='restaurant'):
    with connection.cursor() as cursor:
        cursor.execute("""
            CALL sp_cancel_order(%s, @success, @message)
        """, [order_id])
        cursor.execute("SELECT @success, @message")
        row = cursor.fetchone()

    success, message = row[0], row[1]
    if not success:
        raise ValueError(message)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT order_id, status, rider_id FROM orders_order WHERE order_id = %s",
            [order_id]
        )
        return dictfetchone(cursor)


# ─── FIX: Nearby orders — ONLY show PREPARING orders to riders ────────────────
# Before: no status filter → riders saw PENDING orders before restaurant accepted
# After:  WHERE status = 'PREPARING' AND rider_id IS NULL
def get_nearby_orders(rider_lat, rider_lng, radius_km=50):
    """
    Return orders that are PREPARING (restaurant accepted) and have no rider yet.
    Riders must NOT see PENDING orders — the restaurant hasn't confirmed those yet.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                o.order_id,
                o.status,
                o.total_amount,
                o.delivery_charge,
                o.rider_tip,
                o.created_at,
                o.first_name        AS customer_first_name,
                o.last_name         AS customer_last_name,
                o.phone_number      AS customer_phone,
                r.name              AS restaurant_name,
                res_addr.street_address AS restaurant_address,
                res_addr.latitude   AS restaurant_lat,
                res_addr.longitude  AS restaurant_lng,
                da.street_number,
                da.apartment_number,
                da.description      AS address_description,
                da.latitude         AS delivery_lat,
                da.longitude        AS delivery_lng,
                (
                    6371 * ACOS(
                        COS(RADIANS(%s)) * COS(RADIANS(res_addr.latitude))
                        * COS(RADIANS(res_addr.longitude) - RADIANS(%s))
                        + SIN(RADIANS(%s)) * SIN(RADIANS(res_addr.latitude))
                    )
                ) AS distance_km
            FROM orders_order o
            INNER JOIN resturants_restaurant r       ON r.id    = o.restaurant_id
            LEFT  JOIN addresses_address res_addr    ON res_addr.address_id = r.address_id
            LEFT  JOIN addresses_deliveryaddress da  ON da.id   = o.address_id
            WHERE
                o.status    = 'PREPARING'
                AND o.rider_id IS NULL
                AND res_addr.latitude  IS NOT NULL
                AND res_addr.longitude IS NOT NULL
            HAVING distance_km <= %s
            ORDER BY distance_km ASC
            LIMIT 30
        """, [rider_lat, rider_lng, rider_lat, radius_km])
        orders = dictfetchall(cursor)

    if not orders:
        return []

    order_ids    = [o['order_id'] for o in orders]
    placeholders = ', '.join(['%s'] * len(order_ids))

    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT
                oi.order_id,
                oi.quantity,
                mi.name AS item_name
            FROM orders_orderitem oi
            LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
            WHERE oi.order_id IN ({placeholders})
        """, order_ids)
        all_items = dictfetchall(cursor)

    items_map = {}
    for item in all_items:
        oid = item.pop('order_id')
        items_map.setdefault(oid, []).append(item)

    for order in orders:
        order['items'] = items_map.get(order['order_id'], [])

    return orders


# ─── FIX: Rider accepts order — guarded transition ────────────────────────────
# Before: no guard — rider could accept a PENDING or already-taken order
# After:  SELECT FOR UPDATE + raises ValueError for invalid states
def accept_order(order_id, rider_id):
    """
    Assign this rider to an order.
    ONLY allowed when status = PREPARING and rider_id is still NULL.
    Uses SELECT FOR UPDATE to prevent two riders grabbing the same order.

    rider_id here is the AUTH USER id — we resolve to riders_rider.id inside.

    Raises:
        ValueError  – order not found, wrong status, or already taken
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT status, rider_id
                FROM orders_order
                WHERE order_id = %s
                FOR UPDATE
            """, [order_id])
            row = cursor.fetchone()

        if not row:
            raise ValueError("Order not found.")

        current_status, current_rider = row

        # FIX: gate on PREPARING — restaurant must have accepted first
        if current_status != 'PREPARING':
            if current_status == 'PENDING':
                raise ValueError(
                    "Restaurant hasn't accepted this order yet. "
                    "Please wait until it moves to PREPARING."
                )
            elif current_status == 'CANCELLED':
                raise ValueError("This order has been cancelled.")
            else:
                raise ValueError(
                    f"Cannot accept order in status '{current_status}'."
                )

        if current_rider is not None:
            raise ValueError("Another rider has already accepted this order.")

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE orders_order
                SET rider_id = (
                    SELECT id FROM riders_rider WHERE user_id = %s LIMIT 1
                )
                WHERE order_id = %s
            """, [rider_id, order_id])

    # Return the updated order detail
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                o.order_id, o.status, o.total_amount,
                o.delivery_charge, o.rider_tip,
                o.first_name AS customer_first_name,
                o.last_name  AS customer_last_name,
                o.phone_number AS customer_phone,
                r.name       AS restaurant_name,
                res_addr.street_address AS restaurant_address,
                res_addr.latitude  AS restaurant_lat,
                res_addr.longitude AS restaurant_lng,
                da.street_number, da.apartment_number, da.description AS address_description,
                da.latitude  AS delivery_lat,
                da.longitude AS delivery_lng
            FROM orders_order o
            LEFT JOIN resturants_restaurant     r        ON r.id  = o.restaurant_id
            LEFT JOIN addresses_address         res_addr ON res_addr.address_id = r.address_id
            LEFT JOIN addresses_deliveryaddress da       ON da.id = o.address_id
            WHERE o.order_id = %s
        """, [order_id])
        return dictfetchone(cursor)


def get_rider_orders(rider_id, status_filter=None):
    """
    Returns all orders assigned to this rider, optionally filtered by status.
    Each order includes its items, restaurant coordinates, and delivery coords.
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
            res_addr.latitude   AS restaurant_lat,
            res_addr.longitude  AS restaurant_lng,
            ad.street_number,
            ad.apartment_number,
            ad.description      AS address_description,
            ad.latitude         AS delivery_lat,
            ad.longitude        AS delivery_lng
        FROM orders_order o
        LEFT JOIN resturants_restaurant r          ON r.id = o.restaurant_id
        LEFT JOIN addresses_address res_addr       ON res_addr.address_id = r.address_id
        LEFT JOIN addresses_deliveryaddress ad     ON ad.id = o.address_id
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

    for item in all_items:
        raw = item.get('item_image')
        item['item_image'] = CloudinaryImage(str(raw)).build_url() if raw else None

    items_map = {}
    for item in all_items:
        oid = item.pop('order_id')
        items_map.setdefault(oid, []).append(item)

    for order in orders:
        order['items'] = items_map.get(order['order_id'], [])

    return orders


def update_order_status_by_rider(order_id, rider_id, new_status):
    ALLOWED_TRANSITIONS = {
        'PREPARING': 'PICKED_UP',
        'PICKED_UP': 'DELIVERED',
    }

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT o.status
            FROM orders_order o
            INNER JOIN riders_rider ri ON ri.id = o.rider_id
            WHERE o.order_id = %s AND ri.id = %s
        """, [order_id, rider_id])
        row = cursor.fetchone()

    if not row:
        raise NotFoundError("Order not found or not assigned to you.")

    current_status = row[0]
    expected_next  = ALLOWED_TRANSITIONS.get(current_status)

    if new_status != expected_next:
        raise ValidationError(
            f"Cannot move from {current_status} to {new_status}. "
            f"Expected next status: {expected_next}."
        )

    # Single UPDATE for all statuses — trg_set_delivered_at handles
    # delivered_at = NOW() automatically when status = 'DELIVERED'
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE orders_order
            SET status = %s
            WHERE order_id = %s
        """, [new_status, order_id])


def get_restaurant_order_history(restaurant_id, status_filter=None, date_from=None, date_to=None, limit=50, offset=0):
    HISTORY_STATUSES = ('DELIVERED', 'CANCELLED')

    conditions = ["o.restaurant_id = %s"]
    params = [restaurant_id]

    if status_filter and status_filter in HISTORY_STATUSES:
        conditions.append("o.status = %s")
        params.append(status_filter)
    else:
        conditions.append("o.status IN ('DELIVERED', 'CANCELLED')")

    if date_from:
        conditions.append("DATE(o.created_at) >= %s")
        params.append(date_from)

    if date_to:
        conditions.append("DATE(o.created_at) <= %s")
        params.append(date_to)

    where_clause = " AND ".join(conditions)

    count_sql = f"""
        SELECT COUNT(*)
        FROM orders_order o
        WHERE {where_clause}
    """

    orders_sql = f"""
        SELECT
            o.order_id,
            o.status,
            o.total_amount,
            o.discount_amount,
            o.delivery_charge,
            o.service_charge,
            o.rider_tip,
            o.created_at,
            o.delivered_at,
            o.first_name,
            o.last_name,
            o.email,
            o.phone_number,
            addr.street_address  AS delivery_address,
            addr.city            AS delivery_city,
            COUNT(oi.id)         AS item_count,
            SUM(oi.quantity)     AS total_quantity
        FROM orders_order o
        LEFT JOIN addresses_address addr ON addr.address_id = o.address_id
        LEFT JOIN orders_orderitem oi   ON oi.order_id = o.order_id
        WHERE {where_clause}
        GROUP BY
            o.order_id, o.status, o.total_amount, o.discount_amount,
            o.delivery_charge, o.service_charge, o.rider_tip,
            o.created_at, o.delivered_at,
            o.first_name, o.last_name, o.email, o.phone_number,
            addr.street_address, addr.city
        ORDER BY o.created_at DESC
        LIMIT %s OFFSET %s
    """

    with connection.cursor() as cursor:
        cursor.execute(count_sql, params)
        total_count = cursor.fetchone()[0]

        cursor.execute(orders_sql, params + [limit, offset])
        orders = dictfetchall(cursor)

    for order in orders:
        for field in ('total_amount', 'discount_amount', 'delivery_charge',
                      'service_charge', 'rider_tip'):
            if order[field] is not None:
                order[field] = float(order[field])
        for field in ('created_at', 'delivered_at'):
            if order[field] is not None:
                order[field] = order[field].isoformat()

    return {
        "count":   total_count,
        "limit":   limit,
        "offset":  offset,
        "orders":  orders,
    }


def get_history_order_items(order_id):
    sql = """
        SELECT
            oi.id,
            oi.quantity,
            oi.price_at_purchase,
            mi.food_id,
            mi.name      AS item_name,
            mi.image     AS item_image
        FROM orders_orderitem oi
        LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
        WHERE oi.order_id = %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [order_id])
        items = dictfetchall(cursor)

    for item in items:
        if item['price_at_purchase'] is not None:
            item['price_at_purchase'] = float(item['price_at_purchase'])

    return items


def get_restaurant_order_history_stats(restaurant_id):
    sql = """
        SELECT
            COUNT(*)                                        AS total_orders,
            SUM(CASE WHEN status = 'DELIVERED'  THEN 1 ELSE 0 END) AS delivered_count,
            SUM(CASE WHEN status = 'CANCELLED'  THEN 1 ELSE 0 END) AS cancelled_count,
            COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total_amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(AVG(CASE WHEN status = 'DELIVERED' THEN total_amount END), 0)        AS avg_order_value
        FROM orders_order
        WHERE restaurant_id = %s
          AND status IN ('DELIVERED', 'CANCELLED')
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [restaurant_id])
        row = cursor.fetchone()
        if not row:
            return {
                "total_orders": 0, "delivered_count": 0, "cancelled_count": 0,
                "total_revenue": 0.0, "avg_order_value": 0.0,
            }
        columns = [col[0] for col in cursor.description]
        stats = dict(zip(columns, row))

    for field in ('total_revenue', 'avg_order_value'):
        stats[field] = float(stats[field] or 0)

    return stats