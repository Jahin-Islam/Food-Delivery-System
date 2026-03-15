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