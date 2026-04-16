"""Seed all 64 orders into MongoDB Atlas"""
from pymongo import MongoClient
import certifi, bcrypt
from datetime import datetime, timezone

url = 'mongodb+srv://kshana_admin:kshana2026@cluster0.43xxwwc.mongodb.net/kshana_boutique?retryWrites=true&w=majority'
client = MongoClient(url, tlsCAFile=certifi.where())
db = client['kshana_boutique']

def hp(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

# Clear existing orders and customers
db.orders.delete_many({})
db.customers.delete_many({})
print("Cleared old data")

orders_data = [
    {"num":1,"name":"Varsha","phone":"9110249832","items":[{"service_type":"Blouse","description":"4 blouse","cost":35000,"has_work":True}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":35000},
    {"num":2,"name":"Ganga","phone":"7676862493","items":[{"service_type":"Blouse","description":"1 Blouse + Fall + Kuchchu","cost":1500,"has_work":False}],"delivery":"2026-02-01","status":"delivered","paid":False,"total":1500},
    {"num":3,"name":"Nagaratna","phone":"9986503138","items":[{"service_type":"Blouse","description":"1 Blouse + Fall + Kuchchu","cost":2800,"has_work":True},{"service_type":"Blouse","description":"1 Blouse + Fall + Kuchchu","cost":500,"has_work":True}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":3300,"notes":"2nd item delivery 16/02. Blouse cost pending on 2nd item."},
    {"num":4,"name":"Padma","phone":"973820253","items":[{"service_type":"Blouse","description":"1 Blouse","cost":750,"has_work":False}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":750},
    {"num":5,"name":"Vaishnavi","phone":"7204679593","items":[{"service_type":"Blouse","description":"1 Blouse","cost":3500,"has_work":True},{"service_type":"Blouse","description":"1 Blouse","cost":2500,"has_work":True}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":6000,"notes":"Alt phone: 9916316380. Item1: 3000+500, Item2: 1500+1000"},
    {"num":6,"name":"Hemabindhu","phone":"9391671113","items":[{"service_type":"Blouse","description":"1 blouse + Semi-stitched lehenga","cost":1500,"has_work":False}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":1500},
    {"num":7,"name":"Vishala","phone":"9980868408","items":[{"service_type":"Kurta","description":"2 Kurta","cost":17800,"has_work":False},{"service_type":"Blouse","description":"5 blouses","cost":0,"has_work":False},{"service_type":"Saree Work","description":"3 sarees - Fall + Zig zag","cost":0,"has_work":False}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":17800},
    {"num":8,"name":"Padmaja","phone":"9980868408","items":[{"service_type":"Blouse","description":"5 blouses (only 1 has work)","cost":0,"has_work":True},{"service_type":"Saree Work","description":"1 saree kuchchu","cost":0,"has_work":False},{"service_type":"Saree Work","description":"1 saree fall Zig-zag","cost":0,"has_work":False}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":0},
    {"num":9,"name":"Shifana","phone":"9035467145","items":[{"service_type":"Alteration","description":"Alteration","cost":140,"has_work":False}],"delivery":"2026-01-30","status":"delivered","paid":True,"total":140},
    {"num":10,"name":"Chandra","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse","cost":750,"has_work":False},{"service_type":"Saree Work","description":"1 saree - baby kuchchu","cost":500,"has_work":False}],"delivery":"2026-02-06","status":"delivered","paid":True,"total":1250},
    {"num":11,"name":"Apoorva","phone":"7702728889","items":[{"service_type":"Alteration","description":"Alteration","cost":200,"has_work":False}],"delivery":"2026-01-30","status":"delivered","paid":True,"total":200},
    {"num":12,"name":"Kavitha","phone":"9141368072","items":[{"service_type":"Blouse","description":"1 Blouse + Fall + Zig zag","cost":870,"has_work":False}],"delivery":"2026-02-16","status":"delivered","paid":True,"total":870,"notes":"750 + 120"},
    {"num":13,"name":"Sunaina","phone":"7417915055","items":[{"service_type":"Kurta","description":"1 top + palazzo","cost":1300,"has_work":False}],"delivery":"2026-02-12","status":"delivered","paid":True,"total":1300},
    {"num":14,"name":"Shoba","phone":"7619417869","items":[{"service_type":"Saree Work","description":"3 sarees Falls + Zig Zag","cost":300,"has_work":False},{"service_type":"Blouse","description":"3 Blouse (with work)","cost":2550,"has_work":True}],"delivery":"2026-02-07","status":"ready","paid":False,"total":2850,"notes":"Falls: 100*3, Blouse: 850*3"},
    {"num":15,"name":"Yamuna","phone":"9966124846","items":[{"service_type":"Blouse","description":"1 Blouse","cost":800,"has_work":False},{"service_type":"Alteration","description":"Alteration","cost":100,"has_work":False},{"service_type":"Saree Work","description":"1 fall + zig zag","cost":120,"has_work":False}],"delivery":"2026-02-24","status":"pending","paid":False,"total":1020},
    {"num":16,"name":"Mangala","phone":"9113060276","items":[{"service_type":"Blouse","description":"7 Blouse","cost":5950,"has_work":False},{"service_type":"Blouse","description":"1 Lehenga Blouse","cost":2600,"has_work":False},{"service_type":"Kurta","description":"1 kurta top + straight cut pant","cost":1200,"has_work":False}],"delivery":"2026-02-07","status":"delivered","paid":True,"total":9750,"notes":"Blouse: 850*7"},
    {"num":17,"name":"Aarthi","phone":"9886049790","items":[{"service_type":"Blouse","description":"1 blouse (padded + prince cut)","cost":1200,"has_work":False,"padded":True,"princess_cut":True}],"delivery":"2026-02-28","status":"pending","paid":False,"total":1200},
    {"num":18,"name":"Mahima","phone":"9242146952","items":[{"service_type":"Blouse","description":"1 Blouse (work only)","cost":6000,"has_work":True}],"delivery":"2026-02-13","status":"delivered","paid":True,"total":6000},
    {"num":19,"name":"Madhavi","phone":"8296224567","items":[{"service_type":"Kurta","description":"3 Kurta + 1 Set","cost":6900,"has_work":False},{"service_type":"Blouse","description":"3 Blouses","cost":0,"has_work":False}],"delivery":"2026-02-13","status":"delivered","paid":True,"total":6900},
    {"num":20,"name":"Adbul Moideen","phone":"9449255813","items":[{"service_type":"Kurta","description":"3 Kurta","cost":4200,"has_work":False}],"delivery":"2026-02-13","status":"pending","paid":False,"total":4200,"notes":"1400*3"},
    {"num":21,"name":"Sunitha","phone":"9242146952","items":[{"service_type":"Blouse","description":"1 Blouse (with work)","cost":6000,"has_work":True}],"delivery":"2026-02-13","status":"pending","paid":False,"total":6000},
    {"num":22,"name":"Veena","phone":"9972511788","items":[{"service_type":"Blouse","description":"3 Blouse (with work)","cost":15000,"has_work":True},{"service_type":"Blouse","description":"3 Blouse","cost":0,"has_work":False}],"delivery":"2026-02-13","status":"cancelled","paid":False,"total":15000,"notes":"CANCELLED ORDER"},
    {"num":23,"name":"Suma","phone":"9008567247","items":[{"service_type":"Blouse","description":"1 Blouse (with work)","cost":3500,"has_work":True},{"service_type":"Blouse","description":"2 blouse (with work)","cost":9000,"has_work":True}],"delivery":"2026-02-13","status":"pending","paid":False,"total":12500,"notes":"Item2: 4500*2, delivery 25/02"},
    {"num":24,"name":"Divya","phone":"8095689375","items":[{"service_type":"Blouse","description":"1 Blouse","cost":1200,"has_work":False}],"delivery":"2026-02-14","status":"pending","paid":False,"total":1200},
    {"num":25,"name":"Kavitha","phone":"9632690619","items":[{"service_type":"Kurta","description":"2 Kurta","cost":2500,"has_work":False}],"delivery":"2026-02-11","status":"delivered","paid":True,"total":2500},
    {"num":26,"name":"Priya","phone":"7976070160","items":[{"service_type":"Alteration","description":"Alteration","cost":50,"has_work":False}],"delivery":"2026-02-02","status":"delivered","paid":True,"total":50},
    {"num":27,"name":"Mahima","phone":"9740287105","items":[{"service_type":"Blouse","description":"2 blouse","cost":2600,"has_work":False}],"delivery":"2026-02-09","status":"ready","paid":False,"total":2600,"notes":"1400 + 1200"},
    {"num":28,"name":"Pushpa","phone":"9964388656","items":[{"service_type":"Blouse","description":"2 Blouse + 2 sarees falls","cost":1700,"has_work":False}],"delivery":"2026-02-15","status":"delivered","paid":True,"total":1700,"notes":"750*2 + 200"},
    {"num":29,"name":"Dolly Yadav","phone":"","items":[{"service_type":"Blouse","description":"3 Blouse + Alteration","cost":2250,"has_work":False}],"delivery":"2026-02-15","status":"pending","paid":False,"total":2250},
    {"num":30,"name":"Monisha","phone":"8861404505","items":[{"service_type":"Blouse","description":"1 Blouse (with work)","cost":3500,"has_work":True},{"service_type":"Saree Work","description":"2 Saree fall + Kuchchu","cost":0,"has_work":False}],"delivery":"2026-02-18","status":"delivered","paid":False,"total":3500},
    {"num":31,"name":"Shreya","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse","cost":850,"has_work":False}],"delivery":"2026-02-19","status":"delivered","paid":True,"total":850},
    {"num":32,"name":"Pragathi","phone":"7760627990","items":[{"service_type":"Saree Work","description":"Lace + Fall + Zig Zag","cost":350,"has_work":False}],"delivery":"2026-02-15","status":"delivered","paid":True,"total":350},
    {"num":33,"name":"Lakshmi","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse (with work)","cost":4600,"has_work":True},{"service_type":"Saree Work","description":"Baby Kuchchu + Falls","cost":0,"has_work":False}],"delivery":"2026-02-24","status":"delivered","paid":True,"total":4600},
    {"num":34,"name":"Swetha","phone":"9901502439","items":[{"service_type":"Pant","description":"2 pant","cost":3000,"has_work":False},{"service_type":"Kurta","description":"1 Kurta","cost":0,"has_work":False},{"service_type":"Blouse","description":"1 blouse","cost":0,"has_work":False}],"delivery":"2026-02-14","status":"delivered","paid":True,"total":3000},
    {"num":35,"name":"Anitha","phone":"9663473188","items":[{"service_type":"Blouse","description":"1 Blouse (with work)","cost":0,"has_work":True},{"service_type":"Blouse","description":"1 Blouse","cost":0,"has_work":False}],"delivery":"2026-01-15","status":"pending","paid":False,"total":0,"notes":"Amount NA"},
    {"num":36,"name":"Mahima Mother","phone":"9740287105","items":[{"service_type":"Blouse","description":"1 Blouse","cost":650,"has_work":False}],"delivery":"2026-02-16","status":"delivered","paid":True,"total":650},
    {"num":37,"name":"Bhoomika","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse","cost":870,"has_work":False}],"delivery":"2026-02-16","status":"delivered","paid":True,"total":870},
    {"num":38,"name":"Veena","phone":"","items":[{"service_type":"Blouse","description":"3 Blouse (with work)","cost":15000,"has_work":True},{"service_type":"Blouse","description":"3 Blouse","cost":0,"has_work":False}],"delivery":"2026-02-13","status":"delivered","paid":True,"total":15000},
    {"num":39,"name":"Kausalya","phone":"8861691166","items":[{"service_type":"Blouse","description":"1 Blouse","cost":800,"has_work":False},{"service_type":"Saree Work","description":"Saree Fall + Zig zag","cost":0,"has_work":False}],"delivery":"2026-02-23","status":"delivered","paid":True,"total":800},
    {"num":40,"name":"Amrutha","phone":"9036027109","items":[{"service_type":"Blouse","description":"1 Blouse","cost":750,"has_work":False},{"service_type":"Saree Work","description":"Saree Zig zag","cost":100,"has_work":False}],"delivery":"2026-02-21","status":"pending","paid":False,"total":850},
    {"num":41,"name":"Chethana","phone":"9739352224","items":[{"service_type":"Blouse","description":"2 Blouse (with work)","cost":6250,"has_work":True},{"service_type":"Blouse","description":"4 blouse","cost":0,"has_work":False},{"service_type":"Saree Work","description":"Saree Fall + Zig zag","cost":0,"has_work":False},{"service_type":"Saree Work","description":"Baby Kuchchu + Falls","cost":0,"has_work":False}],"delivery":"2026-02-28","status":"delivered","paid":True,"total":6250},
    {"num":42,"name":"NA","phone":"","items":[{"service_type":"Saree Work","description":"Baby Kuchchu + Falls","cost":500,"has_work":False}],"delivery":"2026-02-18","status":"delivered","paid":True,"total":500},
    {"num":43,"name":"Roopa","phone":"9164885030","items":[{"service_type":"Blouse","description":"1 Blouse (with work)","cost":2750,"has_work":True}],"delivery":"2026-02-27","status":"pending","paid":False,"total":2750},
    {"num":44,"name":"Geetha","phone":"","items":[{"service_type":"Blouse","description":"1 blouse","cost":850,"has_work":False}],"delivery":"2026-02-21","status":"delivered","paid":True,"total":850},
    {"num":45,"name":"Latha","phone":"9449533347","items":[{"service_type":"Blouse","description":"1 blouse (with work)","cost":3650,"has_work":True},{"service_type":"Blouse","description":"1 blouse","cost":850,"has_work":False}],"delivery":"2026-02-28","status":"pending","paid":False,"total":4500,"notes":"2800 + 850 + 850"},
    {"num":46,"name":"Jocelyn","phone":"8527718100","items":[{"service_type":"Blouse","description":"1 Blouse","cost":850,"has_work":False}],"delivery":"2026-02-28","status":"pending","paid":False,"total":850},
    {"num":47,"name":"Rashmi","phone":"9035180076","items":[{"service_type":"Blouse","description":"4 Blouse","cost":3850,"has_work":False}],"delivery":"2026-02-26","status":"delivered","paid":True,"total":3850},
    {"num":48,"name":"Deevika","phone":"8050725062","items":[{"service_type":"Blouse","description":"2 blouse","cost":950,"has_work":False}],"delivery":"2026-03-06","status":"pending","paid":False,"total":950},
    {"num":49,"name":"Lakshmi","phone":"9731440736","items":[{"service_type":"Blouse","description":"2 Padded blouse","cost":2400,"has_work":False,"padded":True},{"service_type":"Blouse","description":"1 Blouse (with work)","cost":3500,"has_work":True},{"service_type":"Saree Work","description":"Kuchchu + Zig Zag","cost":500,"has_work":False}],"delivery":"2026-03-06","status":"pending","paid":False,"total":6400},
    {"num":50,"name":"Shonima","phone":"9980948020","items":[{"service_type":"Blouse","description":"1 Padded blouse","cost":1200,"has_work":False,"padded":True}],"delivery":"2026-02-28","status":"pending","paid":False,"total":1200,"notes":"Shonima/Deepa"},
    {"num":51,"name":"Swetha Sister","phone":"","items":[{"service_type":"Blouse","description":"2 Blouse","cost":0,"has_work":False}],"delivery":"2026-03-09","status":"pending","paid":False,"total":0},
    {"num":52,"name":"Netra","phone":"","items":[{"service_type":"Alteration","description":"Alteration","cost":20,"has_work":False}],"delivery":"2026-03-04","status":"delivered","paid":True,"total":20,"notes":"to Tahseen"},
    {"num":53,"name":"Yamuna","phone":"9966124846","items":[{"service_type":"Blouse","description":"Lehenga + blouse","cost":2000,"has_work":False}],"delivery":"2026-03-13","status":"pending","paid":False,"total":2000},
    {"num":54,"name":"Mamatha","phone":"8105326863","items":[{"service_type":"Kurta","description":"top Pant","cost":850,"has_work":False}],"delivery":"2026-03-12","status":"pending","paid":False,"total":850},
    {"num":55,"name":"Apoorva","phone":"9686558677","items":[{"service_type":"Blouse","description":"blouse padded","cost":1200,"has_work":False,"padded":True},{"service_type":"Saree Work","description":"Fall + zig zag","cost":200,"has_work":False}],"delivery":"2026-03-10","status":"delivered","paid":True,"total":1400},
    {"num":56,"name":"Saroja","phone":"7892631732","items":[{"service_type":"Blouse","description":"2 blouses","cost":1500,"has_work":False}],"delivery":"2026-03-11","status":"pending","paid":False,"total":1500},
    {"num":57,"name":"Raisha","phone":"7337877635","items":[{"service_type":"Dress","description":"Dress","cost":1300,"has_work":False}],"delivery":"2026-03-15","status":"pending","paid":False,"total":1300},
    {"num":58,"name":"Varsha","phone":"9110249832","items":[{"service_type":"Blouse","description":"1 blouse padded","cost":1200,"has_work":False,"padded":True}],"delivery":"2026-03-15","status":"pending","paid":False,"total":1200},
    {"num":59,"name":"Sowmya","phone":"9513887825","items":[{"service_type":"Blouse","description":"Lehenga + blouse","cost":2400,"has_work":False}],"delivery":"2026-03-20","status":"pending","paid":False,"total":2400},
    {"num":60,"name":"Keerthana","phone":"","items":[{"service_type":"Kurta","description":"2 kurta","cost":0,"has_work":False}],"delivery":"","status":"pending","paid":False,"total":0},
    {"num":61,"name":"Druthi","phone":"","items":[{"service_type":"Blouse","description":"1 blouse","cost":900,"has_work":False}],"delivery":"","status":"pending","paid":False,"total":900},
    {"num":62,"name":"Mythri","phone":"","items":[{"service_type":"Blouse","description":"3 blouses","cost":2500,"has_work":False}],"delivery":"2026-03-13","status":"delivered","paid":True,"total":2500},
    {"num":63,"name":"Amreen","phone":"9739501701","items":[{"service_type":"Kurta","description":"1 kurta","cost":1200,"has_work":False}],"delivery":"2026-03-20","status":"pending","paid":False,"total":1200},
    {"num":64,"name":"Meera","phone":"9740266006","items":[{"service_type":"Blouse","description":"1 blouse","cost":1050,"has_work":False}],"delivery":"2026-03-20","status":"pending","paid":False,"total":1050},
]

now = datetime.now(timezone.utc).isoformat()
created = 0
cust_created = 0

for o in orders_data:
    order_id = f"KSH-{o['num']:02d}"
    
    # Create/find customer
    customer_id = ""
    if o["phone"]:
        cust = db.customers.find_one({"phone": o["phone"]})
        if not cust:
            r = db.customers.insert_one({
                "name": o["name"], "phone": o["phone"],
                "password_hash": hp(o["phone"]),
                "email": "", "age": None, "gender": "female",
                "created_at": now
            })
            customer_id = str(r.inserted_id)
            cust_created += 1
        else:
            customer_id = str(cust["_id"])
    
    # Build items
    items = []
    for it in o["items"]:
        item = {
            "service_type": it["service_type"],
            "description": it["description"],
            "cost": it["cost"],
            "padded": it.get("padded", False),
            "princess_cut": it.get("princess_cut", False),
            "open_style": False,
            "front_neck_img": "",
            "back_neck_img": ""
        }
        items.append(item)
    
    total = o["total"]
    status = o["status"]
    
    # Payments
    payments = []
    if o["paid"] and total > 0:
        payments.append({
            "amount": total,
            "date": o["delivery"] or "2026-02-01",
            "mode": "cash",
            "notes": "Full payment"
        })
    
    balance = 0 if o["paid"] else total
    
    order_doc = {
        "order_id": order_id,
        "customer_id": customer_id,
        "customer_name": o["name"],
        "customer_phone": o["phone"],
        "customer_email": "",
        "items": items,
        "measurements": {},
        "subtotal": total,
        "tax_percentage": 0,
        "tax_amount": 0,
        "total": total,
        "payments": payments,
        "balance": balance,
        "status": status,
        "delivery_date": o.get("delivery") or "",
        "description": o.get("notes", ""),
        "created_at": now,
        "images": []
    }
    
    db.orders.insert_one(order_doc)
    created += 1
    print(f"  {order_id}: {o['name']} - {total}")

print(f"\n{created} orders seeded, {cust_created} customers created!")
print("Done!")
