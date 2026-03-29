"""
fix_discount_nums.py
--------------------
Fixes NULL discount_num values in the Discount table.

For each restaurant, discounts are assigned sequential numbers (1, 2, 3, ...)
in order of their primary key. Already-numbered discounts are left untouched
and the sequence continues after the highest existing number.

Usage (from your Django project root):
    python manage.py shell < fix_discount_nums.py
    
Or run it directly if Django is configured:
    python fix_discount_nums.py
"""

import os
import django

# ── Django setup (only needed when running as a standalone script) ────────────
# Remove these lines if you're running via `manage.py shell`
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()
# ─────────────────────────────────────────────────────────────────────────────

from django.db import transaction
from resturants.models import Discount, Restaurant  # adjust app label if needed


def fix_discount_nums(dry_run=False):
    restaurants = Restaurant.objects.prefetch_related("discounts").all()

    total_fixed = 0

    for restaurant in restaurants:
        discounts = list(restaurant.discounts.order_by("id"))

        # Find the highest discount_num already assigned for this restaurant
        existing_nums = {
            d.discount_num
            for d in discounts
            if d.discount_num is not None
        }
        next_num = max(existing_nums, default=0) + 1

        to_fix = [d for d in discounts if d.discount_num is None]

        if not to_fix:
            continue

        print(f"\nRestaurant: '{restaurant.name}' (id={restaurant.id})")
        print(f"  Total discounts : {len(discounts)}")
        print(f"  Already numbered: {sorted(existing_nums)}")
        print(f"  Null entries    : {len(to_fix)}")

        with transaction.atomic():
            for discount in to_fix:
                print(
                    f"  {'[DRY RUN] ' if dry_run else ''}"
                    f"Setting Discount id={discount.id} "
                    f"('{discount.description}') → discount_num={next_num}"
                )
                if not dry_run:
                    discount.discount_num = next_num
                    discount.save(update_fields=["discount_num"])
                next_num += 1
                total_fixed += 1

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Done. "
          f"{'Would fix' if dry_run else 'Fixed'} {total_fixed} discount(s).")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fix NULL discount_num values.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing to the database.",
    )
    args = parser.parse_args()

    fix_discount_nums(dry_run=args.dry_run)
