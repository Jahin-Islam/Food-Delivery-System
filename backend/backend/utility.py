def dictfetchall(cursor):
        """
        Helper function to convert raw SQL rows into a list of dictionaries.
        This replaces the Serializer's job of formatting data.
        """
        columns = [col[0] for col in cursor.description]
        return [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

def dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None