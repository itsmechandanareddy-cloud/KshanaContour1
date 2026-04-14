"""
Seed script for Kshana Contour Boutique database
Adds sample orders, employees, materials, and gallery items
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import random

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client['kshana_boutique']

# Sample customers from Excel data
CUSTOMERS = [
    {"name": "Vishala", "phone": "9876543211", "dob": "1990-05-15", "gender": "female"},
    {"name": "Sunaina", "phone": "9876543212", "dob": "1988-08-22", "gender": "female"},
    {"name": "Shoba", "phone": "9876543213", "dob": "1985-12-10", "gender": "female"},
    {"name": "Mahima", "phone": "9876543214", "dob": "1992-03-18", "gender": "female"},
    {"name": "Priya", "phone": "9876543215", "dob": "1995-07-25", "gender": "female"},
    {"name": "Geetha", "phone": "9876543216", "dob": "1982-11-30", "gender": "female"},
    {"name": "Chethana", "phone": "9876543217", "dob": "1991-04-08", "gender": "female"},
    {"name": "Swetha", "phone": "9876543218", "dob": "1993-09-14", "gender": "female"},
    {"name": "Nagaratna", "phone": "9876543219", "dob": "1980-02-20", "gender": "female"},
    {"name": "Mamatha", "phone": "9876543220", "dob": "1987-06-12", "gender": "female"},
]

# Service types
SERVICE_TYPES = [
    "Bridal blouses", "Normal blouses", "Traditional blouses", 
    "Hand work", "Saree fall", "Saree kuchu", "Saree lace",
    "Kurtha pajamas", "Length alterations", "Custom stitching and alterations"
]

# Sample orders from Excel data
ORDERS_DATA = [
    {"customer": "Vishala", "items": ["3 sarees Falls+Zig Zag", "1 Blouse + Fall + Kuchchu"], "total": 3500, "advance": 2000, "status": "delivered"},
    {"customer": "Sunaina", "items": ["2 Blouses"], "total": 1700, "advance": 1000, "status": "delivered"},
    {"customer": "Shoba", "items": ["1 blouse (padded+prince cut)"], "total": 1200, "advance": 500, "status": "ready"},
    {"customer": "Mahima", "items": ["3 Blouse + Alteration"], "total": 2850, "advance": 1500, "status": "in_progress"},
    {"customer": "Priya", "items": ["4 kurta", "1 kurta set", "3 Blouse", "Fall Zig Zag"], "total": 6350, "advance": 3000, "status": "in_progress"},
    {"customer": "Geetha", "items": ["2 Padded blouse"], "total": 2400, "advance": 1200, "status": "pending"},
    {"customer": "Chethana", "items": ["7 Blouse"], "total": 5950, "advance": 3000, "status": "pending"},
    {"customer": "Swetha", "items": ["Saree Zig zag", "1 Blouse"], "total": 1150, "advance": 500, "status": "delivered"},
    {"customer": "Nagaratna", "items": ["Lehenga + blouse"], "total": 8500, "advance": 5000, "status": "in_progress"},
    {"customer": "Mamatha", "items": ["1 kurta"], "total": 700, "advance": 350, "status": "ready"},
]

# Employees from Excel data
EMPLOYEES = [
    {"name": "Tabrez", "phone": "9988776655", "role": "Master Tailor", "salary": 25000},
    {"name": "Tahseen", "phone": "9988776656", "role": "Tailor", "salary": 18000},
    {"name": "Ranjith", "phone": "9988776657", "role": "Helper", "salary": 12000},
    {"name": "Varsha", "phone": "9988776658", "role": "Embroidery Worker", "salary": 15000},
    {"name": "Khadim", "phone": "9988776659", "role": "Tailor", "salary": 18000},
    {"name": "Hathik", "phone": "9988776660", "role": "Helper", "salary": 12000},
]

# Materials from Excel data
MATERIALS = [
    {"name": "Silk Fabric", "quantity": 50, "unit": "meters", "cost": 15000, "payment_mode": "cash", "supplier": "Textile Market"},
    {"name": "Cotton Lining", "quantity": 100, "unit": "meters", "cost": 5000, "payment_mode": "upi", "supplier": "Local Supplier"},
    {"name": "Embroidery Thread", "quantity": 50, "unit": "pieces", "cost": 2500, "payment_mode": "cash", "supplier": "Amazon"},
    {"name": "Buttons & Hooks", "quantity": 200, "unit": "pieces", "cost": 1200, "payment_mode": "cash", "supplier": "Local Market"},
    {"name": "Zari Work Material", "quantity": 20, "unit": "meters", "cost": 8000, "payment_mode": "upi", "supplier": "Textile Market"},
    {"name": "Fall Cloth", "quantity": 100, "unit": "meters", "cost": 3000, "payment_mode": "cash", "supplier": "Local Supplier"},
    {"name": "Kuchchu Thread", "quantity": 30, "unit": "rolls", "cost": 1500, "payment_mode": "cash", "supplier": "Local Market"},
]

# Gallery images
GALLERY_ITEMS = [
    {
        "title": "Red Bridal Blouse", 
        "image_url": "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/7lsyatwt_image.png",
        "category": "Bridal Blouses",
        "description": "Exquisite red bridal blouse with golden zari work"
    },
    {
        "title": "Traditional Saree Collection",
        "image_url": "https://images.unsplash.com/photo-1549261472-fcd48d0b6709?w=600",
        "category": "Gallery",
        "description": "Beautiful traditional saree designs"
    },
    {
        "title": "Designer Blouse Work",
        "image_url": "https://images.unsplash.com/photo-1769103948746-8592931bbdad?w=600",
        "category": "Blouses",
        "description": "Intricate designer blouse patterns"
    },
    {
        "title": "Hand Embroidery",
        "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600",
        "category": "Hand Work",
        "description": "Beautiful hand embroidery work"
    },
    {
        "title": "Contemporary Designs",
        "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600",
        "category": "Contemporary",
        "description": "Modern contemporary fashion designs"
    },
    {
        "title": "Custom Stitching",
        "image_url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600",
        "category": "Custom",
        "description": "Professional custom stitching work"
    },
]

def generate_order_id():
    return f"KSH-{random.randint(100, 999)}"

async def seed_database():
    print("Starting database seeding...")
    
    # Clear existing data (except admin)
    await db.customers.delete_many({})
    await db.orders.delete_many({})
    await db.employees.delete_many({})
    await db.materials.delete_many({})
    await db.gallery.delete_many({})
    
    print("Cleared existing data")
    
    # Seed customers
    customer_ids = {}
    for customer in CUSTOMERS:
        customer_doc = {
            **customer,
            "email": f"{customer['name'].lower()}@email.com",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.customers.insert_one(customer_doc)
        customer_ids[customer['name']] = str(result.inserted_id)
    print(f"Seeded {len(CUSTOMERS)} customers")
    
    # Seed orders
    order_count = 0
    for order_data in ORDERS_DATA:
        customer_name = order_data['customer']
        customer = next((c for c in CUSTOMERS if c['name'] == customer_name), None)
        
        if not customer:
            continue
            
        # Create items with measurements
        items = []
        for item_desc in order_data['items']:
            service = random.choice(SERVICE_TYPES)
            items.append({
                "service_type": service,
                "blouse_type": "without_cups" if "blouse" in service.lower() else None,
                "front_neck_design": "Round neck with piping" if "blouse" in service.lower() else None,
                "back_neck_design": "Deep back with hooks" if "blouse" in service.lower() else None,
                "chest": str(random.randint(32, 40)),
                "waist": str(random.randint(28, 36)),
                "hip": str(random.randint(34, 42)),
                "shoulder": str(random.randint(13, 16)),
                "sleeve_length": str(random.randint(6, 12)),
                "sleeve_round": str(random.randint(10, 14)),
                "armhole": str(random.randint(16, 20)),
                "length": str(random.randint(14, 18)),
                "additional_notes": item_desc,
                "cost": order_data['total'] // len(order_data['items'])
            })
        
        # Calculate dates
        order_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
        delivery_days = random.randint(5, 15)
        delivery_date = order_date + timedelta(days=delivery_days)
        
        # Adjust for pending orders to show due soon
        if order_data['status'] == 'pending':
            delivery_date = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 3))
        
        subtotal = order_data['total']
        tax = subtotal * 0.18
        total = subtotal + tax
        balance = total - order_data['advance']
        
        order_doc = {
            "order_id": generate_order_id(),
            "customer_id": customer_ids.get(customer_name),
            "customer_name": customer_name,
            "customer_phone": customer['phone'],
            "order_date": order_date.isoformat(),
            "delivery_date": delivery_date.strftime("%Y-%m-%d"),
            "items": items,
            "subtotal": subtotal,
            "tax_percentage": 18,
            "tax_amount": tax,
            "total": total,
            "advance_amount": order_data['advance'],
            "balance": balance,
            "payments": [
                {
                    "amount": order_data['advance'],
                    "date": order_date.strftime("%Y-%m-%d"),
                    "mode": random.choice(["cash", "upi"]),
                    "notes": "Advance payment"
                }
            ],
            "status": order_data['status'],
            "description": f"Order for {', '.join(order_data['items'])}",
            "created_at": order_date.isoformat()
        }
        
        await db.orders.insert_one(order_doc)
        order_count += 1
    print(f"Seeded {order_count} orders")
    
    # Seed employees
    for employee in EMPLOYEES:
        # Add some payment history
        payments = []
        hours_log = []
        for i in range(3):
            payment_date = datetime.now(timezone.utc) - timedelta(days=7*i)
            payments.append({
                "amount": employee['salary'] // 4,  # Weekly payment
                "date": payment_date.strftime("%Y-%m-%d"),
                "mode": random.choice(["cash", "upi", "bank_transfer"]),
                "notes": f"Week {i+1} payment"
            })
            hours_log.append({
                "date": payment_date.strftime("%Y-%m-%d"),
                "hours": random.randint(40, 50),
                "notes": "Regular work week"
            })
        
        employee_doc = {
            **employee,
            "email": f"{employee['name'].lower()}@kshana.com",
            "address": "Bangalore, Karnataka",
            "joining_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d"),
            "documents": [],
            "payments": payments,
            "hours_log": hours_log,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.employees.insert_one(employee_doc)
    print(f"Seeded {len(EMPLOYEES)} employees")
    
    # Seed materials
    for material in MATERIALS:
        material_doc = {
            **material,
            "description": f"High quality {material['name'].lower()}",
            "purchase_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.materials.insert_one(material_doc)
    print(f"Seeded {len(MATERIALS)} materials")
    
    # Seed gallery
    for item in GALLERY_ITEMS:
        gallery_doc = {
            **item,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.gallery.insert_one(gallery_doc)
    print(f"Seeded {len(GALLERY_ITEMS)} gallery items")
    
    print("\nDatabase seeding complete!")
    print(f"- {len(CUSTOMERS)} customers")
    print(f"- {order_count} orders")
    print(f"- {len(EMPLOYEES)} employees")
    print(f"- {len(MATERIALS)} materials")
    print(f"- {len(GALLERY_ITEMS)} gallery items")
    
    # Print test credentials
    print("\n=== Test Credentials ===")
    print("Admin: Phone: 9876543210, Password: admin123")
    print("\nSample Customers (login with phone + DOB):")
    for c in CUSTOMERS[:3]:
        print(f"  - {c['name']}: Phone: {c['phone']}, DOB: {c['dob']}")

if __name__ == "__main__":
    asyncio.run(seed_database())
