from django.db import connection


def insert_customer(cursor, user_id):
    cursor.execute(
        """
        INSERT INTO customers_customer (user_id, wallet_balance)
        VALUES (%s, %s)
        """,
        [user_id, 0.00]
    )

def get_customer_id(user_id):
    with connection.cursor() as cursor:
        cursor.execute("SELECT fn_get_customer_id(%s)", [user_id])
        row = cursor.fetchone()
        
    return row[0] if row else None