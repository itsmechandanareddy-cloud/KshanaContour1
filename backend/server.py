from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import requests
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import secrets

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== CLOUD STORAGE CONFIG (Cloudinary) ==============
import cloudinary
import cloudinary.uploader
import cloudinary.api

CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")
if CLOUDINARY_URL:
    # CLOUDINARY_URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)
    logger.info("Cloudinary storage initialized successfully")
else:
    logger.warning("CLOUDINARY_URL not set - file uploads disabled")

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to Cloudinary"""
    if not CLOUDINARY_URL:
        raise HTTPException(status_code=500, detail="Storage not configured. Set CLOUDINARY_URL.")
    import io
    result = cloudinary.uploader.upload(
        io.BytesIO(data),
        public_id=path,
        resource_type="auto",
        folder="kshana-contour"
    )
    return {"url": result["secure_url"], "public_id": result["public_id"]}

def get_object(path: str) -> tuple:
    """Get file URL from Cloudinary (redirect to URL instead of proxying)"""
    if not CLOUDINARY_URL:
        raise HTTPException(status_code=500, detail="Storage not configured")
    # Build the Cloudinary URL directly
    url = cloudinary.CloudinaryImage(f"kshana-contour/{path}").build_url(secure=True)
    # Fetch and return the content
    resp = requests.get(url, timeout=60)
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="File not found")
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

ROOT_DIR = Path(__file__).parent

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
# Append TLS params directly to connection string for Atlas
import certifi
if ("mongodb+srv" in mongo_url or "mongodb.net" in mongo_url):
    sep = "&" if "?" in mongo_url else "?"
    mongo_url_with_tls = f"{mongo_url}{sep}tls=true&tlsInsecure=true"
    client = AsyncIOMotorClient(mongo_url_with_tls, tlsCAFile=certifi.where())
else:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Create the main app
app = FastAPI(title="Kshana Contour Boutique API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== UTILITY FUNCTIONS ==============
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, phone: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "phone": phone,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        if payload.get("role") == "admin":
            user = await db.admins.find_one({"_id": ObjectId(payload["sub"])})
        else:
            user = await db.customers.find_one({"_id": ObjectId(payload["sub"])})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        user["role"] = payload.get("role")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def generate_order_id():
    last_order = await db.orders.find_one(
        {"order_id": {"$regex": "^KSH-"}},
        {"order_id": 1, "_id": 0},
        sort=[("_id", -1)]
    )
    if last_order:
        try:
            last_num = int(last_order["order_id"].split("-")[1])
            return f"KSH-{str(last_num + 1).zfill(2)}"
        except:
            pass
    return "KSH-01"

# ============== PYDANTIC MODELS ==============
class AdminLogin(BaseModel):
    phone: str
    password: str

class CustomerLogin(BaseModel):
    name: str
    password: str

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    dob: str
    address: Optional[str] = None

class MeasurementItem(BaseModel):
    service_type: str
    blouse_type: Optional[str] = None
    padded: Optional[str] = None
    princess_cut: Optional[str] = None
    open_style: Optional[str] = None
    front_neck_design: Optional[str] = None
    back_neck_design: Optional[str] = None
    additional_notes: Optional[str] = None
    cost: float = 0

class OrderMeasurements(BaseModel):
    padded: Optional[str] = None
    princess_cut: Optional[str] = None
    open_style: Optional[str] = None
    length: Optional[str] = None
    shoulder: Optional[str] = None
    sleeve_length: Optional[str] = None
    arm_round: Optional[str] = None
    bicep: Optional[str] = None
    upper_chest: Optional[str] = None
    chest: Optional[str] = None
    waist: Optional[str] = None
    point: Optional[str] = None
    bust_length: Optional[str] = None
    front_length: Optional[str] = None
    cross_front: Optional[str] = None
    back_deep_balance: Optional[str] = None
    cross_back: Optional[str] = None
    sleeve_round: Optional[str] = None
    front_neck: Optional[str] = None
    back_neck: Optional[str] = None
    additional_notes: Optional[str] = None

class PaymentRecord(BaseModel):
    amount: float
    date: str
    mode: str  # cash, upi, card, bank_transfer
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_age: Optional[int] = None
    customer_gender: Optional[str] = None
    customer_dob: str
    delivery_date: str
    items: List[MeasurementItem]
    measurements: Optional[dict] = None
    tax_percentage: float = 18
    advance_amount: float = 0
    advance_date: Optional[str] = None
    advance_mode: Optional[str] = None
    description: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    delivery_date: Optional[str] = None
    items: Optional[List[MeasurementItem]] = None
    measurements: Optional[dict] = None
    tax_percentage: Optional[float] = None
    description: Optional[str] = None

class PaymentUpdate(BaseModel):
    amount: float
    date: str
    mode: str
    notes: Optional[str] = None

class EmployeeCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    role: str  # master / tailor / worker
    pay_type: Optional[str] = "weekly"  # weekly / hourly
    address: Optional[str] = None
    joining_date: str
    salary: float
    documents: Optional[List[str]] = []

class EmployeePayment(BaseModel):
    amount: float
    date: str
    mode: str
    order_id: Optional[str] = None
    item_index: Optional[int] = None
    hours: Optional[float] = None
    notes: Optional[str] = None

class EmployeeHours(BaseModel):
    date: str
    hours: float
    order_id: Optional[str] = None
    item_index: Optional[int] = None
    notes: Optional[str] = None

class WorkAssignment(BaseModel):
    employee_id: str
    order_id: str
    item_index: Optional[int] = None
    date: str
    hours: float
    notes: Optional[str] = None

class MaterialCreate(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: float
    unit: str
    cost: float
    purchase_date: str
    payment_mode: str
    supplier: Optional[str] = None

class GalleryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    category: Optional[str] = None

class ReviewCreate(BaseModel):
    reviewer_name: str
    rating: int = 5  # 1-5
    review_text: str
    date: Optional[str] = None
    source: Optional[str] = "google"  # google, instagram, direct

# ============== AUTH ENDPOINTS ==============
@api_router.post("/auth/admin/login")
async def admin_login(data: AdminLogin, response: Response):
    admin = await db.admins.find_one({"phone": data.phone})
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    token = create_access_token(str(admin["_id"]), admin["phone"], "admin")
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=False,
        samesite="lax", max_age=86400, path="/"
    )
    return {
        "id": str(admin["_id"]),
        "phone": admin["phone"],
        "name": admin["name"],
        "role": "admin",
        "token": token
    }

@api_router.post("/auth/customer/login")
async def customer_login(data: CustomerLogin, response: Response):
    # Find customer by name (case-insensitive)
    customer = await db.customers.find_one({"name": {"$regex": f"^{data.name}$", "$options": "i"}})
    if not customer:
        raise HTTPException(status_code=401, detail="Customer not found")
    
    # Check password (hashed) - default password is phone number
    stored_hash = customer.get("password_hash")
    if stored_hash:
        if not verify_password(data.password, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
    else:
        # Legacy: if no password_hash, check against phone number directly
        if data.password != customer.get("phone", ""):
            raise HTTPException(status_code=401, detail="Invalid password")
        # Migrate: hash and store the password
        await db.customers.update_one(
            {"_id": customer["_id"]},
            {"$set": {"password_hash": hash_password(data.password)}}
        )
    
    token = create_access_token(str(customer["_id"]), customer.get("phone", ""), "customer")
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=False,
        samesite="lax", max_age=86400, path="/"
    )
    return {
        "id": str(customer["_id"]),
        "phone": customer.get("phone", ""),
        "name": customer["name"],
        "role": "customer",
        "token": token
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out successfully"}

# ============== CUSTOMER ENDPOINTS ==============
@api_router.get("/customers")
async def get_customers(request: Request, page: int = 1, limit: int = 100):
    await get_current_user(request)  # Auth check
    skip = (page - 1) * limit
    customers = await db.customers.find({}, {"_id": 1, "name": 1, "phone": 1, "email": 1, "dob": 1, "gender": 1}).skip(skip).to_list(limit)
    for c in customers:
        c["id"] = str(c.pop("_id"))
    return customers

@api_router.get("/customers/search")
async def search_customers(q: str, request: Request):
    """Search customers by name or phone for autocomplete"""
    await get_current_user(request)
    if len(q) < 2:
        return []
    query = {"$or": [
        {"name": {"$regex": q, "$options": "i"}},
        {"phone": {"$regex": q}}
    ]}
    customers = await db.customers.find(query, {"_id": 1, "name": 1, "phone": 1, "email": 1, "dob": 1, "gender": 1, "age": 1}).to_list(10)
    for c in customers:
        c["id"] = str(c.pop("_id"))
    return customers


@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, request: Request):
    await get_current_user(request)
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)}, {"_id": 0, "password_hash": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.get("/customers/{customer_id}/orders")
async def get_customer_orders(customer_id: str, request: Request):
    """Get all orders for a specific customer"""
    await get_current_user(request)
    orders = await db.orders.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders


@api_router.put("/customers/{customer_id}/reset-password")
async def reset_customer_password(customer_id: str, request: Request):
    """Admin resets customer password back to their phone number"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    new_password = customer.get("phone", "000000")
    await db.customers.update_one(
        {"_id": ObjectId(customer_id)},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    return {"message": f"Password reset to phone number ({new_password})"}

@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, request: Request):
    """Admin updates customer details"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    body = await request.json()
    update_fields = {}
    for field in ["name", "phone", "email", "gender", "dob"]:
        if field in body:
            update_fields[field] = body[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.customers.update_one({"_id": ObjectId(customer_id)}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer updated"}

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.customers.delete_one({"_id": ObjectId(customer_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}


# ============== ORDER ENDPOINTS ==============
@api_router.post("/orders")
async def create_order(data: OrderCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create or reuse customer — match by phone OR name (case-insensitive)
    customer = await db.customers.find_one({"phone": data.customer_phone})
    if not customer:
        # Fallback: try matching by name (case-insensitive)
        customer = await db.customers.find_one({"name": {"$regex": f"^{data.customer_name}$", "$options": "i"}})
    
    if not customer:
        # New customer — create account with default password = phone
        customer_doc = {
            "name": data.customer_name,
            "phone": data.customer_phone,
            "password_hash": hash_password(data.customer_phone),
            "email": data.customer_email,
            "age": data.customer_age,
            "gender": data.customer_gender,
            "dob": data.customer_dob,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.customers.insert_one(customer_doc)
        customer_id = str(result.inserted_id)
    else:
        customer_id = str(customer["_id"])
        # Update customer info if changed (email, age, gender, dob)
        update_fields = {}
        if data.customer_email and data.customer_email != customer.get("email"):
            update_fields["email"] = data.customer_email
        if data.customer_age and data.customer_age != customer.get("age"):
            update_fields["age"] = data.customer_age
        if data.customer_gender and data.customer_gender != customer.get("gender"):
            update_fields["gender"] = data.customer_gender
        if data.customer_dob and data.customer_dob != customer.get("dob"):
            update_fields["dob"] = data.customer_dob
        if update_fields:
            await db.customers.update_one({"_id": customer["_id"]}, {"$set": update_fields})
    
    # Calculate totals
    subtotal = sum(item.cost for item in data.items)
    tax = subtotal * (data.tax_percentage / 100)
    total = subtotal + tax
    balance = total - data.advance_amount
    
    # Create order
    order_id = await generate_order_id()
    order_doc = {
        "order_id": order_id,
        "customer_id": customer_id,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "order_date": datetime.now(timezone.utc).isoformat(),
        "delivery_date": data.delivery_date,
        "items": [item.model_dump() for item in data.items],
        "measurements": data.measurements or {},
        "subtotal": subtotal,
        "tax_percentage": data.tax_percentage,
        "tax_amount": tax,
        "total": total,
        "advance_amount": data.advance_amount,
        "balance": balance,
        "payments": [],
        "status": "pending",  # pending, in_progress, ready, delivered
        "description": data.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("_id")
    }
    
    if data.advance_amount > 0 and data.advance_date:
        order_doc["payments"].append({
            "amount": data.advance_amount,
            "date": data.advance_date,
            "mode": data.advance_mode or "cash",
            "notes": "Advance payment"
        })
    
    await db.orders.insert_one(order_doc)
    
    # TODO: Send SMS notification
    logger.info(f"Order {order_id} created for {data.customer_name}")
    
    return {"order_id": order_id, "message": "Order created successfully"}

@api_router.get("/orders")
async def get_orders(request: Request, status: Optional[str] = None, page: int = 1, limit: int = 200):
    user = await get_current_user(request)
    
    query = {}
    if user.get("role") == "customer":
        query["customer_id"] = user.get("_id")
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("order_id", 1).skip(skip).to_list(limit)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check access for customers
    if user.get("role") == "customer" and order.get("customer_id") != user.get("_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order

@api_router.put("/orders/{order_id}")
async def update_order(order_id: str, data: OrderUpdate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "items" in update_data:
        items = update_data["items"]
        subtotal = sum(item["cost"] for item in items)
        tax_pct = update_data.get("tax_percentage", 18)
        order = await db.orders.find_one({"order_id": order_id})
        if order:
            tax_pct = update_data.get("tax_percentage", order.get("tax_percentage", 18))
        tax = subtotal * (tax_pct / 100)
        total = subtotal + tax
        paid = sum(p["amount"] for p in order.get("payments", [])) if order else 0
        update_data["subtotal"] = subtotal
        update_data["tax_amount"] = tax
        update_data["total"] = total
        update_data["balance"] = total - paid
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.update_one({"order_id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order updated successfully"}

@api_router.post("/orders/{order_id}/payment")
async def add_payment(order_id: str, data: PaymentUpdate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    payment = {
        "amount": data.amount,
        "date": data.date,
        "mode": data.mode,
        "notes": data.notes
    }
    
    payments = order.get("payments", [])
    payments.append(payment)
    total_paid = sum(p["amount"] for p in payments)
    new_balance = order.get("total", 0) - total_paid
    
    await db.orders.update_one(
        {"order_id": order_id},
        {
            "$push": {"payments": payment},
            "$set": {"balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # TODO: Send SMS if fully paid
    if new_balance <= 0:
        logger.info(f"Order {order_id} fully paid")
    
    return {"message": "Payment recorded", "balance": new_balance}

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    valid_statuses = ["pending", "in_progress", "ready", "delivered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: Send SMS on delivery
    if status == "delivered":
        logger.info(f"Order {order_id} delivered")
    
    return {"message": f"Status updated to {status}"}

class OrderDeleteRequest(BaseModel):
    reason: str

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, data: OrderDeleteRequest, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Archive the order with deletion reason before removing
    order["deleted_at"] = datetime.now(timezone.utc).isoformat()
    order["deleted_by"] = user.get("_id")
    order["deletion_reason"] = data.reason
    await db.deleted_orders.insert_one(order)
    
    await db.orders.delete_one({"order_id": order_id})
    logger.info(f"Order {order_id} deleted. Reason: {data.reason}")
    return {"message": "Order deleted successfully"}

@api_router.post("/orders/{order_id}/images")
async def upload_order_image(order_id: str, file: UploadFile = File(...), image_type: str = "reference", request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    content_type = MIME_TYPES.get(ext, file.content_type or "image/jpeg")
    data = await file.read()
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/orders/{order_id}/{file_id}.{ext}"
    
    try:
        result = put_object(path, data, content_type)
        img_record = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "image_type": image_type,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        await db.orders.update_one({"order_id": order_id}, {"$push": {"images": img_record}})
        return {"id": file_id, "filename": file.filename, "image_type": image_type, "message": "Image uploaded"}
    except Exception as e:
        logger.error(f"Order image upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

@api_router.get("/orders/{order_id}/images/{image_id}")
async def get_order_image(order_id: str, image_id: str, token: Optional[str] = None, request: Request = None):
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
    else:
        await get_current_user(request)
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    images = order.get("images", [])
    img = next((i for i in images if i.get("id") == image_id), None)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        data, ct = get_object(img["storage_path"])
        return Response(content=data, media_type=img.get("content_type", ct))
    except Exception as e:
        logger.error(f"Order image fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to load image")

@api_router.delete("/orders/{order_id}/images/{image_id}")
async def delete_order_image(order_id: str, image_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$pull": {"images": {"id": image_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted"}

# ============== EMPLOYEE ENDPOINTS ==============
@api_router.post("/employees")
async def create_employee(data: EmployeeCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    employee_doc = data.model_dump()
    employee_doc["payments"] = []
    employee_doc["hours_log"] = []
    employee_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.employees.insert_one(employee_doc)
    return {"id": str(result.inserted_id), "message": "Employee created"}

@api_router.get("/employees")
async def get_employees(request: Request, page: int = 1, limit: int = 100):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    skip = (page - 1) * limit
    employees = await db.employees.find({}).skip(skip).to_list(limit)
    for e in employees:
        e["id"] = str(e.pop("_id"))
    return employees

@api_router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    employee = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee["id"] = str(employee.pop("_id"))
    return employee

@api_router.post("/employees/{employee_id}/payment")
async def add_employee_payment(employee_id: str, data: EmployeePayment, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    payment = data.model_dump()
    result = await db.employees.update_one(
        {"_id": ObjectId(employee_id)},
        {"$push": {"payments": payment}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Auto-log hours if payment includes hours (for workers)
    if data.hours and data.hours > 0:
        await db.employees.update_one(
            {"_id": ObjectId(employee_id)},
            {"$push": {"hours_log": {
                "date": data.date,
                "hours": data.hours,
                "order_id": data.order_id or "",
                "item_index": data.item_index,
                "notes": data.notes or ""
            }}}
        )
    
    return {"message": "Payment recorded"}

@api_router.post("/employees/{employee_id}/hours")
async def log_employee_hours(employee_id: str, data: EmployeeHours, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    hours = data.model_dump()
    result = await db.employees.update_one(
        {"_id": ObjectId(employee_id)},
        {"$push": {"hours_log": hours}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Hours logged"}

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, data: EmployeeCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    update_data = {k: v for k, v in data.model_dump().items() if k != "documents"}
    result = await db.employees.update_one({"_id": ObjectId(employee_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee updated"}

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.employees.delete_one({"_id": ObjectId(employee_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted"}

@api_router.post("/employees/{employee_id}/work")
async def assign_work(employee_id: str, data: WorkAssignment, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    work = data.model_dump()
    work["assigned_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.employees.update_one(
        {"_id": ObjectId(employee_id)},
        {"$push": {"work_assignments": work}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Also log hours
    await db.employees.update_one(
        {"_id": ObjectId(employee_id)},
        {"$push": {"hours_log": {
            "date": data.date,
            "hours": data.hours,
            "order_id": data.order_id,
            "item_index": data.item_index,
            "notes": data.notes
        }}}
    )
    return {"message": "Work assigned"}

# ============== REPORT DETAIL ENDPOINTS ==============
@api_router.get("/reports/orders-by-status")
async def get_orders_by_status(status: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    orders = await db.orders.find({"status": status}, {"_id": 0}).sort("delivery_date", 1).to_list(500)
    return orders

@api_router.get("/reports/due-soon")
async def get_due_soon_orders(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    all_orders = await db.orders.find({"status": {"$in": ["pending", "in_progress", "ready"]}}, {"_id": 0, "delivery_date": 1, "order_id": 1, "customer_name": 1, "status": 1}).to_list(500)
    due_soon = []
    for o in all_orders:
        delivery = o.get("delivery_date", "")
        if delivery:
            try:
                dd = datetime.fromisoformat(delivery.replace("Z", "+00:00")) if "T" in delivery else datetime.strptime(delivery, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                days = (dd - now).days
                if days <= 2:
                    o["days_until"] = days
                    due_soon.append(o)
            except:
                pass
    return due_soon

# ============== FILE UPLOAD ENDPOINTS ==============
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "doc": "application/msword", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

@api_router.post("/employees/{employee_id}/documents")
async def upload_employee_document(employee_id: str, file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify employee exists
    employee = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get file extension and content type
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    
    # Read file data
    data = await file.read()
    
    # Generate unique path
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/employees/{employee_id}/{file_id}.{ext}"
    
    try:
        # Upload to storage
        result = put_object(path, data, content_type)
        
        # Create document record
        doc_record = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(data)),
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add to employee's documents array
        await db.employees.update_one(
            {"_id": ObjectId(employee_id)},
            {"$push": {"documents": doc_record}}
        )
        
        return {"id": file_id, "filename": file.filename, "message": "Document uploaded successfully"}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")

@api_router.get("/employees/{employee_id}/documents/{doc_id}")
async def get_employee_document(employee_id: str, doc_id: str, request: Request, token: Optional[str] = None):
    # Support token via query param for direct browser access (new tab)
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin access required")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    else:
        user = await get_current_user(request)
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find employee and document
    employee = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    documents = employee.get("documents", [])
    doc = next((d for d in documents if d.get("id") == doc_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        data, content_type = get_object(doc["storage_path"])
        return Response(
            content=data,
            media_type=doc.get("content_type", content_type),
            headers={"Content-Disposition": f'inline; filename="{doc.get("original_filename", "document")}"'}
        )
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to download document")

@api_router.delete("/employees/{employee_id}/documents/{doc_id}")
async def delete_employee_document(employee_id: str, doc_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Remove document from employee's array (soft delete - storage has no delete API)
    result = await db.employees.update_one(
        {"_id": ObjectId(employee_id)},
        {"$pull": {"documents": {"id": doc_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted"}

# ============== MATERIALS ENDPOINTS ==============
@api_router.post("/materials")
async def create_material(data: MaterialCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    material_doc = data.model_dump()
    material_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.materials.insert_one(material_doc)
    return {"id": str(result.inserted_id), "message": "Material added"}

@api_router.get("/materials")
async def get_materials(request: Request, page: int = 1, limit: int = 200):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    skip = (page - 1) * limit
    materials = await db.materials.find({}).sort("purchase_date", -1).skip(skip).to_list(limit)
    for m in materials:
        m["id"] = str(m.pop("_id"))
    return materials

# ============== GALLERY ENDPOINTS ==============
@api_router.post("/gallery")
async def add_gallery_item(data: GalleryCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    gallery_doc = data.model_dump()
    gallery_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.gallery.insert_one(gallery_doc)
    return {"id": str(result.inserted_id), "message": "Gallery item added"}

@api_router.get("/gallery")
async def get_gallery():
    items = await db.gallery.find({}).sort("created_at", -1).to_list(100)
    for item in items:
        item["id"] = str(item.pop("_id"))
    return items

@api_router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.gallery.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted"}

@api_router.post("/gallery/upload")
async def upload_gallery_image(file: UploadFile = File(...), title: str = "Untitled", category: str = "", request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    content_type = MIME_TYPES.get(ext, file.content_type or "image/jpeg")
    data = await file.read()
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/gallery/{file_id}.{ext}"
    
    try:
        result = put_object(path, data, content_type)
        image_url = result.get("url", f"/api/gallery/image/{file_id}")
        
        gallery_doc = {
            "title": title,
            "image_url": image_url,
            "storage_path": result["path"],
            "category": category,
            "file_id": file_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        insert_result = await db.gallery.insert_one(gallery_doc)
        return {"id": str(insert_result.inserted_id), "image_url": image_url, "message": "Image uploaded"}
    except Exception as e:
        logger.error(f"Gallery upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

@api_router.get("/gallery/image/{file_id}")
async def get_gallery_image(file_id: str):
    item = await db.gallery.find_one({"file_id": file_id})
    if not item or "storage_path" not in item:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        data, content_type = get_object(item["storage_path"])
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"Gallery image fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to load image")


# ============== REVIEWS ENDPOINTS ==============
@api_router.get("/reviews")
async def get_reviews():
    items = await db.reviews.find({}).sort("created_at", -1).to_list(100)
    for item in items:
        item["id"] = str(item.pop("_id"))
    return items

@api_router.post("/reviews")
async def create_review(data: ReviewCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reviews.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Review added"}

@api_router.put("/reviews/{review_id}")
async def update_review(review_id: str, data: ReviewCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    update_data = data.model_dump()
    result = await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review updated"}

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

@api_router.get("/reviews/stats")
async def get_review_stats():
    reviews = await db.reviews.find({}).to_list(500)
    total = len(reviews)
    if total == 0:
        return {"total": 0, "average": 0, "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in reviews:
        rating = r.get("rating", 5)
        if rating in distribution:
            distribution[rating] += 1
    average = round(sum(r.get("rating", 5) for r in reviews) / total, 1)
    return {"total": total, "average": average, "distribution": distribution}


# ============== WHATSAPP MESSAGE HELPER ==============
@api_router.get("/orders/{order_id}/whatsapp-message")
async def get_whatsapp_message(order_id: str, message_type: str = "status_update", request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    phone = order.get("customer_phone", "")
    name = order.get("customer_name", "Customer")
    status = order.get("status", "pending")
    total = order.get("total", 0)
    balance = order.get("balance", 0)
    delivery = order.get("delivery_date", "")
    
    status_labels = {"pending": "Pending", "in_progress": "In Progress", "ready": "Ready for Pickup", "delivered": "Delivered"}
    
    if message_type == "order_created":
        msg = (f"Hello {name},\n\n"
               f"Your order #{order_id} has been created at Kshana Contour!\n\n"
               f"Total: Rs.{total:.0f}\n"
               f"Delivery Date: {delivery}\n\n"
               f"Thank you for choosing Kshana Contour!")
    elif message_type == "status_update":
        msg = (f"Hello {name},\n\n"
               f"Your order #{order_id} status has been updated to: *{status_labels.get(status, status)}*\n")
        if status == "ready":
            msg += f"\nYour order is ready for pickup! Please visit us at your convenience."
        elif status == "delivered":
            msg += f"\nThank you for choosing Kshana Contour! We hope you love it."
        if balance > 0:
            msg += f"\n\nBalance Due: Rs.{balance:.0f}"
        msg += f"\n\n- Kshana Contour"
    elif message_type == "payment_reminder":
        msg = (f"Hello {name},\n\n"
               f"Gentle reminder for order #{order_id}.\n"
               f"Balance Due: Rs.{balance:.0f}\n\n"
               f"- Kshana Contour")
    else:
        msg = f"Hello {name}, regarding your order #{order_id} at Kshana Contour."
    
    # Format phone for wa.me (add 91 if needed)
    wa_phone = phone.strip().replace(" ", "")
    if not wa_phone.startswith("91"):
        wa_phone = "91" + wa_phone
    
    import urllib.parse
    wa_url = f"https://wa.me/{wa_phone}?text={urllib.parse.quote(msg)}"
    
    return {"message": msg, "whatsapp_url": wa_url, "phone": wa_phone}

# ============== REPORTS/DASHBOARD ENDPOINTS ==============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get all orders with projection for performance
    all_orders = await db.orders.find({}, {"_id": 0, "order_id": 1, "status": 1, "total": 1, "balance": 1, "created_at": 1, "delivery_date": 1, "customer_name": 1}).to_list(5000)
    
    # Calculate stats
    monthly_orders = [o for o in all_orders if o.get("created_at", "")[:10] >= start_of_month.isoformat()[:10]]
    weekly_orders = [o for o in all_orders if o.get("created_at", "")[:10] >= start_of_week.isoformat()[:10]]
    
    monthly_income = sum(o.get("total", 0) - o.get("balance", 0) for o in monthly_orders)
    weekly_income = sum(o.get("total", 0) - o.get("balance", 0) for o in weekly_orders)
    
    pending_delivery = len([o for o in all_orders if o.get("status") in ["pending", "in_progress", "ready"]])
    in_progress = len([o for o in all_orders if o.get("status") == "in_progress"])
    ready_to_deliver = len([o for o in all_orders if o.get("status") == "ready"])
    
    # Orders due within 2 days
    due_soon = []
    for o in all_orders:
        if o.get("status") in ["pending", "in_progress", "ready"]:
            delivery_date = o.get("delivery_date", "")
            if delivery_date:
                try:
                    dd = datetime.fromisoformat(delivery_date.replace("Z", "+00:00")) if "T" in delivery_date else datetime.strptime(delivery_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    days_until = (dd - now).days
                    if days_until <= 2:
                        due_soon.append({
                            "order_id": o.get("order_id"),
                            "customer_name": o.get("customer_name"),
                            "delivery_date": delivery_date,
                            "days_until": days_until
                        })
                except:
                    pass
    
    return {
        "monthly_orders": len(monthly_orders),
        "weekly_orders": len(weekly_orders),
        "monthly_income": monthly_income,
        "weekly_income": weekly_income,
        "pending_delivery": pending_delivery,
        "in_progress": in_progress,
        "ready_to_deliver": ready_to_deliver,
        "due_soon": due_soon,
        "due_soon_count": len(due_soon)
    }

@api_router.get("/dashboard/charts")
async def get_chart_data(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get orders from last 12 months
    now = datetime.now(timezone.utc)
    twelve_months_ago = now - timedelta(days=365)
    
    all_orders = await db.orders.find({}, {"_id": 0, "created_at": 1, "total": 1, "balance": 1}).to_list(5000)
    monthly_data = {}
    for i in range(12):
        month_date = now - timedelta(days=30*i)
        month_key = month_date.strftime("%Y-%m")
        month_name = month_date.strftime("%b")
        monthly_data[month_key] = {"month": month_name, "orders": 0, "income": 0}
    
    for order in all_orders:
        created = order.get("created_at", "")[:7]  # YYYY-MM
        if created in monthly_data:
            monthly_data[created]["orders"] += 1
            monthly_data[created]["income"] += order.get("total", 0) - order.get("balance", 0)
    
    # Sort and return
    sorted_data = sorted(monthly_data.items(), key=lambda x: x[0])
    return [v for k, v in sorted_data]

@api_router.get("/reports/financial-summary")
async def get_financial_summary(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    all_orders = await db.orders.find({}, {"_id": 0, "total": 1, "balance": 1, "payments": 1, "created_at": 1, "status": 1, "order_id": 1}).to_list(5000)
    all_employees = await db.employees.find({}, {"payments": 1, "name": 1}).to_list(500)
    all_materials = await db.materials.find({}, {"_id": 0, "cost": 1, "quantity": 1, "purchase_date": 1, "name": 1, "payment_mode": 1}).to_list(5000)
    
    # === ORDER INCOME ===
    total_order_value = sum(o.get("total", 0) for o in all_orders)
    total_received = 0
    all_income_payments = []
    for o in all_orders:
        for p in o.get("payments", []):
            total_received += p.get("amount", 0)
            all_income_payments.append({
                "order_id": o.get("order_id"),
                "customer_name": o.get("customer_name"),
                "customer_phone": o.get("customer_phone"),
                "amount": p.get("amount", 0),
                "date": p.get("date", ""),
                "mode": p.get("mode", ""),
                "notes": p.get("notes", "")
            })
    total_balance = sum(o.get("balance", 0) for o in all_orders)
    
    # Sort income by date desc
    all_income_payments.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # === PENDING PAYMENTS (overdue) ===
    pending_overdue = []
    pending_upcoming = []
    for o in all_orders:
        if o.get("balance", 0) > 0:
            delivery = o.get("delivery_date", "")
            is_overdue = False
            if delivery:
                try:
                    dd = datetime.fromisoformat(delivery.replace("Z", "+00:00")) if "T" in delivery else datetime.strptime(delivery, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    is_overdue = dd < now
                except:
                    pass
            entry = {
                "order_id": o.get("order_id"),
                "customer_name": o.get("customer_name"),
                "customer_phone": o.get("customer_phone"),
                "total": o.get("total", 0),
                "balance": o.get("balance", 0),
                "delivery_date": delivery,
                "status": o.get("status", ""),
                "is_overdue": is_overdue
            }
            if is_overdue:
                pending_overdue.append(entry)
            else:
                pending_upcoming.append(entry)
    
    # === EMPLOYEE PAYMENTS ===
    total_employee_payments = 0
    all_employee_payments = []
    for e in all_employees:
        eid = str(e.get("_id", ""))
        for p in e.get("payments", []):
            total_employee_payments += p.get("amount", 0)
            all_employee_payments.append({
                "employee_name": e.get("name"),
                "employee_role": e.get("role"),
                "amount": p.get("amount", 0),
                "date": p.get("date", ""),
                "mode": p.get("mode", ""),
                "notes": p.get("notes", "")
            })
    all_employee_payments.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # === MATERIAL PAYMENTS ===
    total_material_cost = sum(m.get("cost", 0) for m in all_materials)
    all_material_payments = []
    for m in all_materials:
        all_material_payments.append({
            "material_name": m.get("name"),
            "supplier": m.get("supplier", ""),
            "amount": m.get("cost", 0),
            "date": m.get("purchase_date", ""),
            "mode": m.get("payment_mode", ""),
            "quantity": m.get("quantity", 0),
            "unit": m.get("unit", "")
        })
    all_material_payments.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {
        "orders": {
            "total_value": total_order_value,
            "total_received": total_received,
            "total_balance": total_balance,
            "order_count": len(all_orders),
            "payments": all_income_payments
        },
        "pending": {
            "overdue": pending_overdue,
            "overdue_total": sum(p["balance"] for p in pending_overdue),
            "upcoming": pending_upcoming,
            "upcoming_total": sum(p["balance"] for p in pending_upcoming)
        },
        "employees": {
            "total_paid": total_employee_payments,
            "payment_count": len(all_employee_payments),
            "payments": all_employee_payments
        },
        "materials": {
            "total_cost": total_material_cost,
            "item_count": len(all_material_payments),
            "payments": all_material_payments
        },
        "net_summary": {
            "total_income": total_received,
            "total_outgoing": total_employee_payments + total_material_cost,
            "net_profit": total_received - total_employee_payments - total_material_cost
        }
    }

@api_router.get("/export/all-data")
async def export_all_data(request: Request):
    """Export all data for Excel downloads"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    all_orders = await db.orders.find({}, {"_id": 0}).sort("order_id", 1).to_list(5000)
    all_employees = await db.employees.find({}).to_list(500)
    for e in all_employees:
        e["id"] = str(e.pop("_id"))
    all_materials = await db.materials.find({}, {"_id": 0}).to_list(5000)
    all_partnership = await db.partnership.find({}, {"_id": 0}).to_list(5000)
    
    return {
        "orders": all_orders,
        "employees": all_employees,
        "materials": all_materials,
        "partnership": all_partnership
    }



