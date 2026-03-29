# riders/api/services.py
# ─── CHANGES IN THIS FILE ────────────────────────────────────────────────────
#
#  FIX 1 – RIDER_VALID_TRANSITIONS now includes PENDING → PICKED_UP
#           Riders can accept a PENDING order (restaurant hasn't started yet)
#           and still be able to mark it PICKED_UP once they collect the food.
#
#  FIX 2 – get_nearby_orders()
#           • Distance is now calculated from the RESTAURANT location (not the
#             delivery address), so the rider sees "how far to go pick up".
#           • Returns restaurant_lat / restaurant_lng so RiderMap can place
#             the restaurant pin on the map.
#
#  FIX 3 – accept_order()  — NO STATUS CHANGE (unchanged from your version)
#           Only sets rider_id, est_pickup, est_delivery.  The order keeps
#           whatever status the restaurant set (PENDING or PREPARING).
#
# ─────────────────────────────────────────────────────────────────────────────

from django.db import connection
from addresses.api.services import insert_address
import cloudinary.uploader
from utility import dictfetchall
from exceptions import NotFoundError, ValidationError
import requests
from datetime import timedelta
from django.utils import timezone


# FIX 1: Added PENDING → PICKED_UP so a rider who accepted a PENDING order
# can still advance it to PICKED_UP when they collect the food.
RIDER_VALID_TRANSITIONS = {
    'PENDING':   ['PICKED_UP'],       # ← NEW
    'PREPARING': ['PICKED_UP'],
    'PICKED_UP': ['DELIVERED'],
}

VEHICLE_OSRM_PROFILE = {
    'BIKE':    'driving',
    'SCOOTER': 'driving',
    'CYCLE':   'cycling',
}
PICKUP_BUFFER_MINUTES   = 10
DELIVERY_BUFFER_MINUTES = 5


def get_route_duration(origin_lat, origin_lng, dest_lat, dest_lng, profile='cycling'):
    """
    Calls the OSRM Route API and returns the travel duration in seconds.
    Returns None if the request fails.
    NOTE: OSRM expects (longitude, latitude) — not (lat, lng)
    """
    url = (
        f"https://router.project-osrm.org/route/v1/{profile}/"
        f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        f"?overview=false"
    )

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get('code') == 'Ok' and data.get('routes'):
            print("route distance found")
            return data['routes'][0]['duration']

    except requests.RequestException:
        pass
    print("route distance didn't found")
    return None


