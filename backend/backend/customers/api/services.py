# customers/api/services.py
# COMPLETE FILE — replace your existing customers/api/services.py with this
from django.db import connection


def insert_customer(cursor, user_id):
    """
    Insert a customers_customer row with zero wallet balance.
    MySQL DECIMAL columns accept Python floats/Decimal directly.

    NOTE: customers_customer has no address_id column.
    Customer delivery addresses are stored in addresses_deliveryaddress
    and chosen at checkout — not at signup.
    """
    cursor.execute(
        """
        INSERT INTO customers_customer (user_id, wallet_balance)
        VALUES (%s, %s)
        """,
        [user_id, 0.00]
    )

def get_customer_id(user_id):
    """Resolve auth user_id → customer.id using the SQL function."""
    with connection.cursor() as cursor:
        # Call the custom SQL function
        cursor.execute("SELECT fn_get_customer_id(%s)", [user_id])
        row = cursor.fetchone()
        
    # row[0] will be the ID or None (since the function defaults to NULL)
    return row[0] if row else None