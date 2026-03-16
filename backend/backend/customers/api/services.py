def insert_customer(cursor, user_id):
    """
    Insert a customers_customer row with zero wallet balance.
    MySQL DECIMAL columns accept Python floats/Decimal directly.
    """
    cursor.execute(
        """
        INSERT INTO customers_customer (user_id, wallet_balance)
        VALUES (%s, %s)
        """,
        [user_id, 0.00]
    )