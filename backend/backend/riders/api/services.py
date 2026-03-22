from django.db import connection
from addresses.api.services import insert_address
import cloudinary.uploader
from utility import dictfetchall
from exceptions import NotFoundError,ValidationError
import requests
from datetime import timedelta
from django.utils import timezone


RIDER_VALID_TRANSITIONS = {
    'PREPARING': ['PICKED_UP'],
    'PICKED_UP': ['DELIVERED'],
}

VEHICLE_OSRM_PROFILE = {
    'BIKE':    'driving',   # motorbike follows road/car profile
    'SCOOTER': 'driving',   # scooter also follows road profile
    'CYCLE':   'cycling',   # bicycle gets the cycling profile
}
PICKUP_BUFFER_MINUTES  = 10   # time for restaurant to prepare + rider to arrive
DELIVERY_BUFFER_MINUTES = 5

def get_route_duration(origin_lat, origin_lng, dest_lat, dest_lng, profile='cycling'):
    """
    Calls the OSRM Route API and returns the travel duration in seconds
    for the fastest route between two coordinates using real street network.
 
    Args:
        origin_lat, origin_lng  : start point (rider or restaurant)
        dest_lat,   dest_lng    : end point
        profile (str)           : 'driving' | 'cycling' | 'foot'
 
    Returns:
        float: duration in seconds, or None if the request fails.
 
    OSRM URL format:
        /route/v1/{profile}/{lng1},{lat1};{lng2},{lat2}
        NOTE: OSRM expects (longitude, latitude) — not (lat, lng)
    """
    url = (
        f"https://router.project-osrm.org/route/v1/{profile}/"
        f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        f"?overview=false"           # we only need duration, not geometry
    )
 
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
 
        if data.get('code') == 'Ok' and data.get('routes'):
            print("route distance found")
            return data['routes'][0]['duration']   # seconds (float)
 
    except requests.RequestException:
        pass   # fall through to return None
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
        All validation happens here — before any DB or Cloudinary call.
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

    MySQL note: every PK is read with LAST_INSERT_ID() immediately
    after its INSERT, which is the correct MySQL pattern.
    """
    data  = request.data
    files = request.FILES

    # 1 ── Home address ───────────────────────────────────────────────────
    # insert_address() uses LAST_INSERT_ID() internally — MySQL-safe.
    # Pass None for optional lat/lng so MySQL stores NULL, not the string "None".
    raw_lat = data.get('latitude')
    raw_lng = data.get('longitude')
    latitude  = float(raw_lat) if raw_lat else None
    longitude = float(raw_lng) if raw_lng else None

    address_id = insert_address(
        cursor,
        street_address = data.get('street_address', '').strip(),
        city           = data.get('city', '').strip(),
        latitude       = latitude,
        longitude      = longitude,
    )

    # 2 ── Link address to the user row ───────────────────────────────────
    # users_user.address_id is a OneToOneField FK in the User model.
    cursor.execute(
        "UPDATE users_user SET address_id = %s WHERE id = %s",
        [address_id, user_id]
    )

    # 3 ── Core rider profile ─────────────────────────────────────────────
    # is_available = 0  (TINYINT — rider starts offline)
    # current_latitude / current_longitude = NULL  (set live by the app)
    cursor.execute(
        """
        INSERT INTO riders_rider
            (user_id, is_available, vehicle, license_plate,
                current_latitude, current_longitude)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        [
            user_id,
            0,
            data['vehicle'].upper(),
            data['license_plate'].strip(),
            None,
            None,
        ]
    )

    # Read new rider_id with LAST_INSERT_ID() — MySQL-safe, no SELECT needed
    cursor.execute("SELECT LAST_INSERT_ID()")
    rider_row = cursor.fetchone()
    if not rider_row or not rider_row[0]:
        raise Exception("MySQL did not return a valid rider ID after INSERT.")
    rider_id = rider_row[0]

    # 4 ── Upload both NID images to Cloudinary ───────────────────────────
    # We upload BEFORE the final DB insert so that if Cloudinary fails,
    # the whole transaction rolls back and no orphan DB rows are left.
    #
    # Folder  : media/riders/nid
    # public_id format matches the rest of the project:
    #   media/riders/nid/riders_<rider_id>_nid_front
    #   media/riders/nid/riders_<rider_id>_nid_back
    #
    # Only the public_id string is stored in the DB column (same as
    # menu item images elsewhere in the project).
    try:
        front_result  = cloudinary.uploader.upload(
            files['nid_front'],
            folder    = "media/riders/nid",
            public_id = f"riders_{rider_id}_nid_front",
            overwrite = True,
        )
        nid_front_public_id = front_result.get('public_id', '')
    except Exception as e:
        raise Exception(f"NID front image upload failed: {str(e)}")

    try:
        back_result   = cloudinary.uploader.upload(
            files['nid_back'],
            folder    = "media/riders/nid",
            public_id = f"riders_{rider_id}_nid_back",
            overwrite = True,
        )
        nid_back_public_id = back_result.get('public_id', '')
    except Exception as e:
        raise Exception(f"NID back image upload failed: {str(e)}")

    # 5 ── Additional rider information ───────────────────────────────────
    # wallet_balace (sic) matches the typo in the model definition.
    # MySQL DECIMAL accepts Python float — no cast needed.
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

