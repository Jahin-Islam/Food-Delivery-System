from addresses.api.services import insert_address
import cloudinary.uploader

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