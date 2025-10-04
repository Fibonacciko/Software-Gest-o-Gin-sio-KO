from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, date, timezone
from enum import Enum
import qrcode
from io import BytesIO
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Enums
class MembershipType(str, Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    VIP = "vip"

class MemberStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class PaymentStatus(str, Enum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"

class ItemCategory(str, Enum):
    CLOTHING = "clothing"
    EQUIPMENT = "equipment"

# Pydantic Models
class Member(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[EmailStr] = None
    phone: str
    date_of_birth: date
    nationality: str
    profession: str
    address: str
    membership_type: MembershipType
    status: MemberStatus = MemberStatus.ACTIVE
    join_date: date = Field(default_factory=lambda: date.today())
    expiry_date: Optional[date] = None
    photo_url: Optional[str] = None
    qr_code: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemberCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    date_of_birth: date
    nationality: str
    profession: str
    address: str
    membership_type: MembershipType
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    check_in_date: date
    check_in_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    method: str = "manual"  # manual or qr_code

class AttendanceCreate(BaseModel):
    member_id: str
    check_in_date: Optional[date] = None
    method: str = "manual"

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    amount: float
    payment_date: date = Field(default_factory=lambda: date.today())
    payment_method: str = "cash"
    status: PaymentStatus = PaymentStatus.PAID
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    member_id: str
    amount: float
    payment_method: str = "cash"
    description: Optional[str] = None

class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: ItemCategory
    size: Optional[str] = None
    color: Optional[str] = None
    quantity: int = 0
    price: float
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryItemCreate(BaseModel):
    name: str
    category: ItemCategory
    size: Optional[str] = None
    color: Optional[str] = None
    quantity: int = 0
    price: float
    description: Optional[str] = None

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Gym Management API is running", "version": "1.0.0"}

# Helper functions
def generate_qr_code(member_id: str) -> str:
    """Generate QR code for member"""
    qr_data = f"MEMBER:{member_id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def prepare_for_mongo(data):
    """Convert date objects to ISO strings for MongoDB"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, date):
                data[key] = value.isoformat()
            elif isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    """Parse date strings back to date objects from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if key in ['date_of_birth', 'join_date', 'expiry_date', 'check_in_date', 'payment_date'] and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value).date()
                except:
                    pass
            elif key in ['created_at', 'check_in_time'] and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value)
                except:
                    pass
    return item

# Member Routes
@api_router.post("/members", response_model=Member)
async def create_member(member_data: MemberCreate):
    member_dict = member_data.dict()
    member = Member(**member_dict)
    
    # Generate QR code
    member.qr_code = generate_qr_code(member.id)
    
    member_dict = prepare_for_mongo(member.dict())
    await db.members.insert_one(member_dict)
    return member

@api_router.get("/members", response_model=List[Member])
async def get_members(
    status: Optional[MemberStatus] = None,
    membership_type: Optional[MembershipType] = None,
    search: Optional[str] = None
):
    filter_dict = {}
    if status:
        filter_dict['status'] = status
    if membership_type:
        filter_dict['membership_type'] = membership_type
    if search:
        filter_dict['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}}
        ]
    
    members = await db.members.find(filter_dict).to_list(1000)
    return [Member(**parse_from_mongo(member)) for member in members]

@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str):
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return Member(**parse_from_mongo(member))

@api_router.put("/members/{member_id}", response_model=Member)
async def update_member(member_id: str, member_data: MemberCreate):
    member_dict = prepare_for_mongo(member_data.dict())
    result = await db.members.update_one(
        {"id": member_id},
        {"$set": member_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    updated_member = await db.members.find_one({"id": member_id})
    return Member(**parse_from_mongo(updated_member))

@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str):
    result = await db.members.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}

