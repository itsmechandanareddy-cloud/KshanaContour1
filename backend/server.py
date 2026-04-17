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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

# ============== GMAIL SMTP CONFIG ==============
GMAIL_EMAIL = os.environ.get("GMAIL_EMAIL", "kshanaconture@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

# In-memory store for verification codes (code -> {admin_id, expires_at})
verification_codes = {}

def send_verification_email(code: str):
    """Send 6-digit verification code to Kshana email via Gmail SMTP"""
    if not GMAIL_APP_PASSWORD:
        raise Exception("Gmail App Password not configured. Set GMAIL_APP_PASSWORD in environment.")
    
    msg = MIMEMultipart()
    msg["From"] = GMAIL_EMAIL
    msg["To"] = GMAIL_EMAIL
    msg["Subject"] = "Kshana Contour - Password Change Verification"
    
    body = f"""
    <div style="font-family: 'Georgia', serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #FDFBF7; border: 1px solid #EFEBE4;">
        <h2 style="color: #2D2420; font-weight: 400; margin-bottom: 20px;">Kshana Contour</h2>
        <p style="color: #5C504A; font-size: 14px;">A password change was requested for your admin account.</p>
        <div style="background: #2D2420; color: #D19B5A; text-align: center; padding: 20px; margin: 20px 0; font-size: 32px; letter-spacing: 8px; font-weight: bold;">
            {code}
        </div>
        <p style="color: #8A7D76; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>
    """
    msg.attach(MIMEText(body, "html"))
    
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
        server.send_message(msg)
    
    logger.info(f"Verification code sent to {GMAIL_EMAIL}")



def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to Cloudinary"""
    if not CLOUDINARY_URL:
        raise Exception("Storage not configured. Set CLOUDINARY_URL.")
    import io
    result = cloudinary.uploader.upload(
        io.BytesIO(data),
        public_id=path,
        resource_type="auto",
        folder="kshana-contour"
    )
    return {"url": result["secure_url"], "public_id": result["public_id"], "path": result.get("public_id", path)}

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
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour

# Create the main app
app = FastAPI(title="Kshana Contour Boutique API")

# CORS middleware - MUST be added FIRST before routes
cors_origins = os.environ.get("CORS_ORIGINS", "*")
if cors_origins == "*":
    origins_list = ["*"]
else:
    origins_list = [o.strip() for o in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

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
    tax_percentage: float = 0
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


class AdminUpdateCredentials(BaseModel):
    current_password: str
    new_phone: Optional[str] = None
    new_password: Optional[str] = None

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


@api_router.post("/auth/admin/send-verification-code")
async def send_admin_verification_code(request: Request):
    """Send a 6-digit verification code to Kshana email for password change"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    body = await request.json()
    current_password = body.get("current_password", "")
    if not current_password:
        raise HTTPException(status_code=400, detail="Current password required")
    
    admin = await db.admins.find_one({"_id": ObjectId(user["_id"])})
    if not admin or not verify_password(current_password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    code = str(secrets.randbelow(900000) + 100000)
    verification_codes[user["_id"]] = {
        "code": code,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    
    try:
        send_verification_email(code)
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
    
    return {"message": "Verification code sent to Kshana email"}


@api_router.put("/auth/admin/update-credentials")
async def update_admin_credentials(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    body = await request.json()
    current_password = body.get("current_password", "")
    verification_code = body.get("verification_code", "")
    new_phone = body.get("new_phone", "")
    new_password = body.get("new_password", "")
    
    admin = await db.admins.find_one({"_id": ObjectId(user["_id"])})
    if not admin or not verify_password(current_password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Verify the email code
    stored = verification_codes.get(user["_id"])
    if not stored:
        raise HTTPException(status_code=400, detail="No verification code sent. Send code first.")
    if stored["expires_at"] < datetime.now(timezone.utc):
        verification_codes.pop(user["_id"], None)
        raise HTTPException(status_code=400, detail="Verification code expired. Request a new one.")
    if stored["code"] != verification_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Code is valid - clear it
    verification_codes.pop(user["_id"], None)
    
    update = {}
    if new_phone:
        update["phone"] = new_phone
    if new_password:
        update["password_hash"] = hash_password(new_password)
    if not update:
        raise HTTPException(status_code=400, detail="No changes provided")
    await db.admins.update_one({"_id": admin["_id"]}, {"$set": update})
    return {"message": "Credentials updated successfully"}


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
    
    # Auto-create Partnership income entry for advance payment
    if data.advance_amount > 0 and data.advance_date:
        adv_mode = (data.advance_mode or "cash").upper()
        is_upi = adv_mode in ["UPI", "UPI + CASH", "CARD", "BANK TRANSFER"]
        is_cash = adv_mode in ["CASH"]
        items_desc = ", ".join([i.description or i.service_type for i in data.items[:2]])
        await db.partnership.insert_one({
            "date": data.advance_date,
            "order": order_id,
            "reason": f"Customer Payment - {items_desc}" if items_desc else "Customer Payment",
            "paid_to": data.customer_name,
            "chandana": 0, "akanksha": 0, "sbi": 0,
            "kshana": data.advance_amount if is_upi else 0,
            "cash": data.advance_amount if is_cash else 0,
            "mode": adv_mode,
            "comments": "Advance payment",
            "type": "income"
        })
    
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
        tax_pct = update_data.get("tax_percentage", 0)
        order = await db.orders.find_one({"order_id": order_id})
        if order:
            tax_pct = update_data.get("tax_percentage", order.get("tax_percentage", 0))
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
    
    # Auto-create Partnership income entry (UPI → kshana, Cash → cash)
    mode_upper = (data.mode or "").upper()
    is_upi = mode_upper in ["UPI", "UPI + CASH", "CARD", "BANK TRANSFER"]
    is_cash = mode_upper in ["CASH"]
    customer_name = order.get("customer_name", "")
    items_desc = ", ".join([i.get("description", i.get("service_type", "")) for i in order.get("items", [])[:2]])
    
    partnership_entry = {
        "date": data.date,
        "order": order_id,
        "reason": f"Customer Payment - {items_desc}" if items_desc else "Customer Payment",
        "paid_to": customer_name,
        "chandana": 0, "akanksha": 0, "sbi": 0,
        "kshana": data.amount if is_upi else 0,
        "cash": data.amount if is_cash else 0,
        "mode": mode_upper,
        "comments": data.notes or ("Full payment" if new_balance <= 0 else "Partial payment"),
        "type": "income"
    }
    await db.partnership.insert_one(partnership_entry)
    
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
            "storage_path": result.get("path", path),
            "category": category,
            "file_id": file_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        insert_result = await db.gallery.insert_one(gallery_doc)
        return {"id": str(insert_result.inserted_id), "image_url": image_url, "message": "Image uploaded"}
    except Exception as e:
        logger.error(f"Gallery upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

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


@api_router.get("/gallery/cloudinary-config")
async def get_cloudinary_config(request: Request):
    """Return Cloudinary upload config for direct browser upload"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if not CLOUDINARY_URL:
        raise HTTPException(status_code=500, detail="Cloudinary not configured")
    
    import time, hashlib
    timestamp = int(time.time())
    cloud_name = cloudinary.config().cloud_name
    api_key = cloudinary.config().api_key
    api_secret = cloudinary.config().api_secret
    folder = "kshana-contour/gallery"
    
    # Generate signature
    params = f"folder={folder}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(params.encode()).hexdigest()
    
    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "signature": signature,
        "timestamp": timestamp,
        "folder": folder
    }

@api_router.post("/gallery/save")
async def save_gallery_image(request: Request):
    """Save a Cloudinary-uploaded image URL to gallery"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    body = await request.json()
    image_url = body.get("image_url")
    title = body.get("title", "Untitled")
    category = body.get("category", "")
    public_id = body.get("public_id", "")
    
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url required")
    
    file_id = str(uuid.uuid4())
    gallery_doc = {
        "title": title,
        "image_url": image_url,
        "storage_path": public_id,
        "category": category,
        "file_id": file_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.gallery.insert_one(gallery_doc)
    return {"id": str(result.inserted_id), "image_url": image_url, "message": "Image saved to gallery"}


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
    
    # Overall financials
    total_income = sum(o.get("total", 0) - o.get("balance", 0) for o in all_orders)
    
    # Get all outgoing: partnership expenses (SBI + Chandana + Akanksha)
    all_expenses = await db.partnership.find({"type": {"$ne": "income"}}, {"_id": 0, "chandana": 1, "akanksha": 1, "sbi": 1}).to_list(5000)
    total_chandana = sum(e.get("chandana", 0) for e in all_expenses)
    total_akanksha = sum(e.get("akanksha", 0) for e in all_expenses)
    total_sbi = sum(e.get("sbi", 0) for e in all_expenses)
    total_outgoing = total_chandana + total_akanksha + total_sbi
    net_profit = total_income - total_sbi  # Profit = income - business expenses (SBI)
    total_balance_due = sum(o.get("balance", 0) for o in all_orders)
    
    return {
        "monthly_orders": len(monthly_orders),
        "weekly_orders": len(weekly_orders),
        "monthly_income": monthly_income,
        "weekly_income": weekly_income,
        "pending_delivery": pending_delivery,
        "in_progress": in_progress,
        "ready_to_deliver": ready_to_deliver,
        "due_soon": due_soon,
        "due_soon_count": len(due_soon),
        "total_income": total_income,
        "total_outgoing_sbi": total_sbi,
        "total_invested_chandana": total_chandana,
        "total_invested_akanksha": total_akanksha,
        "total_outgoing_all": total_outgoing,
        "net_profit": net_profit,
        "total_balance_due": total_balance_due
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
    all_orders = await db.orders.find({}, {"_id": 0, "total": 1, "balance": 1, "payments": 1, "created_at": 1, "status": 1, "order_id": 1, "customer_name": 1, "customer_phone": 1, "delivery_date": 1}).to_list(5000)
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
    
    # Separate income and expense entries
    expense_entries = [e for e in entries if e.get("type") != "income"]
    income_entries = [e for e in entries if e.get("type") == "income"]
    
    chandana_total = sum(e.get("chandana", 0) for e in expense_entries)
    akanksha_total = sum(e.get("akanksha", 0) for e in expense_entries)
    sbi_total = sum(e.get("sbi", 0) for e in expense_entries)
    
    # Income from partnership income entries (kshana=UPI, cash=Cash)
    kshana_income_total = sum(e.get("kshana", 0) for e in income_entries)
    cash_income_total = sum(e.get("cash", 0) for e in income_entries)
    total_order_income = kshana_income_total + cash_income_total
    
    # Also get order totals for balance tracking
    all_orders = await db.orders.find({}, {"_id": 0, "total": 1, "balance": 1, "payments": 1, "order_id": 1, "customer_name": 1}).to_list(5000)
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
    for e in expense_entries:
        month = e.get("date", "")[:7]
        if month:
            all_months.add(month)
            if month not in monthly:
                monthly[month] = {"month": month, "chandana_invested": 0, "akanksha_invested": 0, "sbi_outgoing": 0, "income": 0, "kshana_income": 0, "cash_income": 0}
            monthly[month]["chandana_invested"] += e.get("chandana", 0)
            monthly[month]["akanksha_invested"] += e.get("akanksha", 0)
            monthly[month]["sbi_outgoing"] += e.get("sbi", 0)
    
    # Monthly income from income partnership entries
    for e in income_entries:
        month = e.get("date", "")[:7]
        if month:
            all_months.add(month)
            if month not in monthly:
                monthly[month] = {"month": month, "chandana_invested": 0, "akanksha_invested": 0, "sbi_outgoing": 0, "income": 0, "kshana_income": 0, "cash_income": 0}
            monthly[month]["kshana_income"] += e.get("kshana", 0)
            monthly[month]["cash_income"] += e.get("cash", 0)
            monthly[month]["income"] += e.get("kshana", 0) + e.get("cash", 0)
    
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
    for e in expense_entries:
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
    chandana_entries = [e for e in expense_entries if e.get("chandana", 0) > 0]
    akanksha_entries = [e for e in expense_entries if e.get("akanksha", 0) > 0]
    sbi_entries = [e for e in expense_entries if e.get("sbi", 0) > 0]
    
    # Income payments from partnership income entries
    kshana_income_entries = [e for e in income_entries if e.get("kshana", 0) > 0]
    cash_income_entries_list = [e for e in income_entries if e.get("cash", 0) > 0]
    
    # Build income payments list for display
    income_payments = []
    for e in income_entries:
        income_payments.append({
            "order_id": e.get("order", ""),
            "customer_name": e.get("paid_to", ""),
            "amount": e.get("kshana", 0) + e.get("cash", 0),
            "date": e.get("date", ""),
            "mode": e.get("mode", ""),
            "item": e.get("reason", "").replace("Customer Payment - ", ""),
            "comments": e.get("comments", "")
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
            "kshana_upi_income": kshana_income_total,
            "cash_income": cash_income_total,
            "total_sbi_outgoing": sbi_total,
            "balance": kshana_balance,
            "sbi_entries": sbi_entries,
            "kshana_income_entries": kshana_income_entries,
            "cash_income_entries": cash_income_entries_list,
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
    kshana: float = 0
    cash: float = 0
    mode: str = "UPI"
    comments: Optional[str] = ""
    type: Optional[str] = "expense"

@api_router.get("/partnership/entries")
async def get_partnership_entries(partner: Optional[str] = None, entry_type: Optional[str] = None, request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    query = {}
    if entry_type == "income":
        query["type"] = "income"
    elif entry_type == "expense":
        query["type"] = {"$ne": "income"}
    if partner == "chandana":
        query["chandana"] = {"$gt": 0}
    elif partner == "akanksha":
        query["akanksha"] = {"$gt": 0}
    elif partner == "sbi":
        query["sbi"] = {"$gt": 0}
    elif partner == "kshana":
        query["kshana"] = {"$gt": 0}
    elif partner == "cash":
        query["cash"] = {"$gt": 0}
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

@api_router.get("/health")
async def health_check():
    """Health check that also ensures admin is seeded"""
    try:
        admin_phone = os.environ.get("ADMIN_PHONE", "9876543210")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        existing = await db.admins.find_one({"phone": admin_phone})
        if not existing:
            await db.admins.insert_one({
                "phone": admin_phone,
                "password_hash": hash_password(admin_password),
                "name": "Admin",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"status": "ok", "admin_seeded": True}
        return {"status": "ok", "admin_seeded": False}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# Include the router in the main app
app.include_router(api_router)

# ============== SEED ENDPOINT (trigger via browser after deploy) ==============
@app.get("/api/seed-production-data")
async def seed_production_data(secret: str = ""):
    """One-time endpoint to seed orders + income payments into production DB.
    Call: /api/seed-production-data?secret=kshana2026seed
    """
    if secret != "kshana2026seed":
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    import bcrypt as _bcrypt
    results = {"orders_created": 0, "customers_created": 0, "orders_payment_updated": 0, "income_entries": 0}
    
    def hp(pw): return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt()).decode()
    now = datetime.now(timezone.utc).isoformat()
    
    # ===== ORDERS DATA =====
    orders_data = [
        {"num":1,"name":"Varsha","phone":"9110249832","items":[{"service_type":"Blouse","description":"4 blouse","cost":35000,"has_work":True}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":35000},
        {"num":2,"name":"Ganga","phone":"7676862493","items":[{"service_type":"Blouse","description":"1 Blouse + Fall + Kuchchu","cost":1500,"has_work":False}],"delivery":"2026-02-01","status":"delivered","paid":False,"total":1500},
        {"num":3,"name":"Nagaratna","phone":"9986503138","items":[{"service_type":"Blouse","description":"1 Blouse + Fall + Kuchchu","cost":2800,"has_work":True},{"service_type":"Blouse","description":"1 Blouse + Fall + Kuchchu","cost":500,"has_work":True}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":3300},
        {"num":4,"name":"Padma","phone":"973820253","items":[{"service_type":"Blouse","description":"1 Blouse","cost":750,"has_work":False}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":750},
        {"num":5,"name":"Vaishnavi","phone":"7204679593","items":[{"service_type":"Blouse","description":"1 Blouse","cost":3500,"has_work":True},{"service_type":"Blouse","description":"1 Blouse","cost":2500,"has_work":True}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":6000},
        {"num":6,"name":"Hemabindhu","phone":"9391671113","items":[{"service_type":"Blouse","description":"1 blouse + Semi-stitched lehenga","cost":1500,"has_work":False}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":1500},
        {"num":7,"name":"Vishala","phone":"9980868408","items":[{"service_type":"Kurta","description":"2 Kurta","cost":17800,"has_work":False}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":17800},
        {"num":8,"name":"Padmaja","phone":"9980868408","items":[{"service_type":"Blouse","description":"5 blouses","cost":0,"has_work":True}],"delivery":"2026-02-05","status":"delivered","paid":True,"total":0},
        {"num":9,"name":"Shifana","phone":"9035467145","items":[{"service_type":"Alteration","description":"Alteration","cost":140,"has_work":False}],"delivery":"2026-01-30","status":"delivered","paid":True,"total":140},
        {"num":10,"name":"Chandra","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse","cost":750,"has_work":False},{"service_type":"Saree Work","description":"1 saree - baby kuchchu","cost":500,"has_work":False}],"delivery":"2026-02-06","status":"delivered","paid":True,"total":1250},
        {"num":11,"name":"Apoorva","phone":"7702728889","items":[{"service_type":"Alteration","description":"Alteration","cost":200,"has_work":False}],"delivery":"2026-01-30","status":"delivered","paid":True,"total":200},
        {"num":12,"name":"Kavitha","phone":"9141368072","items":[{"service_type":"Blouse","description":"1 Blouse + Fall + Zig zag","cost":870,"has_work":False}],"delivery":"2026-02-16","status":"delivered","paid":True,"total":870},
        {"num":13,"name":"Sunaina","phone":"7417915055","items":[{"service_type":"Kurta","description":"1 top + palazzo","cost":1300,"has_work":False}],"delivery":"2026-02-12","status":"delivered","paid":True,"total":1300},
        {"num":14,"name":"Shoba","phone":"7619417869","items":[{"service_type":"Blouse","description":"3 Blouse","cost":2850,"has_work":True}],"delivery":"2026-02-07","status":"ready","paid":False,"total":2850},
        {"num":15,"name":"Yamuna","phone":"9966124846","items":[{"service_type":"Blouse","description":"1 Blouse + Alteration + 1 fall","cost":1020,"has_work":False}],"delivery":"2026-02-24","status":"pending","paid":False,"total":1020},
        {"num":16,"name":"Mangala","phone":"9113060276","items":[{"service_type":"Blouse","description":"7 Blouse + 1 Lehenga Blouse + 1 kurta","cost":9750,"has_work":False}],"delivery":"2026-02-07","status":"delivered","paid":True,"total":9750},
        {"num":17,"name":"Aarthi","phone":"9886049790","items":[{"service_type":"Blouse","description":"1 blouse padded + prince cut","cost":1200,"has_work":False}],"delivery":"2026-02-28","status":"pending","paid":False,"total":1200},
        {"num":18,"name":"Mahima","phone":"9242146952","items":[{"service_type":"Blouse","description":"1 Blouse (work only)","cost":6000,"has_work":True}],"delivery":"2026-02-13","status":"delivered","paid":True,"total":6000},
        {"num":19,"name":"Madhavi","phone":"8296224567","items":[{"service_type":"Kurta","description":"3 Kurta + 1 Set + 3 Blouses","cost":6900,"has_work":False}],"delivery":"2026-02-13","status":"delivered","paid":True,"total":6900},
        {"num":20,"name":"Adbul Moideen","phone":"9449255813","items":[{"service_type":"Kurta","description":"3 Kurta","cost":4200,"has_work":False}],"delivery":"2026-02-13","status":"pending","paid":False,"total":4200},
        {"num":21,"name":"Sunitha","phone":"9242146952","items":[{"service_type":"Blouse","description":"1 Blouse (with work)","cost":6000,"has_work":True}],"delivery":"2026-02-13","status":"pending","paid":False,"total":6000},
        {"num":22,"name":"Veena","phone":"9972511788","items":[{"service_type":"Blouse","description":"6 Blouse","cost":15000,"has_work":True}],"delivery":"2026-02-13","status":"cancelled","paid":False,"total":15000},
        {"num":23,"name":"Suma","phone":"9008567247","items":[{"service_type":"Blouse","description":"3 blouse","cost":12500,"has_work":True}],"delivery":"2026-02-13","status":"pending","paid":False,"total":12500},
        {"num":24,"name":"Divya","phone":"8095689375","items":[{"service_type":"Blouse","description":"1 Blouse","cost":1200,"has_work":False}],"delivery":"2026-02-14","status":"pending","paid":False,"total":1200},
        {"num":25,"name":"Kavitha","phone":"9632690619","items":[{"service_type":"Kurta","description":"2 Kurta","cost":2500,"has_work":False}],"delivery":"2026-02-11","status":"delivered","paid":True,"total":2500},
        {"num":26,"name":"Priya","phone":"7976070160","items":[{"service_type":"Alteration","description":"Alteration","cost":50,"has_work":False}],"delivery":"2026-02-02","status":"delivered","paid":True,"total":50},
        {"num":27,"name":"Mahima","phone":"9740287105","items":[{"service_type":"Blouse","description":"2 blouse","cost":2600,"has_work":False}],"delivery":"2026-02-09","status":"ready","paid":False,"total":2600},
        {"num":28,"name":"Pushpa","phone":"9964388656","items":[{"service_type":"Blouse","description":"2 Blouse + 2 sarees falls","cost":1700,"has_work":False}],"delivery":"2026-02-15","status":"delivered","paid":True,"total":1700},
        {"num":29,"name":"Dolly Yadav","phone":"","items":[{"service_type":"Blouse","description":"3 Blouse + Alteration","cost":2250,"has_work":False}],"delivery":"2026-02-15","status":"pending","paid":False,"total":2250},
        {"num":30,"name":"Monisha","phone":"8861404505","items":[{"service_type":"Blouse","description":"1 Blouse + 2 Saree fall","cost":3500,"has_work":True}],"delivery":"2026-02-18","status":"delivered","paid":False,"total":3500},
        {"num":31,"name":"Shreya","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse","cost":850,"has_work":False}],"delivery":"2026-02-19","status":"delivered","paid":True,"total":850},
        {"num":32,"name":"Pragathi","phone":"7760627990","items":[{"service_type":"Saree Work","description":"Lace + Fall + Zig Zag","cost":350,"has_work":False}],"delivery":"2026-02-15","status":"delivered","paid":True,"total":350},
        {"num":33,"name":"Lakshmi","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse + Baby Kuchchu + Falls","cost":4600,"has_work":True}],"delivery":"2026-02-24","status":"delivered","paid":True,"total":4600},
        {"num":34,"name":"Swetha","phone":"9901502439","items":[{"service_type":"Pant","description":"2 pant + 1 Kurta + 1 blouse","cost":3000,"has_work":False}],"delivery":"2026-02-14","status":"delivered","paid":True,"total":3000},
        {"num":35,"name":"Anitha","phone":"9663473188","items":[{"service_type":"Blouse","description":"2 Blouse","cost":0,"has_work":True}],"delivery":"2026-01-15","status":"pending","paid":False,"total":0},
        {"num":36,"name":"Mahima Mother","phone":"9740287105","items":[{"service_type":"Blouse","description":"1 Blouse","cost":650,"has_work":False}],"delivery":"2026-02-16","status":"delivered","paid":True,"total":650},
        {"num":37,"name":"Bhoomika","phone":"","items":[{"service_type":"Blouse","description":"1 Blouse","cost":870,"has_work":False}],"delivery":"2026-02-16","status":"delivered","paid":True,"total":870},
        {"num":38,"name":"Veena","phone":"","items":[{"service_type":"Blouse","description":"6 blouses","cost":15000,"has_work":True}],"delivery":"2026-02-13","status":"delivered","paid":True,"total":15000},
        {"num":39,"name":"Kausalya","phone":"8861691166","items":[{"service_type":"Blouse","description":"1 Blouse + Saree Fall + Zig zag","cost":800,"has_work":False}],"delivery":"2026-02-23","status":"delivered","paid":True,"total":800},
        {"num":40,"name":"Amrutha","phone":"9036027109","items":[{"service_type":"Blouse","description":"1 Blouse + Saree Zig zag","cost":850,"has_work":False}],"delivery":"2026-02-21","status":"pending","paid":False,"total":850},
        {"num":41,"name":"Chethana","phone":"9739352224","items":[{"service_type":"Blouse","description":"6 Blouse + Saree Falls","cost":6250,"has_work":True}],"delivery":"2026-02-28","status":"delivered","paid":True,"total":6250},
        {"num":42,"name":"NA","phone":"","items":[{"service_type":"Saree Work","description":"Baby Kuchchu + Falls","cost":500,"has_work":False}],"delivery":"2026-02-18","status":"delivered","paid":True,"total":500},
        {"num":43,"name":"Roopa","phone":"9164885030","items":[{"service_type":"Blouse","description":"1 Blouse (work)","cost":2750,"has_work":True}],"delivery":"2026-02-27","status":"pending","paid":False,"total":2750},
        {"num":44,"name":"Geetha","phone":"","items":[{"service_type":"Blouse","description":"1 blouse","cost":850,"has_work":False}],"delivery":"2026-02-21","status":"delivered","paid":True,"total":850},
        {"num":45,"name":"Latha","phone":"9449533347","items":[{"service_type":"Blouse","description":"2 blouse","cost":4500,"has_work":True}],"delivery":"2026-02-28","status":"pending","paid":False,"total":4500},
        {"num":46,"name":"Jocelyn","phone":"8527718100","items":[{"service_type":"Blouse","description":"1 Blouse","cost":850,"has_work":False}],"delivery":"2026-02-28","status":"pending","paid":False,"total":850},
        {"num":47,"name":"Rashmi","phone":"9035180076","items":[{"service_type":"Blouse","description":"4 Blouse","cost":3850,"has_work":False}],"delivery":"2026-02-26","status":"delivered","paid":True,"total":3850},
        {"num":48,"name":"Deevika","phone":"8050725062","items":[{"service_type":"Blouse","description":"2 blouse","cost":950,"has_work":False}],"delivery":"2026-03-06","status":"pending","paid":False,"total":950},
        {"num":49,"name":"Lakshmi","phone":"9731440736","items":[{"service_type":"Blouse","description":"2 Padded blouse + 1 Blouse work + Kuchchu Zig Zag","cost":6400,"has_work":True}],"delivery":"2026-03-06","status":"pending","paid":False,"total":6400},
        {"num":50,"name":"Shonima","phone":"9980948020","items":[{"service_type":"Blouse","description":"1 Padded blouse","cost":1200,"has_work":False}],"delivery":"2026-02-28","status":"pending","paid":False,"total":1200},
        {"num":51,"name":"Swetha Sister","phone":"","items":[{"service_type":"Blouse","description":"2 Blouse","cost":0,"has_work":False}],"delivery":"2026-03-09","status":"pending","paid":False,"total":0},
        {"num":52,"name":"Netra","phone":"","items":[{"service_type":"Alteration","description":"Alteration","cost":20,"has_work":False}],"delivery":"2026-03-04","status":"delivered","paid":True,"total":20},
        {"num":53,"name":"Yamuna","phone":"9966124846","items":[{"service_type":"Blouse","description":"Lehenga + blouse","cost":2000,"has_work":False}],"delivery":"2026-03-13","status":"pending","paid":False,"total":2000},
        {"num":54,"name":"Mamatha","phone":"8105326863","items":[{"service_type":"Kurta","description":"top Pant","cost":850,"has_work":False}],"delivery":"2026-03-12","status":"pending","paid":False,"total":850},
        {"num":55,"name":"Apoorva","phone":"9686558677","items":[{"service_type":"Blouse","description":"blouse padded + Fall zig zag","cost":1400,"has_work":False}],"delivery":"2026-03-10","status":"delivered","paid":True,"total":1400},
        {"num":56,"name":"Saroja","phone":"7892631732","items":[{"service_type":"Blouse","description":"2 blouses","cost":1500,"has_work":False}],"delivery":"2026-03-11","status":"pending","paid":False,"total":1500},
        {"num":57,"name":"Raisha","phone":"7337877635","items":[{"service_type":"Dress","description":"Dress","cost":1300,"has_work":False}],"delivery":"2026-03-15","status":"pending","paid":False,"total":1300},
        {"num":58,"name":"Varsha","phone":"9110249832","items":[{"service_type":"Blouse","description":"1 blouse padded","cost":1200,"has_work":False}],"delivery":"2026-03-15","status":"pending","paid":False,"total":1200},
        {"num":59,"name":"Sowmya","phone":"9513887825","items":[{"service_type":"Blouse","description":"Lehenga + blouse","cost":2400,"has_work":False}],"delivery":"2026-03-20","status":"pending","paid":False,"total":2400},
        {"num":60,"name":"Keerthana","phone":"","items":[{"service_type":"Kurta","description":"2 kurta","cost":0,"has_work":False}],"delivery":"","status":"pending","paid":False,"total":0},
        {"num":61,"name":"Druthi","phone":"","items":[{"service_type":"Blouse","description":"1 blouse","cost":900,"has_work":False}],"delivery":"","status":"pending","paid":False,"total":900},
        {"num":62,"name":"Mythri","phone":"","items":[{"service_type":"Blouse","description":"3 blouses","cost":2500,"has_work":False}],"delivery":"2026-03-13","status":"delivered","paid":True,"total":2500},
        {"num":63,"name":"Amreen","phone":"9739501701","items":[{"service_type":"Kurta","description":"1 kurta","cost":1200,"has_work":False}],"delivery":"2026-03-20","status":"pending","paid":False,"total":1200},
        {"num":64,"name":"Meera","phone":"9740266006","items":[{"service_type":"Blouse","description":"1 blouse","cost":1050,"has_work":False}],"delivery":"2026-03-20","status":"pending","paid":False,"total":1050},
    ]
    
    # Clear and reseed orders + customers
    await db.orders.delete_many({})
    await db.customers.delete_many({})
    
    for o in orders_data:
        order_id = f"KSH-{o['num']:02d}"
        customer_id = ""
        if o["phone"]:
            cust = await db.customers.find_one({"phone": o["phone"]})
            if not cust:
                r = await db.customers.insert_one({"name": o["name"], "phone": o["phone"], "password_hash": hp(o["phone"]), "email": "", "age": None, "gender": "female", "created_at": now})
                customer_id = str(r.inserted_id)
                results["customers_created"] += 1
            else:
                customer_id = str(cust["_id"])
        
        items = [{"service_type": it["service_type"], "description": it["description"], "cost": it["cost"], "padded": it.get("padded", False), "princess_cut": it.get("princess_cut", False), "open_style": False, "front_neck_img": "", "back_neck_img": ""} for it in o["items"]]
        payments = [{"amount": o["total"], "date": o["delivery"] or "2026-02-01", "mode": "cash", "notes": "Full payment"}] if o["paid"] and o["total"] > 0 else []
        balance = 0 if o["paid"] else o["total"]
        
        # Use delivery date as created_at for historical bulk-imported orders
        order_created = now
        if o.get("delivery"):
            try:
                order_created = datetime.strptime(o["delivery"], "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
            except:
                order_created = now
        
        await db.orders.insert_one({"order_id": order_id, "customer_id": customer_id, "customer_name": o["name"], "customer_phone": o["phone"], "customer_email": "", "items": items, "measurements": {}, "subtotal": o["total"], "tax_percentage": 0, "tax_amount": 0, "total": o["total"], "payments": payments, "balance": balance, "status": o["status"], "delivery_date": o.get("delivery") or "", "description": "", "created_at": order_created, "images": []})
        results["orders_created"] += 1
    
    # ===== INCOME PAYMENTS =====
    income_payments = [
        {"date":"2026-01-13","order":1,"customer":"Varsha","item":"Blouse","amount":5000,"mode":"UPI","comments":"Advance"},
        {"date":"2026-01-16","order":1,"customer":"Varsha","item":"Blouse","amount":10000,"mode":"UPI","comments":"Advance"},
        {"date":"2026-02-05","order":1,"customer":"Varsha","item":"Blouse","amount":20000,"mode":"UPI","comments":"Payment clearance"},
        {"date":"2026-02-18","order":4,"customer":"Padma","item":"1 Blouse","amount":750,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-09","order":5,"customer":"Vaishnavi","item":"2 Blouses","amount":6000,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-08","order":6,"customer":"Hemabindhu","item":"Semi-stitched lehenga","amount":1500,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-01-30","order":9,"customer":"Shifana","item":"Alteration","amount":140,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-07","order":10,"customer":"Chandra","item":"Kuchchu","amount":500,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-02-10","order":10,"customer":"Chandra","item":"Blouse","amount":700,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-01-02","order":11,"customer":"Apoorva","item":"Alteration","amount":200,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-26","order":12,"customer":"Kavitha","item":"1 Blouse + Falls + Zig Zag","amount":850,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-03-02","order":13,"customer":"Sunaina","item":"Kurta","amount":1300,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-03-04","order":15,"customer":"Yamuna","item":"2 blouses + Fall + zigzag","amount":1700,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-02-19","order":16,"customer":"Mangala","item":"7 Blouse + Lehenga + kurta","amount":9000,"mode":"UPI","comments":"Partial payment"},
        {"date":"2026-03-04","order":23,"customer":"Suma","item":"3 blouse","amount":7200,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-02-21","order":24,"customer":"Divya","item":"1 Blouse","amount":1000,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-20","order":25,"customer":"Kavitha","item":"2 kurta","amount":2500,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-14","order":27,"customer":"Mahima","item":"2 blouse","amount":2400,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-23","order":28,"customer":"Pushpa","item":"2 Blouse + 2 sarees falls","amount":1700,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-05","order":29,"customer":"Dolly Yadav","item":"3 Blouse + Alteration","amount":2000,"mode":"UPI","comments":"Partial payment"},
        {"date":"2026-02-24","order":30,"customer":"Monisha","item":"2 blouse + saree fall + Kuchchu","amount":2000,"mode":"UPI","comments":"Partial payment"},
        {"date":"2026-02-21","order":31,"customer":"Shreya","item":"1 Blouse","amount":850,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-16","order":32,"customer":"Pragathi","item":"Saree falls and lace","amount":350,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-23","order":33,"customer":"Lakshmi","item":"1 Blouse + Baby Kuchchu + Falls","amount":4600,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-15","order":34,"customer":"Swetha","item":"All Items","amount":3000,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-03","order":36,"customer":"Mahima Mother","item":"1 blouse","amount":650,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-18","order":37,"customer":"Bhoomika","item":"1 Blouse","amount":870,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-15","order":38,"customer":"Veena","item":"6 blouses","amount":10000,"mode":"UPI","comments":"Partial payment"},
        {"date":"2026-03-02","order":39,"customer":"Kausalya","item":"1 Blouse + Falls + Zig Zag","amount":800,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-02-18","order":41,"customer":"Chethana","item":"6 Blouse","amount":2000,"mode":"UPI","comments":"Advance"},
        {"date":"2026-03-02","order":41,"customer":"Chethana","item":"6 Blouse","amount":6250,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-21","order":43,"customer":"Roopa","item":"1 blouse","amount":1000,"mode":"UPI","comments":"Advance"},
        {"date":"2026-03-05","order":43,"customer":"Roopa","item":"1 blouse","amount":1750,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-21","order":44,"customer":"Geetha","item":"1 blouse","amount":850,"mode":"UPI","comments":"Advance"},
        {"date":"2026-02-22","order":45,"customer":"Latha","item":"2 blouse","amount":3000,"mode":"CASH","comments":"Advance"},
        {"date":"2026-02-23","order":46,"customer":"Jocelyn","item":"1 Blouse","amount":250,"mode":"UPI","comments":"Advance"},
        {"date":"2026-03-05","order":46,"customer":"Jocelyn","item":"1 Blouse","amount":600,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-02","order":47,"customer":"Rashmi","item":"4 Blouse","amount":3850,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-05","order":50,"customer":"Shonima/Deepa","item":"1 blouse","amount":1200,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-04","order":53,"customer":"Yamuna","item":"Lehenga + blouse","amount":800,"mode":"CASH","comments":"Advance"},
        {"date":"2026-03-14","order":54,"customer":"Mamatha","item":"1 kurta","amount":850,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-10","order":55,"customer":"Apoorva","item":"1 blouse + Fall + Zigzag","amount":1400,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-15","order":56,"customer":"Saroja","item":"2 Blouse","amount":1500,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-03-16","order":57,"customer":"Raisha","item":"1 kurta","amount":1400,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-02-22","order":"21&18","customer":"Sunitha & Mahima","item":"2 blouse","amount":12000,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-06","order":"7&8","customer":"Padmaja & Vishala","item":"Blouse and Kurta","amount":17800,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-02-15","order":62,"customer":"Mythri","item":"3 blouses","amount":2500,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-03-12","order":20,"customer":"Adbul Moideen","item":"3 Kurta","amount":4700,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-07","order":17,"customer":"Aarthi","item":"1 blouse","amount":1200,"mode":"UPI","comments":"Full payment"},
        {"date":"2026-03-01","order":42,"customer":"NA","item":"kuchchu","amount":500,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-03-12","order":49,"customer":"Lakshmi","item":"2 Padded blouse + Kuchchu Zig Zag","amount":6400,"mode":"CASH","comments":"Full payment"},
        {"date":"2026-03-17","order":19,"customer":"Madhavi","item":"4 kurta + 1 set + Blouse 3 + Fall Zig Zag","amount":6900,"mode":"UPI","comments":"Full payment"},
    ]
    
    # Group and update order payments
    order_payments = {}
    for p in income_payments:
        ok = p["order"]
        if isinstance(ok, str) and "&" in ok:
            parts = [int(x.strip()) for x in ok.split("&")]
            for part in parts:
                order_payments.setdefault(part, []).append({"amount": p["amount"], "date": p["date"], "mode": p["mode"].upper(), "notes": f"{p['comments']} ({p['customer']})"})
        else:
            order_payments.setdefault(int(ok), []).append({"amount": p["amount"], "date": p["date"], "mode": p["mode"].upper(), "notes": f"{p['comments']} ({p['customer']})"})
    
    for order_num, payments in order_payments.items():
        order_id = f"KSH-{order_num:02d}"
        order = await db.orders.find_one({"order_id": order_id})
        if order:
            total_paid = sum(pp["amount"] for pp in payments)
            balance = max(0, order.get("total", 0) - total_paid)
            await db.orders.update_one({"order_id": order_id}, {"$set": {"payments": payments, "balance": balance}})
            results["orders_payment_updated"] += 1
    
    # Create partnership income entries
    await db.partnership.delete_many({"type": "income"})
    income_entries = []
    for p in income_payments:
        ok = p["order"]
        order_str = "&".join([f"KSH-{int(x.strip()):02d}" for x in str(ok).split("&")]) if isinstance(ok, str) and "&" in ok else f"KSH-{int(ok):02d}"
        mu = p["mode"].upper()
        income_entries.append({"date": p["date"], "order": order_str, "reason": f"Customer Payment - {p['item']}", "paid_to": p["customer"], "chandana": 0, "akanksha": 0, "sbi": 0, "kshana": p["amount"] if mu in ["UPI","UPI + CASH"] else 0, "cash": p["amount"] if mu in ["CASH","UPI + CASH"] else 0, "mode": mu, "comments": p["comments"], "type": "income"})
    
    if income_entries:
        await db.partnership.insert_many(income_entries)
        results["income_entries"] = len(income_entries)
    
    # ===== PARTNERSHIP EXPENSE DATA (Chandana/Akanksha investments + SBI outgoing) =====
    await db.partnership.delete_many({"type": {"$ne": "income"}})
    expense_entries = [
        {"date":"2026-01-02","order":"NA","reason":"SIM Cards","paid_to":"Airtel","chandana":300,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-02","order":"NA","reason":"CC camera","paid_to":"Amazon","chandana":4199,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-02","order":"1","reason":"Kuchchu","paid_to":"Ramaa","chandana":0,"akanksha":1350,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-06","order":"1","reason":"Kuchchu","paid_to":"Ramaa","chandana":450,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-06","order":"NA","reason":"Tabrez Flight ticket","paid_to":"NA","chandana":0,"akanksha":9551,"sbi":0,"mode":"Card","comments":"","type":"expense"},
        {"date":"2026-01-14","order":"NA","reason":"Shop interior","paid_to":"Arun","chandana":20000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-21","order":"NA","reason":"Shop interior","paid_to":"Arun","chandana":20000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-19","order":"NA","reason":"Ceiling fan","paid_to":"Amazon","chandana":0,"akanksha":2000,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Sofa stitching","paid_to":"Harshith","chandana":1000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Sofa cloth","paid_to":"Mohammed Rafi","chandana":4000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop Interior","paid_to":"Arun","chandana":20000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials (Storage organizers)","paid_to":"Blinkit","chandana":1251,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials (Storage bags)","paid_to":"Blinkit","chandana":1328,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials (Cleaning)","paid_to":"Blinkit","chandana":2049,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials (Extension boxes)","paid_to":"Blinkit","chandana":1030,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials","paid_to":"Blinkit","chandana":1543,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials","paid_to":"Blinkit","chandana":2853,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials","paid_to":"Blinkit","chandana":1890,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Shop essentials","paid_to":"Blinkit","chandana":1947,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Wifi","paid_to":"Atria Convergence","chandana":1979,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-27","order":"NA","reason":"Agreement, fruits and flowers","paid_to":"Srinivasa Reddy","chandana":3000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-28","order":"NA","reason":"Pooja","paid_to":"Anand Swamy","chandana":5000,"akanksha":0,"sbi":0,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-01-28","order":"NA","reason":"Food","paid_to":"Nandhini","chandana":4700,"akanksha":0,"sbi":0,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-01-29","order":"NA","reason":"Owner advance","paid_to":"Shop Owner","chandana":0,"akanksha":50000,"sbi":0,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-01-29","order":"NA","reason":"Tabrez","paid_to":"Shop","chandana":50000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-29","order":"NA","reason":"Tabrez","paid_to":"Shop","chandana":0,"akanksha":100000,"sbi":0,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-01-30","order":"NA","reason":"Tabrez","paid_to":"Shop","chandana":50000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-30","order":"NA","reason":"Tabrez Room advance","paid_to":"Room advance","chandana":40000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-28","order":"NA","reason":"Shop essentials (Containers, Dust bin)","paid_to":"Zepto","chandana":0,"akanksha":1788,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-01-28","order":"NA","reason":"Name board","paid_to":"Preeti Dodmani","chandana":0,"akanksha":4500,"sbi":0,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-01-28","order":"NA","reason":"Sweets for pooja","paid_to":"Swiggy","chandana":0,"akanksha":1089,"sbi":0,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-01-28","order":"NA","reason":"Fan for boutique","paid_to":"Amazon","chandana":0,"akanksha":2000,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-02","order":"NA","reason":"Name board rectification","paid_to":"Preeti Dodmani","chandana":0,"akanksha":600,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-07","order":"NA","reason":"Ragib Payment","paid_to":"Ragib","chandana":0,"akanksha":8500,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-03","order":"NA","reason":"Shop Rent - February","paid_to":"Venkatanarayana","chandana":0,"akanksha":12000,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-07","order":"NA","reason":"Tabrez - lining and other material","paid_to":"Tabrez","chandana":0,"akanksha":2000,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-07","order":"NA","reason":"Tabrez - Varsha blouse workers payment","paid_to":"Tabrez","chandana":0,"akanksha":15000,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-07","order":"NA","reason":"Tahseen - Salary","paid_to":"Tahseen","chandana":0,"akanksha":5500,"sbi":0,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-02-08","order":"4,5,12,19","reason":"Worker Salary Feb 1st week","paid_to":"Tabrez","chandana":0,"akanksha":5700,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-10","order":"12,14,15,32","reason":"Falls, Kuchchu and Zigzag (Nagaratna redo)","paid_to":"Anitha","chandana":0,"akanksha":1250,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-15","order":"NA","reason":"Ragib Payment","paid_to":"Ragib","chandana":0,"akanksha":0,"sbi":5600,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-15","order":"NA","reason":"Bill books","paid_to":"Ranjith","chandana":0,"akanksha":3750,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-15","order":"NA","reason":"Tahseen - Salary","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":5500,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-16","order":"19,18,23","reason":"Worker Salary Feb 2nd week + Material","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":9667,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-18","order":"NA","reason":"Shop Interior","paid_to":"Arun","chandana":20000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-18","order":"NA","reason":"Falls, Kuchchu and Zigzag","paid_to":"Anitha","chandana":0,"akanksha":0,"sbi":500,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-02-19","order":"NA","reason":"Falls Zig+Zag","paid_to":"Anitha","chandana":0,"akanksha":350,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-23","order":"23,13,33,30,41","reason":"Worker salary Feb 3rd week","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":6080,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-23","order":"NA","reason":"Blouse cutting","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":3332,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-23","order":"NA","reason":"Blouse cutting","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":3000,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-02-27","order":"NA","reason":"Blouse cutting","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":850,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-02-27","order":"NA","reason":"Dad Salary","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":10000,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-02","order":"NA","reason":"Falls, Kuchchu and Zigzag","paid_to":"Anitha","chandana":0,"akanksha":0,"sbi":1130,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-02","order":"NA","reason":"Blouse cutting","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":3022,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-02","order":"NA","reason":"Blouse cutting","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":866,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-02-23","order":"NA","reason":"Tahseen - Salary","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":5500,"mode":"UPI","comments":"2000 Cash + 1500 UPI","type":"expense"},
        {"date":"2026-03-09","order":"NA","reason":"Worker room rent","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":8000,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-09","order":"NA","reason":"Tahseen - Salary","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":5500,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-09","order":"NA","reason":"Materials - Market","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":7800,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-03-09","order":"NA","reason":"Blouse cutting","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":4660,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-09","order":"NA","reason":"Falls, Kuchchu and Zigzag","paid_to":"Anitha","chandana":0,"akanksha":0,"sbi":1330,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-11","order":"NA","reason":"Worker salary March 1st week","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":5130,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-11","order":"NA","reason":"Tabrez","paid_to":"Srinivasa Reddy","chandana":100000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-16","order":"NA","reason":"Shop interior","paid_to":"Arun","chandana":10000,"akanksha":0,"sbi":0,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-17","order":"NA","reason":"Falls, Kuchchu and Zigzag","paid_to":"Anitha","chandana":0,"akanksha":0,"sbi":850,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-17","order":"NA","reason":"Worker salary March 2nd week","paid_to":"Tabrez","chandana":0,"akanksha":0,"sbi":1805,"mode":"UPI","comments":"","type":"expense"},
        {"date":"2026-03-17","order":"NA","reason":"Tahseen - Salary","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":5500,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-03-17","order":"NA","reason":"Khadim - tailor","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":1500,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-03-17","order":"NA","reason":"Hathik - worker","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":1000,"mode":"Cash","comments":"","type":"expense"},
        {"date":"2026-03-17","order":"NA","reason":"Lining and other material","paid_to":"Srinivasa Reddy","chandana":0,"akanksha":0,"sbi":1000,"mode":"Cash","comments":"","type":"expense"},
    ]
    await db.partnership.insert_many(expense_entries)
    results["expense_entries"] = len(expense_entries)
    
    # ===== SEED EMPLOYEES WITH PAYMENT RECORDS =====
    await db.employees.delete_many({})
    employees_data = [
        {"name":"Tabrez","role":"Master","phone":"","pay_type":"weekly","salary":0,"payments":[
            {"amount":15000,"date":"2026-02-07","mode":"UPI","notes":"Varsha blouse workers payment"},
            {"amount":2000,"date":"2026-02-07","mode":"UPI","notes":"Lining and other material"},
            {"amount":5700,"date":"2026-02-08","mode":"UPI","notes":"Worker Salary Feb 1st week - KSH-04,05,12,19"},
            {"amount":9667,"date":"2026-02-16","mode":"UPI","notes":"Worker Salary Feb 2nd week + Material - KSH-19,18,23"},
            {"amount":6080,"date":"2026-02-23","mode":"UPI","notes":"Worker salary Feb 3rd week - KSH-23,13,33,30,41"},
            {"amount":3332,"date":"2026-02-23","mode":"UPI","notes":"Blouse cutting"},
            {"amount":3000,"date":"2026-02-23","mode":"Cash","notes":"Blouse cutting"},
            {"amount":850,"date":"2026-02-27","mode":"Cash","notes":"Blouse cutting"},
            {"amount":3022,"date":"2026-03-02","mode":"UPI","notes":"Blouse cutting"},
            {"amount":866,"date":"2026-03-02","mode":"UPI","notes":"Blouse cutting"},
            {"amount":8000,"date":"2026-03-09","mode":"UPI","notes":"Worker room rent"},
            {"amount":4660,"date":"2026-03-09","mode":"UPI","notes":"Blouse cutting"},
            {"amount":5130,"date":"2026-03-11","mode":"UPI","notes":"Worker salary March 1st week"},
            {"amount":1805,"date":"2026-03-17","mode":"UPI","notes":"Worker salary March 2nd week"},
        ]},
        {"name":"Tahseen","role":"Worker","phone":"","pay_type":"monthly","salary":5500,"payments":[
            {"amount":5500,"date":"2026-02-07","mode":"Cash","notes":"Salary - Feb 1st"},
            {"amount":5500,"date":"2026-02-15","mode":"UPI","notes":"Salary - Feb 2nd (via Srinivasa Reddy)"},
            {"amount":5500,"date":"2026-02-23","mode":"UPI","notes":"Salary (2000 Cash + 1500 UPI via Srinivasa Reddy)"},
            {"amount":5500,"date":"2026-03-09","mode":"UPI","notes":"Salary - Mar (via Srinivasa Reddy)"},
            {"amount":5500,"date":"2026-03-17","mode":"Cash","notes":"Salary - Mar 2nd (via Srinivasa Reddy)"},
        ]},
        {"name":"Ragib","role":"Worker","phone":"","pay_type":"monthly","salary":0,"payments":[
            {"amount":8500,"date":"2026-02-07","mode":"UPI","notes":"Payment"},
            {"amount":5600,"date":"2026-02-15","mode":"UPI","notes":"Payment (from SBI)"},
        ]},
        {"name":"Anitha","role":"Worker","phone":"","pay_type":"weekly","salary":0,"payments":[
            {"amount":1250,"date":"2026-02-10","mode":"UPI","notes":"Falls, Kuchchu, Zigzag - KSH-12,14,15,32"},
            {"amount":500,"date":"2026-02-18","mode":"Cash","notes":"Falls, Kuchchu, Zigzag"},
            {"amount":350,"date":"2026-02-19","mode":"UPI","notes":"Falls Zig+Zag"},
            {"amount":1130,"date":"2026-03-02","mode":"UPI","notes":"Falls, Kuchchu, Zigzag"},
            {"amount":1330,"date":"2026-03-09","mode":"UPI","notes":"Falls, Kuchchu, Zigzag"},
            {"amount":850,"date":"2026-03-17","mode":"UPI","notes":"Falls, Kuchchu, Zigzag"},
        ]},
        {"name":"Khadim","role":"Tailor","phone":"","pay_type":"monthly","salary":0,"payments":[
            {"amount":1500,"date":"2026-03-17","mode":"Cash","notes":"Tailor payment (via Srinivasa Reddy)"},
        ]},
        {"name":"Hathik","role":"Worker","phone":"","pay_type":"monthly","salary":0,"payments":[
            {"amount":1000,"date":"2026-03-17","mode":"Cash","notes":"Worker payment (via Srinivasa Reddy)"},
        ]},
        {"name":"Srinivasa Reddy","role":"Manager","phone":"","pay_type":"monthly","salary":10000,"payments":[
            {"amount":10000,"date":"2026-02-27","mode":"UPI","notes":"Dad Salary"},
            {"amount":7800,"date":"2026-03-09","mode":"Cash","notes":"Materials - Market"},
        ]},
        {"name":"Ranjith","role":"Worker","phone":"","pay_type":"monthly","salary":0,"payments":[
            {"amount":3750,"date":"2026-02-15","mode":"UPI","notes":"Bill books"},
        ]},
    ]
    for emp in employees_data:
        await db.employees.insert_one({"name":emp["name"],"role":emp["role"],"phone":emp["phone"],"pay_type":emp["pay_type"],"salary":emp["salary"],"payments":emp["payments"],"documents":[],"created_at":now})
    results["employees_created"] = len(employees_data)
    
    # ===== SEED RAW MATERIALS from Tracker.xlsx =====
    await db.materials.delete_many({})
    materials_data = [
        {"name": "Kuchchu Thread", "description": "Kuchchu work materials", "quantity": "1 lot", "cost": 1350, "purchase_date": "2026-01-02", "payment_mode": "upi", "supplier": "Ramaa"},
        {"name": "Kuchchu Thread", "description": "Kuchchu work materials (additional)", "quantity": "1 lot", "cost": 450, "purchase_date": "2026-01-06", "payment_mode": "upi", "supplier": "Ramaa"},
        {"name": "Sofa Cloth", "description": "Cloth for shop sofa", "quantity": "1 lot", "cost": 4000, "purchase_date": "2026-01-27", "payment_mode": "upi", "supplier": "Mohammed Rafi"},
        {"name": "Lining & Materials", "description": "Lining and other material for blouses", "quantity": "1 lot", "cost": 2000, "purchase_date": "2026-02-07", "payment_mode": "upi", "supplier": "Tabrez"},
        {"name": "Falls, Kuchchu & Zigzag", "description": "Falls, Kuchchu and Zigzag (Nagaratna redo) - KSH-12,14,15,32", "quantity": "4 orders", "cost": 1250, "purchase_date": "2026-02-10", "payment_mode": "upi", "supplier": "Anitha"},
        {"name": "Worker Material + Salary", "description": "Feb 2nd week material (2827) included with salary - KSH-19,18,23", "quantity": "1 lot", "cost": 2827, "purchase_date": "2026-02-16", "payment_mode": "upi", "supplier": "Tabrez"},
        {"name": "Falls, Kuchchu & Zigzag", "description": "Falls, Kuchchu and Zigzag work", "quantity": "1 lot", "cost": 500, "purchase_date": "2026-02-18", "payment_mode": "cash", "supplier": "Anitha"},
        {"name": "Falls & Zigzag", "description": "Falls Zig+Zag work", "quantity": "1 lot", "cost": 350, "purchase_date": "2026-02-19", "payment_mode": "upi", "supplier": "Anitha"},
        {"name": "Blouse Cutting Material", "description": "Blouse cutting materials", "quantity": "1 lot", "cost": 3332, "purchase_date": "2026-02-23", "payment_mode": "upi", "supplier": "Tabrez"},
        {"name": "Blouse Cutting Material", "description": "Blouse cutting materials", "quantity": "1 lot", "cost": 3000, "purchase_date": "2026-02-23", "payment_mode": "cash", "supplier": "Tabrez"},
        {"name": "Blouse Cutting Material", "description": "Blouse cutting materials", "quantity": "1 lot", "cost": 850, "purchase_date": "2026-02-27", "payment_mode": "cash", "supplier": "Tabrez"},
        {"name": "Falls, Kuchchu & Zigzag", "description": "Falls, Kuchchu and Zigzag work", "quantity": "1 lot", "cost": 1130, "purchase_date": "2026-03-02", "payment_mode": "upi", "supplier": "Anitha"},
        {"name": "Blouse Cutting Material", "description": "Blouse cutting materials", "quantity": "1 lot", "cost": 3022, "purchase_date": "2026-03-02", "payment_mode": "upi", "supplier": "Tabrez"},
        {"name": "Blouse Cutting Material", "description": "Blouse cutting materials", "quantity": "1 lot", "cost": 866, "purchase_date": "2026-03-02", "payment_mode": "upi", "supplier": "Tabrez"},
        {"name": "Market Materials", "description": "Materials purchased from market", "quantity": "1 lot", "cost": 7800, "purchase_date": "2026-03-09", "payment_mode": "cash", "supplier": "Srinivasa Reddy (Market)"},
        {"name": "Falls, Kuchchu & Zigzag", "description": "Falls, Kuchchu and Zigzag work", "quantity": "1 lot", "cost": 1330, "purchase_date": "2026-03-09", "payment_mode": "upi", "supplier": "Anitha"},
        {"name": "Blouse Cutting Material", "description": "Blouse cutting materials", "quantity": "1 lot", "cost": 4660, "purchase_date": "2026-03-09", "payment_mode": "upi", "supplier": "Tabrez"},
        {"name": "Falls, Kuchchu & Zigzag", "description": "Falls, Kuchchu and Zigzag work", "quantity": "1 lot", "cost": 850, "purchase_date": "2026-03-17", "payment_mode": "upi", "supplier": "Anitha"},
        {"name": "Lining & Materials", "description": "Lining and other material", "quantity": "1 lot", "cost": 1000, "purchase_date": "2026-03-17", "payment_mode": "cash", "supplier": "Srinivasa Reddy"},
        {"name": "Bill Books", "description": "Bill books for invoicing", "quantity": "1 set", "cost": 3750, "purchase_date": "2026-02-15", "payment_mode": "upi", "supplier": "Ranjith"},
    ]
    for m in materials_data:
        await db.materials.insert_one({**m, "created_at": now})
    results["materials_created"] = len(materials_data)
    
    # ===== FIX ALL ORDERS: Remove 18% tax, set to 0% =====
    all_orders = await db.orders.find({}).to_list(5000)
    tax_fixed = 0
    for o in all_orders:
        if o.get("tax_percentage", 0) != 0 or o.get("tax_amount", 0) != 0:
            subtotal = o.get("subtotal", o.get("total", 0))
            paid = sum(p.get("amount", 0) for p in o.get("payments", []))
            await db.orders.update_one({"_id": o["_id"]}, {"$set": {"tax_percentage": 0, "tax_amount": 0, "total": subtotal, "balance": max(0, subtotal - paid)}})
            tax_fixed += 1
    results["orders_tax_fixed"] = tax_fixed
    
    return {"status": "success", "results": results}

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
