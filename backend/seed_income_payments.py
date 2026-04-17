"""Seed incoming payment records into orders and create partnership income entries.
Reads from the Revenue (income Tracker) sheet of Tracker.xlsx data.
UPI payments -> Kshana account in partnership
Cash payments -> Cash account in partnership
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
load_dotenv()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# 52 incoming payment records extracted from Tracker.xlsx "Revenue (income Tracker)" sheet
INCOME_PAYMENTS = [
    {"date": "2026-01-13", "order": 1, "customer": "Varsha", "item": "Blouse", "amount": 5000, "mode": "UPI", "comments": "Advance"},
    {"date": "2026-01-16", "order": 1, "customer": "Varsha", "item": "Blouse", "amount": 10000, "mode": "UPI", "comments": "Advance"},
    {"date": "2026-02-05", "order": 1, "customer": "Varsha", "item": "Blouse", "amount": 20000, "mode": "UPI", "comments": "Payment clearance"},
    {"date": "2026-02-18", "order": 4, "customer": "Padma", "item": "1 Blouse", "amount": 750, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-09", "order": 5, "customer": "Vaishnavi", "item": "2 Blouses", "amount": 6000, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-08", "order": 6, "customer": "Hemabindhu", "item": "Semi-stitched lehenga and blouse", "amount": 1500, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-01-30", "order": 9, "customer": "Shifana", "item": "Alteration", "amount": 140, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-07", "order": 10, "customer": "Chandra", "item": "Kuchchu", "amount": 500, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-02-10", "order": 10, "customer": "Chandra", "item": "Blouse", "amount": 700, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-01-02", "order": 11, "customer": "Apoorva", "item": "Alteration", "amount": 200, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-26", "order": 12, "customer": "Kavitha", "item": "1 Blouse + Falls + Zig Zag", "amount": 850, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-03-02", "order": 13, "customer": "Sunaina", "item": "Kurta", "amount": 1300, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-03-04", "order": 15, "customer": "Yamuna", "item": "2 blouses + Fall + zigzag", "amount": 1700, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-02-19", "order": 16, "customer": "Mangala", "item": "7 Blouse, 1 Lehenga Blouse, 1 kurta top + straight cut pant", "amount": 9000, "mode": "UPI", "comments": "Partial payment"},
    {"date": "2026-03-04", "order": 23, "customer": "Suma", "item": "3 blouse", "amount": 7200, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-02-21", "order": 24, "customer": "Divya", "item": "1 Blouse", "amount": 1000, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-20", "order": 25, "customer": "Kavitha", "item": "2 kurta", "amount": 2500, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-14", "order": 27, "customer": "Mahima", "item": "2 blouse", "amount": 2400, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-23", "order": 28, "customer": "Pushpa", "item": "2 Blouse + 2 sarees falls", "amount": 1700, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-05", "order": 29, "customer": "Dolly Yadav", "item": "3 Blouse + Alteration", "amount": 2000, "mode": "UPI", "comments": "Partial payment"},
    {"date": "2026-02-24", "order": 30, "customer": "Monisha", "item": "2 blouse + saree fall + Kuchchu", "amount": 2000, "mode": "UPI", "comments": "Partial payment"},
    {"date": "2026-02-21", "order": 31, "customer": "Shreya", "item": "1 Blouse", "amount": 850, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-16", "order": 32, "customer": "Pragathi", "item": "Saree falls and lace", "amount": 350, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-23", "order": 33, "customer": "Lakshmi", "item": "1 Blouse + Baby Kuchchu + Falls", "amount": 4600, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-15", "order": 34, "customer": "Swetha", "item": "All Items", "amount": 3000, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-03", "order": 36, "customer": "Mahima Mother", "item": "1 blouse", "amount": 650, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-18", "order": 37, "customer": "Bhoomika", "item": "1 Blouse", "amount": 870, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-15", "order": 38, "customer": "Veena", "item": "6 blouses", "amount": 10000, "mode": "UPI", "comments": "Partial payment"},
    {"date": "2026-03-02", "order": 39, "customer": "Kausalya", "item": "1 Blouse + Falls + Zig Zag", "amount": 800, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-02-18", "order": 41, "customer": "Chethana", "item": "6 Blouse", "amount": 2000, "mode": "UPI", "comments": "Advance"},
    {"date": "2026-03-02", "order": 41, "customer": "Chethana", "item": "6 Blouse", "amount": 6250, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-21", "order": 43, "customer": "Roopa", "item": "1 blouse", "amount": 1000, "mode": "UPI", "comments": "Advance"},
    {"date": "2026-03-05", "order": 43, "customer": "Roopa", "item": "1 blouse", "amount": 1750, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-21", "order": 44, "customer": "Geetha", "item": "1 blouse", "amount": 850, "mode": "UPI", "comments": "Advance"},
    {"date": "2026-02-22", "order": 45, "customer": "Latha", "item": "2 blouse", "amount": 3000, "mode": "CASH", "comments": "Advance"},
    {"date": "2026-02-23", "order": 46, "customer": "Jocelyn", "item": "1 Blouse", "amount": 250, "mode": "UPI", "comments": "Advance"},
    {"date": "2026-03-05", "order": 46, "customer": "Jocelyn", "item": "1 Blouse", "amount": 600, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-02", "order": 47, "customer": "Rashmi", "item": "4 Blouse", "amount": 3850, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-05", "order": 50, "customer": "Shonima/Deepa", "item": "1 blouse", "amount": 1200, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-04", "order": 53, "customer": "Yamuna", "item": "Lehenga + blouse", "amount": 800, "mode": "CASH", "comments": "Advance"},
    {"date": "2026-03-14", "order": 54, "customer": "Mamatha", "item": "1 kurta", "amount": 850, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-10", "order": 55, "customer": "Apoorva", "item": "1 blouse + Fall + Zigzag", "amount": 1400, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-15", "order": 56, "customer": "Saroja", "item": "2 Blouse", "amount": 1500, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-03-16", "order": 57, "customer": "Raisha", "item": "1 kurta", "amount": 1400, "mode": "CASH", "comments": "Full payment"},
    # Combined orders (split between multiple orders)
    {"date": "2026-02-22", "order": "21&18", "customer": "Sunitha & Mahima", "item": "2 blouse", "amount": 12000, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-06", "order": "7&8", "customer": "Padmaja & Vishala", "item": "Blouse and Kurta", "amount": 17800, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-02-15", "order": 62, "customer": "Mythri", "item": "3 blouses", "amount": 2500, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-03-12", "order": 20, "customer": "Adbul Moideen", "item": "3 Kurta", "amount": 4700, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-07", "order": 17, "customer": "Aarthi", "item": "1 blouse", "amount": 1200, "mode": "UPI", "comments": "Full payment"},
    {"date": "2026-03-01", "order": 42, "customer": "NA", "item": "kuchchu", "amount": 500, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-03-12", "order": 49, "customer": "Lakshmi", "item": "2 Padded blouse, 1 Blouse (work), Kuchchu + Zig Zag", "amount": 6400, "mode": "CASH", "comments": "Full payment"},
    {"date": "2026-03-17", "order": 19, "customer": "Madhavi", "item": "4 kurta + 1 kurta set + Blouse 3 + Fall Zig Zag", "amount": 6900, "mode": "UPI", "comments": "Full payment"},
]


async def seed_income():
    # Step 1: Update each order's payments array with real payment data
    updated_orders = 0
    skipped = 0

    # Group payments by order number
    order_payments = {}
    for p in INCOME_PAYMENTS:
        order_key = p["order"]
        if isinstance(order_key, str) and "&" in order_key:
            # Combined orders like "21&18" or "7&8"
            parts = [int(x.strip()) for x in order_key.split("&")]
            for part in parts:
                if part not in order_payments:
                    order_payments[part] = []
                order_payments[part].append({
                    "amount": p["amount"],
                    "date": p["date"],
                    "mode": p["mode"].upper(),
                    "notes": f"{p['comments']} - Combined with KSH-{parts[0]:02d}&{parts[1]:02d} ({p['customer']})"
                })
        else:
            order_num = int(order_key)
            if order_num not in order_payments:
                order_payments[order_num] = []
            order_payments[order_num].append({
                "amount": p["amount"],
                "date": p["date"],
                "mode": p["mode"].upper(),
                "notes": f"{p['comments']} ({p['customer']})"
            })

    # Update each order
    for order_num, payments in order_payments.items():
        order_id = f"KSH-{order_num:02d}"
        order = await db.orders.find_one({"order_id": order_id})
        if not order:
            print(f"  SKIP: {order_id} not found in DB")
            skipped += 1
            continue

        total_paid = sum(p["amount"] for p in payments)
        order_total = order.get("total", 0)
        balance = max(0, order_total - total_paid)

        result = await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "payments": payments,
                "balance": balance
            }}
        )
        if result.modified_count > 0:
            updated_orders += 1
            print(f"  {order_id}: {len(payments)} payments, total paid={total_paid}, balance={balance}")
        else:
            print(f"  {order_id}: no change needed")

    print(f"\nUpdated {updated_orders} orders, skipped {skipped}")

    # Step 2: Create partnership entries for income tracking
    # UPI → kshana field, Cash → cash field
    income_entries = []
    for p in INCOME_PAYMENTS:
        order_key = p["order"]
        if isinstance(order_key, str) and "&" in order_key:
            order_str = "&".join([f"KSH-{int(x.strip()):02d}" for x in order_key.split("&")])
        else:
            order_str = f"KSH-{int(order_key):02d}"

        mode_upper = p["mode"].upper()
        is_upi = mode_upper in ["UPI", "UPI + CASH"]
        is_cash = mode_upper in ["CASH", "UPI + CASH"]

        entry = {
            "date": p["date"],
            "order": order_str,
            "reason": f"Customer Payment - {p['item']}",
            "paid_to": p["customer"],
            "chandana": 0,
            "akanksha": 0,
            "sbi": 0,
            "kshana": p["amount"] if is_upi else 0,
            "cash": p["amount"] if is_cash else 0,
            "mode": mode_upper,
            "comments": p["comments"],
            "type": "income"
        }
        income_entries.append(entry)

    # Remove old income entries first
    deleted = await db.partnership.delete_many({"type": "income"})
    print(f"\nCleared {deleted.deleted_count} old income entries")

    # Insert new income entries
    if income_entries:
        result = await db.partnership.insert_many(income_entries)
        print(f"Inserted {len(result.inserted_ids)} income partnership entries")

    # Calculate totals
    upi_total = sum(e["kshana"] for e in income_entries)
    cash_total = sum(e["cash"] for e in income_entries)
    print(f"\nIncome Summary:")
    print(f"  UPI (Kshana account): {upi_total}")
    print(f"  Cash: {cash_total}")
    print(f"  Total income: {upi_total + cash_total}")


if __name__ == "__main__":
    asyncio.run(seed_income())
