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

# ============== OBJECT STORAGE CONFIG ==============
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "kshana-contour"
storage_key = None

def init_storage():
    """Initialize storage - call once at startup"""
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set - storage disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to object storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from object storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

ROOT_DIR = Path(__file__).parent

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
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

def generate_order_id():
    import random
    return f"KSH-{random.randint(100, 999)}"

# ============== PYDANTIC MODELS ==============
class AdminLogin(BaseModel):
    phone: str
    password: str

class CustomerLogin(BaseModel):
    phone: str
    dob: str  # Format: YYYY-MM-DD or DD-MM-YYYY

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
    blouse_type: Optional[str] = None  # with_cups / without_cups
    front_neck_design: Optional[str] = None
    back_neck_design: Optional[str] = None
    # Garment options
    padded: Optional[str] = None  # yes / no
    princess_cut: Optional[str] = None  # yes / no
    open_style: Optional[str] = None  # front / back
    # Main measurements
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
    # Neckline measurements
    front_neck: Optional[str] = None
    back_neck: Optional[str] = None
    # Legacy fields kept for backward compat
    hip: Optional[str] = None
    armhole: Optional[str] = None
    neck_depth_front: Optional[str] = None
    neck_depth_back: Optional[str] = None
    additional_notes: Optional[str] = None
    cost: float = 0

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
    tax_percentage: float = 18
    advance_amount: float = 0
    advance_date: Optional[str] = None
    advance_mode: Optional[str] = None
    description: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    delivery_date: Optional[str] = None
    items: Optional[List[MeasurementItem]] = None
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
    role: str
    address: Optional[str] = None
    joining_date: str
    salary: float
    documents: Optional[List[str]] = []

class EmployeePayment(BaseModel):
    amount: float
    date: str
    mode: str
    notes: Optional[str] = None

class EmployeeHours(BaseModel):
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
    customer = await db.customers.find_one({"phone": data.phone})
    if not customer:
        raise HTTPException(status_code=401, detail="Customer not found")
    
    # DOB is the password - normalize format
    stored_dob = customer.get("dob", "")
    input_dob = data.dob.replace("/", "-")
    
    # Try multiple formats
    if stored_dob != input_dob:
        # Try reversing DD-MM-YYYY to YYYY-MM-DD or vice versa
        parts = input_dob.split("-")
        if len(parts) == 3:
            reversed_dob = f"{parts[2]}-{parts[1]}-{parts[0]}"
            if stored_dob != reversed_dob:
                raise HTTPException(status_code=401, detail="Invalid date of birth")
    
    token = create_access_token(str(customer["_id"]), customer["phone"], "customer")
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=False,
        samesite="lax", max_age=86400, path="/"
    )
    return {
        "id": str(customer["_id"]),
        "phone": customer["phone"],
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
async def get_customers(request: Request):
    await get_current_user(request)  # Auth check
    customers = await db.customers.find({}, {"_id": 1, "name": 1, "phone": 1, "email": 1, "dob": 1, "gender": 1}).to_list(1000)
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

# ============== ORDER ENDPOINTS ==============
@api_router.post("/orders")
async def create_order(data: OrderCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create or update customer
    customer = await db.customers.find_one({"phone": data.customer_phone})
    if not customer:
        customer_doc = {
            "name": data.customer_name,
            "phone": data.customer_phone,
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
    
    # Calculate totals
    subtotal = sum(item.cost for item in data.items)
    tax = subtotal * (data.tax_percentage / 100)
    total = subtotal + tax
    balance = total - data.advance_amount
    
    # Create order
    order_id = generate_order_id()
    order_doc = {
        "order_id": order_id,
        "customer_id": customer_id,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "order_date": datetime.now(timezone.utc).isoformat(),
        "delivery_date": data.delivery_date,
        "items": [item.model_dump() for item in data.items],
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
async def get_orders(request: Request, status: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {}
    if user.get("role") == "customer":
        query["customer_id"] = user.get("_id")
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
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
async def get_employees(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    employees = await db.employees.find({}).to_list(1000)
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
async def get_materials(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    materials = await db.materials.find({}).sort("purchase_date", -1).to_list(1000)
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
    
    # Get all orders
    all_orders = await db.orders.find({}).to_list(10000)
    
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
    
    all_orders = await db.orders.find({}).to_list(10000)
    
    # Group by month
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
    # Initialize object storage
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage initialization skipped: {e}")
    
    # Create indexes
    await db.customers.create_index("phone", unique=True)
    await db.admins.create_index("phone", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("customer_id")
    
    # Seed admin if not exists
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
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin\n- Phone: {admin_phone}\n- Password: {admin_password}\n- Role: admin\n\n")
        f.write(f"## Auth Endpoints\n- Admin Login: POST /api/auth/admin/login\n- Customer Login: POST /api/auth/customer/login\n- Me: GET /api/auth/me\n- Logout: POST /api/auth/logout\n")
    
    logger.info("Kshana Contour API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