# Attendance Routes
@api_router.post("/attendance", response_model=Attendance)
async def create_attendance(attendance_data: AttendanceCreate):
    # Check if member exists
    member = await db.members.find_one({"id": attendance_data.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Set check_in_date to today if not provided
    if not attendance_data.check_in_date:
        attendance_data.check_in_date = date.today()
    
    attendance = Attendance(**attendance_data.dict())
    attendance_dict = prepare_for_mongo(attendance.dict())
    await db.attendance.insert_one(attendance_dict)
    return attendance

@api_router.get("/attendance", response_model=List[Attendance])
async def get_attendance(
    member_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    filter_dict = {}
    if member_id:
        filter_dict['member_id'] = member_id
    if start_date:
        filter_dict['check_in_date'] = filter_dict.get('check_in_date', {})
        filter_dict['check_in_date']['$gte'] = start_date.isoformat()
    if end_date:
        filter_dict['check_in_date'] = filter_dict.get('check_in_date', {})
        filter_dict['check_in_date']['$lte'] = end_date.isoformat()
    
    attendance_records = await db.attendance.find(filter_dict).to_list(1000)
    return [Attendance(**parse_from_mongo(record)) for record in attendance_records]

@api_router.get("/members/{member_id}/attendance", response_model=List[Attendance])
async def get_member_attendance(member_id: str, month: Optional[int] = None, year: Optional[int] = None):
    filter_dict = {'member_id': member_id}
    
    if month and year:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        filter_dict['check_in_date'] = {
            '$gte': start_date.isoformat(),
            '$lt': end_date.isoformat()
        }
    
    attendance_records = await db.attendance.find(filter_dict).to_list(1000)
    return [Attendance(**parse_from_mongo(record)) for record in attendance_records]

# Payment Routes
@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate):
    # Check if member exists
    member = await db.members.find_one({"id": payment_data.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    payment = Payment(**payment_data.dict())
    payment_dict = prepare_for_mongo(payment.dict())
    await db.payments.insert_one(payment_dict)
    return payment

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(
    member_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[PaymentStatus] = None
):
    filter_dict = {}
    if member_id:
        filter_dict['member_id'] = member_id
    if status:
        filter_dict['status'] = status
    if start_date:
        filter_dict['payment_date'] = filter_dict.get('payment_date', {})
        filter_dict['payment_date']['$gte'] = start_date.isoformat()
    if end_date:
        filter_dict['payment_date'] = filter_dict.get('payment_date', {})
        filter_dict['payment_date']['$lte'] = end_date.isoformat()
    
    payments = await db.payments.find(filter_dict).to_list(1000)
    return [Payment(**parse_from_mongo(payment)) for payment in payments]

# Inventory Routes
@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(item_data: InventoryItemCreate):
    item = InventoryItem(**item_data.dict())
    item_dict = prepare_for_mongo(item.dict())
    await db.inventory.insert_one(item_dict)
    return item

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(category: Optional[ItemCategory] = None):
    filter_dict = {}
    if category:
        filter_dict['category'] = category
    
    items = await db.inventory.find(filter_dict).to_list(1000)
    return [InventoryItem(**parse_from_mongo(item)) for item in items]

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: str, item_data: InventoryItemCreate):
    item_dict = prepare_for_mongo(item_data.dict())
    result = await db.inventory.update_one(
        {"id": item_id},
        {"$set": item_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    updated_item = await db.inventory.find_one({"id": item_id})
    return InventoryItem(**parse_from_mongo(updated_item))

# Dashboard & Reports
@api_router.get("/dashboard")
async def get_dashboard_stats():
    # Get member stats
    total_members = await db.members.count_documents({})
    active_members = await db.members.count_documents({"status": "active"})
    
    # Get today's attendance
    today = date.today()
    today_attendance = await db.attendance.count_documents({
        "check_in_date": today.isoformat()
    })
    
    # Get this month's revenue
    start_of_month = date(today.year, today.month, 1)
    monthly_revenue_pipeline = [
        {
            "$match": {
                "payment_date": {"$gte": start_of_month.isoformat()},
                "status": "paid"
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }
        }
    ]
    
    monthly_revenue_result = await db.payments.aggregate(monthly_revenue_pipeline).to_list(1)
    monthly_revenue = monthly_revenue_result[0]["total"] if monthly_revenue_result else 0
    
    return {
        "total_members": total_members,
        "active_members": active_members,
        "today_attendance": today_attendance,
        "monthly_revenue": monthly_revenue
    }

@api_router.get("/reports/attendance")
async def get_attendance_report(month: Optional[int] = None, year: Optional[int] = None):
    if not month or not year:
        current_date = date.today()
        month = month or current_date.month
        year = year or current_date.year
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    pipeline = [
        {
            "$match": {
                "check_in_date": {
                    "$gte": start_date.isoformat(),
                    "$lt": end_date.isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": "$member_id",
                "count": {"$sum": 1}
            }
        }
    ]
    
    attendance_stats = await db.attendance.aggregate(pipeline).to_list(1000)
    return attendance_stats

# QR Code check-in
@api_router.post("/checkin/qr")
async def qr_checkin(qr_data: str):
    # Extract member ID from QR code
    if not qr_data.startswith("MEMBER:"):
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    member_id = qr_data.replace("MEMBER:", "")
    
    # Check if member exists
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Create attendance record
    attendance_data = AttendanceCreate(member_id=member_id, method="qr_code")
    attendance = await create_attendance(attendance_data)
    
    return {
        "message": "Check-in successful",
        "member": Member(**parse_from_mongo(member)),
        "attendance": attendance
    }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