def get_rider(user_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, current_latitude, current_longitude
            FROM riders_rider
            WHERE user_id = %s
        """, [user_id])
        row = cursor.fetchone()
    if not row:
        return None
    return {'id': row[0], 'latitude': row[1], 'longitude': row[2]}


def validate_rider_fields(data, files):
    """
    Checks all required rider text fields and both NID image files.
    Returns an error string on failure, or None if everything is fine.
    """
    required_text = [
        'vehicle', 'license_plate',
        'street_address', 'city',
        'nid_number', 'gender',
        'emergency_contact_name', 'emergency_contact_number',
    ]
    missing = [f for f in required_text if not str(data.get(f, '')).strip()]
    if missing:
        return f"Missing required rider fields: {', '.join(missing)}"

    if data.get('vehicle', '').upper() not in ['BIKE', 'CYCLE', 'SCOOTER']:
        return "vehicle must be one of: BIKE, CYCLE, SCOOTER"

    if 'nid_front' not in files:
        return "nid_front image is required for rider registration."
    if 'nid_back' not in files:
        return "nid_back image is required for rider registration."

    return None


def insert_rider(cursor, user_id, request):
    """
    Four inserts for a new rider (all on the same cursor / transaction):

        1. addresses_address                   — home address → address_id
        2. users_user (UPDATE address_id)      — link address to user row
        3. riders_rider                        — core profile  → rider_id
        4. [Cloudinary uploads]                — NID images    → public_ids
        5. riders_rider_additional_information — extra details

    FIX: latitude/longitude now default to 0.0 instead of None because
    addresses_address.latitude and addresses_address.longitude are NOT NULL
    columns. Passing None caused a MySQL constraint error and left address_id
    as NULL for riders who didn't pick a map location.
    """
    data  = request.data
    files = request.FILES

    # 1 ── Home address ───────────────────────────────────────────────────
    raw_lat = data.get('latitude')
    raw_lng = data.get('longitude')
    # FIX: default to 0.0 not None — latitude/longitude are NOT NULL in the table
    latitude  = float(raw_lat) if raw_lat else 0.0
    longitude = float(raw_lng) if raw_lng else 0.0

    address_id = insert_address(
        cursor,
        street_address = data.get('street_address', '').strip(),
        city           = data.get('city', '').strip(),
        latitude       = latitude,
        longitude      = longitude,
    )

    # 2 ── Link address to the user row ───────────────────────────────────
    cursor.execute(
        "UPDATE users_user SET address_id = %s WHERE id = %s",
        [address_id, user_id]
    )

    # 3 ── Core rider profile ─────────────────────────────────────────────
    cursor.execute(
        """
        INSERT INTO riders_rider
            (user_id, is_available, vehicle, license_plate,
                current_latitude, current_longitude, verfied)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        [
            user_id,
            0,
            data['vehicle'].upper(),
            data['license_plate'].strip(),
            None,
            None,
            0,   # verfied = 0 (pending review)
        ]
    )

    cursor.execute("SELECT LAST_INSERT_ID()")
    rider_row = cursor.fetchone()
    if not rider_row or not rider_row[0]:
        raise Exception("MySQL did not return a valid rider ID after INSERT.")
    rider_id = rider_row[0]

    # 4 ── Upload both NID images to Cloudinary ───────────────────────────
    try:
        front_result = cloudinary.uploader.upload(
            files['nid_front'],
            folder    = "media/riders/nid",
            public_id = f"riders_{rider_id}_nid_front",
            overwrite = True,
        )
        nid_front_public_id = front_result.get('public_id', '')
    except Exception as e:
        raise Exception(f"NID front image upload failed: {str(e)}")

    try:
        back_result = cloudinary.uploader.upload(
            files['nid_back'],
            folder    = "media/riders/nid",
            public_id = f"riders_{rider_id}_nid_back",
            overwrite = True,
        )
        nid_back_public_id = back_result.get('public_id', '')
    except Exception as e:
        raise Exception(f"NID back image upload failed: {str(e)}")

    # 5 ── Additional rider information ───────────────────────────────────
    wallet_balance = float(data.get('wallet_balance') or 0.00)

    cursor.execute(
        """
        INSERT INTO riders_rider_additional_information
            (rider_id, address_id, nid_front, nid_back, nid_number,
                wallet_balace, gender,
                emergency_contact_name, emergency_contact_number)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            rider_id,
            address_id,
            nid_front_public_id,
            nid_back_public_id,
            data['nid_number'].strip(),
            wallet_balance,
            data['gender'].strip(),
            data['emergency_contact_name'].strip(),
            data['emergency_contact_number'].strip(),
        ]
    )


def get_nearby_orders(rider_lat, rider_lng, radius_km=5):
    """
    Returns PENDING and PREPARING orders that have no rider yet,
    within radius_km of the rider.

    FIX 2: Distance is now calculated from the RESTAURANT's coordinates
    (not the delivery address) so the radius reflects how far the rider
    needs to travel to pick up the food.

    Also returns restaurant_lat / restaurant_lng so the frontend can
    place a proper map pin on the restaurant.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                o.order_id,
                o.status,
                o.total_amount,
                o.delivery_charge,
                o.created_at,
                o.first_name            AS customer_first_name,
                o.last_name             AS customer_last_name,
                o.phone_number          AS customer_phone,
                r.name                  AS restaurant_name,
                r.image_url             AS restaurant_image,
                res_addr.latitude       AS restaurant_lat,
                res_addr.longitude      AS restaurant_lng,
                ad.street_number,
                ad.apartment_number,
                ad.description          AS address_description,
                ad.latitude             AS delivery_lat,
                ad.longitude            AS delivery_lng,

                (
                    6371 * ACOS(
                        LEAST(1.0,
                            COS(RADIANS(%s))
                            * COS(RADIANS(res_addr.latitude))
                            * COS(RADIANS(res_addr.longitude) - RADIANS(%s))
                            + SIN(RADIANS(%s))
                            * SIN(RADIANS(res_addr.latitude))
                        )
                    )
                ) AS distance_km

            FROM orders_order o
            INNER JOIN resturants_restaurant r
                ON r.id = o.restaurant_id
            INNER JOIN addresses_address res_addr
                ON res_addr.address_id = r.address_id
               AND res_addr.latitude  IS NOT NULL
               AND res_addr.longitude IS NOT NULL
            LEFT JOIN addresses_deliveryaddress ad
                ON ad.id = o.address_id

            WHERE o.status IN ('PENDING', 'PREPARING')
              AND o.rider_id IS NULL

            HAVING distance_km <= %s

            ORDER BY distance_km ASC
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
                oi.price_at_purchase,
                mi.name      AS item_name,
                mi.image_url AS item_image
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
        order['items']       = items_map.get(order['order_id'], [])
        order['distance_km'] = round(order['distance_km'], 2)

    return orders


def get_rider_id(user_id):
    """Resolve auth user_id → rider.id. Returns None if no rider profile exists."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM riders_rider WHERE user_id = %s
        """, [user_id])
        row = cursor.fetchone()
    return row[0] if row else None


