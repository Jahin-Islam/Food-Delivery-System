# customers/api/services.py
# COMPLETE FILE — replace your existing customers/api/services.py with this


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