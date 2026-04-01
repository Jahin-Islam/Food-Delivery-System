from django.db import connection


# These helpers already exist in your orders/services.py — re-declared here
# so reviews/services.py is self-contained.

def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None


# ─── Review Services ──────────────────────────────────────────────────────────

def get_review_by_order(order_id):
    """Fetch the review for a given order, or None if it does not exist."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                r.id          AS review_id,
                r.order_id,
                r.rating,
                r.comment,
                o.restaurant_id
            FROM reviews_review r
            INNER JOIN orders_order o ON o.order_id = r.order_id
            WHERE r.order_id = %s
        """, [order_id])
        return dictfetchone(cursor)


def get_review_by_id(review_id):
    """Fetch a single review by its PK."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                r.id          AS review_id,
                r.order_id,
                r.rating,
                r.comment,
                o.restaurant_id
            FROM reviews_review r
            INNER JOIN orders_order o ON o.order_id = r.order_id
            WHERE r.id = %s
        """, [review_id])
        return dictfetchone(cursor)


def get_reviews_by_restaurant(restaurant_id, limit=50, offset=0):
    """Fetch all reviews for a restaurant, newest first."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                r.id          AS review_id,
                r.order_id,
                r.rating,
                r.comment,
                o.customer_id,
                o.restaurant_id
            FROM reviews_review r
            INNER JOIN orders_order o ON o.order_id = r.order_id
            WHERE o.restaurant_id = %s
            ORDER BY r.id DESC
            LIMIT %s OFFSET %s
        """, [restaurant_id, limit, offset])
        return dictfetchall(cursor)


def order_is_delivered_and_belongs_to_customer(order_id, customer_id):
    """
    Returns True only when the order exists, belongs to this customer,
    and its status is DELIVERED.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*)
            FROM orders_order
            WHERE order_id    = %s
              AND customer_id = %s
              AND status      = 'DELIVERED'
        """, [order_id, customer_id])
        row = cursor.fetchone()
        return row[0] > 0 if row else False


def review_exists_for_order(order_id):
    """Check whether a review already exists for an order."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) FROM reviews_review WHERE order_id = %s",
            [order_id],
        )
        row = cursor.fetchone()
        return row[0] > 0 if row else False


def create_review(order_id, rating, comment):
    """
    Insert a new review row and return the newly created review dict.
    Uses cursor.lastrowid which is MySQL-native.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO reviews_review (order_id, rating, comment)
            VALUES (%s, %s, %s)
        """, [order_id, rating, comment])
        new_id = cursor.lastrowid

    _update_restaurant_rating_for_order(order_id)
    return get_review_by_id(new_id)


def update_review(review_id, rating, comment):
    """Update rating and comment of an existing review."""
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE reviews_review
               SET rating  = %s,
                   comment = %s
             WHERE id = %s
        """, [rating, comment, review_id])

    review = get_review_by_id(review_id)
    if review:
        _update_restaurant_rating_for_order(review["order_id"])
    return review


def _update_restaurant_rating_for_order(order_id):
    """
    Recalculate and persist the average rating + total_rated
    for the restaurant linked to this order.
    Pure raw SQL, MySQL-compatible UPDATE … INNER JOIN.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE resturants_restaurant res
            INNER JOIN (
                SELECT
                    o.restaurant_id,
                    AVG(r.rating)  AS avg_rating,
                    COUNT(r.id)    AS total_rated
                FROM reviews_review r
                INNER JOIN orders_order o ON o.order_id = r.order_id
                WHERE o.restaurant_id = (
                    SELECT restaurant_id FROM orders_order WHERE order_id = %s
                )
                GROUP BY o.restaurant_id
            ) agg ON agg.restaurant_id = res.id
            SET res.rating      = ROUND(agg.avg_rating, 2),
                res.total_rated = agg.total_rated
            WHERE res.id = agg.restaurant_id
        """, [order_id])