# ============== PARTNERSHIP ENDPOINTS ==============
@api_router.get("/reports/partnership")
async def get_partnership_report(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    entries = await db.partnership.find({}, {"_id": 0}).to_list(5000)
    
    chandana_total = sum(e.get("chandana", 0) for e in entries)
    akanksha_total = sum(e.get("akanksha", 0) for e in entries)
    sbi_total = sum(e.get("sbi", 0) for e in entries)
    
    # Get all order income (goes to Kshana account)
    all_orders = await db.orders.find({}, {"_id": 0, "total": 1, "balance": 1, "payments": 1}).to_list(5000)
    total_order_income = sum(p.get("amount", 0) for o in all_orders for p in o.get("payments", []))
    total_order_value = sum(o.get("total", 0) for o in all_orders)
    total_balance = sum(o.get("balance", 0) for o in all_orders)
    
    # Kshana account: income - sbi outgoing
    kshana_balance = total_order_income - sbi_total
    
    # Total business expenses = personal investments + sbi payments
    total_expenses = chandana_total + akanksha_total + sbi_total
    
    # Profit = total income - total expenses
    profit = total_order_income - sbi_total  # SBI expenses from business account
    # Net after returning investments
    net_after_investments = profit  # this is what's left in business after SBI expenses
    # But both partners also invested personally, so total investment = chandana + akanksha
    # Profit to split = income - all expenses (sbi + employee pay from orders etc already in sbi)
    # Simple: profit = kshana_balance (income - sbi_outgoing)
    
    # Monthly breakdown
    monthly = {}
    all_months = set()
    for e in entries:
        month = e.get("date", "")[:7]
        if month:
            all_months.add(month)
            if month not in monthly:
                monthly[month] = {"month": month, "chandana_invested": 0, "akanksha_invested": 0, "sbi_outgoing": 0, "income": 0}
            monthly[month]["chandana_invested"] += e.get("chandana", 0)
            monthly[month]["akanksha_invested"] += e.get("akanksha", 0)
            monthly[month]["sbi_outgoing"] += e.get("sbi", 0)
    
    # Monthly income from orders
    for o in all_orders:
        for p in o.get("payments", []):
            pdate = p.get("date", "")[:7]
            if pdate:
                all_months.add(pdate)
                if pdate not in monthly:
                    monthly[pdate] = {"month": pdate, "chandana_invested": 0, "akanksha_invested": 0, "sbi_outgoing": 0, "income": 0}
                monthly[pdate]["income"] += p.get("amount", 0)
    
    sorted_monthly = sorted(monthly.values(), key=lambda x: x["month"])
    
    # Calculate running settlement per month
    # Logic: Track cumulative income vs cumulative expenses
    # First settle investments (return to each partner), then split profit 50/50
    # Also track Kshana outgoing entries that are tagged as withdrawals
    running_chandana_invested = 0
    running_akanksha_invested = 0
    running_income = 0
    running_sbi = 0
    running_chandana_settled = 0
    running_akanksha_settled = 0
    
    # Check Kshana outgoing entries for partner withdrawals
    # Entries with paid_to containing "Chandana" or "Akanksha" in SBI are withdrawals
    chandana_withdrawals = 0
    akanksha_withdrawals = 0
    for e in entries:
        if e.get("sbi", 0) > 0:
            paid_to = (e.get("paid_to", "") or "").lower()
            reason = (e.get("reason", "") or "").lower()
            if "chandana" in paid_to or "chandana" in reason:
                chandana_withdrawals += e.get("sbi", 0)
            elif "akanksha" in paid_to or "akanksha" in reason or "akankasha" in paid_to:
                akanksha_withdrawals += e.get("sbi", 0)
    
    for m in sorted_monthly:
        running_chandana_invested += m.get("chandana_invested", 0)
        running_akanksha_invested += m.get("akanksha_invested", 0)
        running_income += m.get("income", 0)
        running_sbi += m.get("sbi_outgoing", 0)
        
        # Available pool = total income so far - total SBI expenses so far
        pool = running_income - running_sbi
        total_to_return = running_chandana_invested + running_akanksha_invested
        
        if pool > 0:
            if pool >= total_to_return:
                # Enough to return both investments + split profit
                remaining = pool - total_to_return
                m["chandana_settlement"] = running_chandana_invested + remaining / 2
                m["akanksha_settlement"] = running_akanksha_invested + remaining / 2
            else:
                # Partial return proportionally
                ratio_c = running_chandana_invested / total_to_return if total_to_return > 0 else 0.5
                ratio_a = running_akanksha_invested / total_to_return if total_to_return > 0 else 0.5
                m["chandana_settlement"] = pool * ratio_c
                m["akanksha_settlement"] = pool * ratio_a
        else:
            m["chandana_settlement"] = 0
            m["akanksha_settlement"] = 0
        
        m["cumulative_income"] = running_income
        m["cumulative_sbi"] = running_sbi
        m["cumulative_chandana"] = running_chandana_invested
        m["cumulative_akanksha"] = running_akanksha_invested
        m["pool"] = pool
    
    # Chandana detail entries
    chandana_entries = [e for e in entries if e.get("chandana", 0) > 0]
    akanksha_entries = [e for e in entries if e.get("akanksha", 0) > 0]
    sbi_entries = [e for e in entries if e.get("sbi", 0) > 0]
    
    # Income payments for kshana account
    income_payments = []
    for o in all_orders:
        for p in o.get("payments", []):
            income_payments.append({
                "order_id": o.get("order_id"),
                "customer_name": o.get("customer_name"),
                "amount": p.get("amount", 0),
                "date": p.get("date", ""),
                "mode": p.get("mode", "")
            })
    income_payments.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # Equal split calculation
    profit_pool = total_order_income - sbi_total
    chandana_return = chandana_total
    akanksha_return = akanksha_total
    remaining_after_returns = profit_pool - chandana_total - akanksha_total
    equal_share = remaining_after_returns / 2 if remaining_after_returns > 0 else 0
    chandana_gets = chandana_return + equal_share
    akanksha_gets = akanksha_return + equal_share
    
    return {
        "chandana": {
            "total_invested": chandana_total,
            "entries": chandana_entries,
            "entry_count": len(chandana_entries),
            "return_amount": chandana_return,
            "profit_share": equal_share,
            "total_gets": chandana_gets,
            "withdrawals": chandana_withdrawals
        },
        "akanksha": {
            "total_invested": akanksha_total,
            "entries": akanksha_entries,
            "entry_count": len(akanksha_entries),
            "return_amount": akanksha_return,
            "profit_share": equal_share,
            "total_gets": akanksha_gets,
            "withdrawals": akanksha_withdrawals
        },
        "kshana_account": {
            "total_income": total_order_income,
            "total_sbi_outgoing": sbi_total,
            "balance": kshana_balance,
            "sbi_entries": sbi_entries,
            "income_payments": income_payments
        },
        "summary": {
            "total_order_value": total_order_value,
            "total_income_received": total_order_income,
            "total_balance_due": total_balance,
            "chandana_invested": chandana_total,
            "akanksha_invested": akanksha_total,
            "total_invested": chandana_total + akanksha_total,
            "sbi_expenses": sbi_total,
            "profit_pool": profit_pool,
            "remaining_after_returns": remaining_after_returns,
            "equal_share_each": equal_share
        },
        "monthly": sorted_monthly
    }

# ============== PARTNERSHIP CRUD ENDPOINTS ==============
class PartnershipEntry(BaseModel):
    date: str
    order: Optional[str] = "NA"
    reason: str
    paid_to: str
    chandana: float = 0
    akanksha: float = 0
    sbi: float = 0
    mode: str = "UPI"
    comments: Optional[str] = ""

@api_router.get("/partnership/entries")
async def get_partnership_entries(partner: Optional[str] = None, request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    query = {}
    if partner == "chandana":
        query["chandana"] = {"$gt": 0}
    elif partner == "akanksha":
        query["akanksha"] = {"$gt": 0}
    elif partner == "sbi":
        query["sbi"] = {"$gt": 0}
    entries = await db.partnership.find(query).sort("date", -1).to_list(5000)
    for e in entries:
        e["id"] = str(e.pop("_id"))
    return entries

@api_router.post("/partnership/entries")
async def create_partnership_entry(data: PartnershipEntry, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    doc = data.model_dump()
    result = await db.partnership.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Entry added"}

@api_router.put("/partnership/entries/{entry_id}")
async def update_partnership_entry(entry_id: str, data: PartnershipEntry, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.partnership.update_one({"_id": ObjectId(entry_id)}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry updated"}

@api_router.delete("/partnership/entries/{entry_id}")
async def delete_partnership_entry(entry_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.partnership.delete_one({"_id": ObjectId(entry_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}

# ============== MATERIALS EDIT/DELETE ==============
@api_router.put("/materials/{material_id}")
async def update_material(material_id: str, data: MaterialCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.materials.update_one({"_id": ObjectId(material_id)}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"message": "Material updated"}

@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.materials.delete_one({"_id": ObjectId(material_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"message": "Material deleted"}

# ============== ROOT ENDPOINT ==============
@api_router.get("/")
async def root():
    return {"message": "Kshana Contour Boutique API"}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== STARTUP EVENT ==============
@app.on_event("startup")
async def startup_event():
    # Create indexes - wrapped in try/except so app starts even if DB is slow
    try:
        await db.customers.create_index("phone", unique=True)
        await db.admins.create_index("phone", unique=True)
        await db.orders.create_index("order_id", unique=True)
        await db.orders.create_index("customer_id")
    except Exception as e:
        logger.warning(f"Index creation deferred: {e}")
    
    # Seed admin if not exists
    try:
        admin_phone = os.environ.get("ADMIN_PHONE", "9876543210")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        
        existing_admin = await db.admins.find_one({"phone": admin_phone})
        if not existing_admin:
            await db.admins.insert_one({
                "phone": admin_phone,
                "password_hash": hash_password(admin_password),
                "name": "Admin",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Admin seeded with phone: {admin_phone}")
    except Exception as e:
        logger.warning(f"Admin seeding deferred: {e}")
    
    logger.info("Kshana Contour API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