"""
Add get_nearby_orders() to your orders/services.py
Add NearbyOrdersView to your orders/views.py (or urls.py)
"""

def get_nearby_orders(rider_lat, rider_lng, radius_km=5):
    """
    Returns PENDING and PREPARING orders whose delivery address falls
    within `radius_km` kilometres of the rider's current position.

    Distance is calculated with the Haversine formula entirely inside SQL,
    so no extra Python loop is needed.

    Args:
        rider_lat  (float): Rider's current latitude.
        rider_lng  (float): Rider's current longitude.
        radius_km  (float): Search radius in kilometres (default 5 km).

    Returns:
        list[dict]: Each dict contains order info + computed distance_km.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                o.order_id,
                o.status,
                o.total_amount,
                o.delivery_charge,
                o.created_at,
                o.first_name,
                o.last_name,
                o.phone_number,
                r.name          AS restaurant_name,
                r.image_url     AS restaurant_image,
                r.address_id    AS restaurant_address_id,
                ad.street_number,
                ad.apartment_number,
                ad.description  AS address_description,
                ad.latitude     AS delivery_lat,
                ad.longitude    AS delivery_lng,

                /* ── Haversine formula (result in km) ── */
                (
                    6371 * ACOS(
                        LEAST(1.0, COS(RADIANS(%s))
                        * COS(RADIANS(ad.latitude))
                        * COS(RADIANS(ad.longitude) - RADIANS(%s))
                        + SIN(RADIANS(%s))
                        * SIN(RADIANS(ad.latitude)))
                    )
                ) AS distance_km

            FROM orders_order o
            INNER JOIN addresses_deliveryaddress ad
                ON ad.id = o.address_id
               AND ad.latitude  IS NOT NULL
               AND ad.longitude IS NOT NULL
            LEFT JOIN resturants_restaurant r
                ON r.id = o.restaurant_id

            WHERE o.status IN ('PENDING', 'PREPARING')
              AND o.rider_id IS NULL          /* not yet claimed by another rider */

            HAVING distance_km <= %s

            ORDER BY distance_km ASC
        """, [rider_lat, rider_lng, rider_lat, radius_km])

        orders = dictfetchall(cursor)

    if not orders:
        return []

    # ── Attach order items in a single follow-up query ──
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
        order['items'] = items_map.get(order['order_id'], [])
        # Round for cleaner API output
        order['distance_km'] = round(order['distance_km'], 2)

    return orders

# ─────────────────────────────────────────────
# services.py  —  add this function
# ─────────────────────────────────────────────



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
    Valid transitions:
        PREPARING  → PICKED_UP
        PICKED_UP  → DELIVERED   (also stamps delivered_at = NOW())

    Raises:
        NotFoundError   – order doesn't exist or isn't assigned to this rider
        ValidationError – transition is not allowed
    """

    # ── 1. Fetch the order and verify it is assigned to this rider ──
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT status FROM orders_order
            WHERE order_id = %s AND rider_id = %s
        """, [order_id, rider_id])
        row = cursor.fetchone()

    if not row:
        raise NotFoundError("Order not found or is not assigned to you.")

    current_status = row[0]

    # ── 2. Validate the transition ──
    allowed = RIDER_VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValidationError(
            f"Cannot transition order from '{current_status}' to '{new_status}'. "
            f"Allowed transitions: {allowed if allowed else 'none (terminal status)'}."
        )

    # ── 3. Update — stamp delivered_at only when marking DELIVERED ──
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