def update_order_status_by_rider(order_id, rider_id, new_status):
    """
    A rider can only update orders that are assigned to them.

    Valid transitions (FIX 1 — PENDING added):
        PENDING    → PICKED_UP
        PREPARING  → PICKED_UP
        PICKED_UP  → DELIVERED  (also stamps delivered_at = NOW())
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT status FROM orders_order
            WHERE order_id = %s AND rider_id = %s
        """, [order_id, rider_id])
        row = cursor.fetchone()

    if not row:
        raise NotFoundError("Order not found or is not assigned to you.")

    current_status = row[0]

    allowed = RIDER_VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValidationError(
            f"Cannot transition order from '{current_status}' to '{new_status}'. "
            f"Allowed transitions: {allowed if allowed else 'none (terminal status)'}."
        )

    if new_status == 'DELIVERED':
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE orders_order
                SET status       = %s,
                    delivered_at = NOW()
                WHERE order_id = %s
            """, [new_status, order_id])
    else:
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE orders_order
                SET status = %s
                WHERE order_id = %s
            """, [new_status, order_id])


def accept_order(order_id, rider_id):
    """
    Assigns a rider to a PENDING or PREPARING order that has no rider yet.
    Calculates est_pickup and est_delivery using OSRM real street routing.

    Does NOT change the order status — it stays PENDING or PREPARING
    exactly as the restaurant set it.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                o.status,
                o.rider_id,
                r.address_id,
                res_addr.latitude   AS restaurant_lat,
                res_addr.longitude  AS restaurant_lng,
                del_addr.latitude   AS delivery_lat,
                del_addr.longitude  AS delivery_lng,
                ri.current_latitude  AS rider_lat,
                ri.current_longitude AS rider_lng,
                ri.vehicle
            FROM orders_order o
            LEFT JOIN resturants_restaurant r        ON r.id = o.restaurant_id
            LEFT JOIN addresses_address res_addr     ON res_addr.address_id = r.address_id
            LEFT JOIN addresses_deliveryaddress del_addr ON del_addr.id = o.address_id
            LEFT JOIN riders_rider ri                ON ri.id = %s
            WHERE o.order_id = %s
        """, [rider_id, order_id])
        row = cursor.fetchone()

    if not row:
        raise NotFoundError("Order not found.")

    (
        current_status, current_rider_id,
        restaurant_address_id,
        restaurant_lat, restaurant_lng,
        delivery_lat, delivery_lng,
        rider_lat, rider_lng,
        vehicle
    ) = row

    if current_rider_id is not None:
        raise ValidationError("This order has already been accepted by another rider.")

    if current_status not in ('PENDING', 'PREPARING'):
        raise ValidationError(
            f"Order cannot be accepted because its current status is '{current_status}'."
        )

    now          = timezone.now()
    est_pickup   = None
    est_delivery = None

    osrm_profile = VEHICLE_OSRM_PROFILE.get(vehicle, 'cycling')

    if rider_lat and rider_lng and restaurant_lat and restaurant_lng:
        leg1_seconds = get_route_duration(
            rider_lat, rider_lng,
            restaurant_lat, restaurant_lng,
            profile=osrm_profile,
        )
        if leg1_seconds is not None:
            est_pickup = now + timedelta(seconds=leg1_seconds) + timedelta(minutes=PICKUP_BUFFER_MINUTES)

            if delivery_lat and delivery_lng:
                leg2_seconds = get_route_duration(
                    restaurant_lat, restaurant_lng,
                    delivery_lat, delivery_lng,
                    profile=osrm_profile,
                )
                if leg2_seconds is not None:
                    est_delivery = est_pickup + timedelta(seconds=leg2_seconds) + timedelta(minutes=DELIVERY_BUFFER_MINUTES)

    # Only set rider_id and ETA fields — status is intentionally NOT touched
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE orders_order
            SET
                rider_id     = %s,
                est_pickup   = %s,
                est_delivery = %s
            WHERE order_id = %s AND rider_id IS NULL
        """, [rider_id, est_pickup, est_delivery, order_id])

        if cursor.rowcount == 0:
            raise ValidationError("This order was just accepted by another rider.")