# ─────────────────────────────────────────────
# services.py  —  add this function
# ─────────────────────────────────────────────

def accept_order(order_id, rider_id):
    """
    Assigns a rider to a PENDING or PREPARING order that has no rider yet.
    Also calculates and sets est_pickup and est_delivery using OSRM real
    street routing, taking the rider's vehicle type into account.
 
    Timeline:
        now
         └─[rider → restaurant]──► est_pickup   (+ PICKUP_BUFFER_MINUTES)
                └─[restaurant → delivery address]──► est_delivery (+ DELIVERY_BUFFER_MINUTES)
 
    Raises:
        NotFoundError   – order doesn't exist
        ValidationError – order already has a rider, or status is not acceptable
    """
 
    # ── 1. Fetch the order + all coordinates we need ─────────────────────
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
            LEFT JOIN resturants_restaurant r       ON r.id = o.restaurant_id
            LEFT JOIN addresses_address res_addr    ON res_addr.address_id = r.address_id
            LEFT JOIN addresses_deliveryaddress del_addr ON del_addr.id = o.address_id
            LEFT JOIN riders_rider ri               ON ri.id = %s
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
 
    # ── 2. Guard: already claimed ────────────────────────────────────────
    if current_rider_id is not None:
        raise ValidationError("This order has already been accepted by another rider.")
 
    # ── 3. Guard: wrong status ───────────────────────────────────────────
    if current_status not in ('PENDING', 'PREPARING'):
        raise ValidationError(
            f"Order cannot be accepted because its current status is '{current_status}'."
        )
 
    # ── 4. Calculate est_pickup and est_delivery via OSRM ────────────────
    now             = timezone.now()
    est_pickup      = None
    est_delivery    = None
 
    osrm_profile = VEHICLE_OSRM_PROFILE.get(vehicle, 'cycling')
 
    # Leg 1: rider's current location → restaurant
    if rider_lat and rider_lng and restaurant_lat and restaurant_lng:
        leg1_seconds = get_route_duration(
            rider_lat, rider_lng,
            restaurant_lat, restaurant_lng,
            profile=osrm_profile,
        )
        if leg1_seconds is not None:
            est_pickup = now + timedelta(seconds=leg1_seconds) + timedelta(minutes=PICKUP_BUFFER_MINUTES)
 
            # Leg 2: restaurant → delivery address
            if delivery_lat and delivery_lng:
                leg2_seconds = get_route_duration(
                    restaurant_lat, restaurant_lng,
                    delivery_lat, delivery_lng,
                    profile=osrm_profile,
                )
                if leg2_seconds is not None:
                    est_delivery = est_pickup + timedelta(seconds=leg2_seconds) + timedelta(minutes=DELIVERY_BUFFER_MINUTES)
 
    # ── 5. Assign rider + stamp estimates atomically ─────────────────────
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE orders_order
            SET
                rider_id    = %s,
                est_pickup  = %s,
                est_delivery = %s
            WHERE order_id = %s AND rider_id IS NULL
        """, [rider_id, est_pickup, est_delivery, order_id])
 
        if cursor.rowcount == 0:
            # Another rider slipped in between our check and update (race condition)
            raise ValidationError("This order was just accepted by another rider.")



# ─────────────────────────────────────────────
# views.py  —  add this view
# ─────────────────────────────────────────────




# ─────────────────────────────────────────────
# urls.py  —  register the endpoint
# ─────────────────────────────────────────────

# from django.urls import path
# from .views import RiderAcceptOrderView
#
# urlpatterns = [
#     ...
#     path('<int:order_id>/accept/', RiderAcceptOrderView.as_view(), name='rider-accept-order'),
# ]


# ─────────────────────────────────────────────
# views.py  —  add this view
# ─────────────────────────────────────────────




# ─────────────────────────────────────────────
# urls.py  —  register the endpoint
# ─────────────────────────────────────────────

# from django.urls import path
# from .views import RiderUpdateOrderStatusView
#
# urlpatterns = [
#     ...
#     path('<int:order_id>/rider-status/', RiderUpdateOrderStatusView.as_view(), name='rider-update-order-status'),
# ]