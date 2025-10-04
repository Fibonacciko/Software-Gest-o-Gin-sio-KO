from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, date, timezone, timedelta
from enum import Enum
import qrcode
from io import BytesIO
import base64
from jose import JWTError, jwt
from passlib.context import CryptContext
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
SECRET_KEY = "your-secret-key-change-in-production-2024-gym-management"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

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

class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    MEMBER = "member"  # For mobile app users

class MessageType(str, Enum):
    GENERAL = "general"     # Broadcast to all
    INDIVIDUAL = "individual"  # To specific member
    EVENT = "event"         # Event notification
    REMINDER = "reminder"   # Subscription reminders

class NotificationStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered" 
    READ = "read"
    FAILED = "failed"

# Modalidades (Activities) Model
class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str  # Hex color code
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityCreate(BaseModel):
    name: str
    color: str
    description: Optional[str] = None

# Message/Notification Models
class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    message_type: MessageType
    target_member_id: Optional[str] = None  # For individual messages
    target_role: Optional[UserRole] = None  # For role-based messages
    language: str = "pt"  # pt or en
    is_push_notification: bool = True
    created_by: str  # Admin/Staff ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scheduled_for: Optional[datetime] = None  # For future messages

class MessageCreate(BaseModel):
    title: str
    content: str
    message_type: MessageType
    target_member_id: Optional[str] = None
    target_role: Optional[UserRole] = None
    language: str = "pt"
    is_push_notification: bool = True
    scheduled_for: Optional[datetime] = None

class NotificationLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message_id: str
    member_id: str
    status: NotificationStatus = NotificationStatus.SENT
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = None
    fcm_token: Optional[str] = None

# Motivational Notes Model
class MotivationalNote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workout_count_min: int  # e.g., 1
    workout_count_max: int  # e.g., 90
    level_name: str  # e.g., "beginners"
    note_pt: str
    note_en: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MotivationalNoteCreate(BaseModel):
    workout_count_min: int
    workout_count_max: int
    level_name: str
    note_pt: str
    note_en: str

# Mobile Member Profile Model (extended for mobile app)
class MobileMember(BaseModel):
    id: str
    member_number: str
    name: str
    email: Optional[str] = None
    phone: str
    date_of_birth: date
    nationality: str
    profession: str
    membership_type: MembershipType
    status: MemberStatus
    join_date: date
    expiry_date: Optional[date] = None
    photo_url: Optional[str] = None
    qr_code: str  # Base64 QR code image
    workout_count: int = 0  # Total workouts
    current_motivational_note: Optional[str] = None
    subscription_active: bool = True
    fcm_token: Optional[str] = None

# Mobile Login Model
class MobileMemberLogin(BaseModel):
    member_number: str
    phone: str  # Using phone as password for simplicity

# FCM Token Update Model  
class FCMTokenUpdate(BaseModel):
    fcm_token: str

# Mobile Payment Model (mock for now)
class MobilePaymentRequest(BaseModel):
    amount: float
    payment_method: PaymentMethod
    description: Optional[str] = None

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.STAFF

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Member(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_number: str  # Automatic sequential number (001, 002, etc.)
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
    activity_id: Optional[str] = None  # Required for new records, optional for legacy
    check_in_date: date
    check_in_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    method: str = "manual"  # manual or qr_code

class AttendanceCreate(BaseModel):
    member_id: str
    activity_id: str  # Required modalidade
    check_in_date: Optional[date] = None
    method: str = "manual"

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"
    MBWAY = "mbway"

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    amount: float
    payment_date: date = Field(default_factory=lambda: date.today())
    payment_method: PaymentMethod = PaymentMethod.CASH
    status: PaymentStatus = PaymentStatus.PAID
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    member_id: str
    amount: float
    payment_method: PaymentMethod = PaymentMethod.CASH
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

# Authentication functions
def verify_password(plain_password, hashed_password):
    # Temporary SHA256 for testing
    import hashlib
    if len(hashed_password) == 64:  # SHA256 hash length
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password
    
    # Bcrypt fallback
    try:
        if len(plain_password.encode('utf-8')) > 72:
            plain_password = plain_password[:72]
        return pwd_context.verify(plain_password, hashed_password)
    except:
        return False

def get_password_hash(password):
    # Bcrypt has a 72 byte limit, truncate if necessary
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    
    return User(**parse_from_mongo(user))

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_admin_or_staff(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.STAFF]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required"
        )
    return current_user

# Initialize admin user on startup
async def create_admin_user():
    try:
        admin_exists = await db.users.find_one({"role": "admin"})
        if not admin_exists:
            admin_user = User(
                username="fabio.guerreiro",
                email="admin@gym.com",
                full_name="Fábio Guerreiro",
                role=UserRole.ADMIN
            )
            admin_dict = prepare_for_mongo(admin_user.dict())
            admin_dict["password_hash"] = get_password_hash("admin123")
            await db.users.insert_one(admin_dict)
            print("Admin user created successfully")
    except Exception as e:
        print(f"Error creating admin user: {e}")

async def generate_next_member_number():
    """Generate the next sequential member number"""
    try:
        # Get the highest existing member number
        pipeline = [
            {
                "$addFields": {
                    "member_number_int": {"$toInt": "$member_number"}
                }
            },
            {
                "$sort": {"member_number_int": -1}
            },
            {
                "$limit": 1
            }
        ]
        
        result = await db.members.aggregate(pipeline).to_list(1)
        
        if result:
            last_number = result[0].get("member_number_int", 0)
            next_number = last_number + 1
        else:
            next_number = 1
        
        # Format as 3-digit string with leading zeros
        return f"{next_number:03d}"
    
    except Exception as e:
        print(f"Error generating member number: {e}")
        # Fallback: count all members and add 1
        member_count = await db.members.count_documents({})
        return f"{member_count + 1:03d}"

async def update_existing_members_with_numbers():
    """Add member numbers to existing members who don't have them"""
    try:
        # Find members without member_number
        members_without_numbers = await db.members.find({"member_number": {"$exists": False}}).to_list(1000)
        
        if not members_without_numbers:
            return
        
        print(f"Updating {len(members_without_numbers)} members with numbers...")
        
        # Sort by creation date to maintain order
        members_without_numbers.sort(key=lambda x: x.get('created_at', ''))
        
        for i, member in enumerate(members_without_numbers, 1):
            member_number = f"{i:03d}"
            
            # Update member with number
            await db.members.update_one(
                {"id": member["id"]},
                {"$set": {"member_number": member_number}}
            )
            
            # Regenerate QR code with member number
            new_qr_code = generate_qr_code(f"{member_number}-{member['id']}")
            await db.members.update_one(
                {"id": member["id"]},
                {"$set": {"qr_code": new_qr_code}}
            )
        
        print(f"Successfully updated {len(members_without_numbers)} members with numbers")
    
    except Exception as e:
        print(f"Error updating existing members: {e}")

async def create_default_activities():
    try:
        # Check if activities already exist
        activity_count = await db.activities.count_documents({})
        if activity_count > 0:
            return
        
        default_activities = [
            {"name": "Boxe", "color": "#ef4444", "description": "Treino de boxe"},
            {"name": "Kickboxing", "color": "#f97316", "description": "Treino de kickboxing"},
            {"name": "Jiu-Jitsu", "color": "#8b5cf6", "description": "Arte marcial brasileira"},
            {"name": "CrossFit", "color": "#10b981", "description": "Treino funcional de alta intensidade"},
            {"name": "Musculação", "color": "#3b82f6", "description": "Treino com pesos"},
            {"name": "Pilates", "color": "#ec4899", "description": "Exercícios de fortalecimento e flexibilidade"},
            {"name": "Yoga", "color": "#06b6d4", "description": "Prática de yoga e meditação"},
            {"name": "Dança", "color": "#f59e0b", "description": "Aulas de dança e movimento"}
        ]
        
        for activity_data in default_activities:
            activity = Activity(**activity_data)
            activity_dict = prepare_for_mongo(activity.dict())
            await db.activities.insert_one(activity_dict)
        
        print("Default activities created successfully")
    except Exception as e:
        print(f"Error creating default activities: {e}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Gym Management API is running", "version": "1.0.0"}

# Activities/Modalidades Routes
@api_router.get("/activities", response_model=List[Activity])
async def get_activities(current_user: User = Depends(require_admin_or_staff)):
    activities = await db.activities.find({"is_active": True}).to_list(1000)
    return [Activity(**parse_from_mongo(activity)) for activity in activities]

@api_router.post("/activities", response_model=Activity)
async def create_activity(
    activity_data: ActivityCreate,
    current_user: User = Depends(require_admin)
):
    activity = Activity(**activity_data.dict())
    activity_dict = prepare_for_mongo(activity.dict())
    await db.activities.insert_one(activity_dict)
    return activity

@api_router.put("/activities/{activity_id}", response_model=Activity)
async def update_activity(
    activity_id: str,
    activity_data: ActivityCreate,
    current_user: User = Depends(require_admin)
):
    activity_dict = prepare_for_mongo(activity_data.dict())
    result = await db.activities.update_one(
        {"id": activity_id},
        {"$set": activity_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    updated_activity = await db.activities.find_one({"id": activity_id})
    return Activity(**parse_from_mongo(updated_activity))

@api_router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: str,
    current_user: User = Depends(require_admin)
):
    # Soft delete - mark as inactive instead of deleting
    result = await db.activities.update_one(
        {"id": activity_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return {"message": "Activity deactivated successfully"}

# Authentication Routes
@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    print(f"Login attempt for username: {user_credentials.username}")
    user = await db.users.find_one({"username": user_credentials.username})
    print(f"User found: {user is not None}")
    if user:
        print(f"Password check: {verify_password(user_credentials.password, user['password_hash'])}")
    
    if not user or not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(status_code=400, detail="User account is disabled")
    
    access_token = create_access_token(data={"sub": user["username"]})
    user_obj = User(**parse_from_mongo(user))
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )

@api_router.get("/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# User Management Routes (Admin only)
@api_router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_admin)
):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        created_by=current_user.id
    )
    
    user_dict = prepare_for_mongo(user.dict())
    user_dict["password_hash"] = get_password_hash(user_data.password)
    
    await db.users.insert_one(user_dict)
    return user

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_admin)):
    users = await db.users.find({}).to_list(1000)
    return [User(**parse_from_mongo(user)) for user in users]

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_data: UserCreate,
    current_user: User = Depends(require_admin)
):
    user_dict = prepare_for_mongo(user_data.dict(exclude={"password"}))
    
    # Update password if provided
    if user_data.password:
        user_dict["password_hash"] = get_password_hash(user_data.password)
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": user_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id})
    return User(**parse_from_mongo(updated_user))

@api_router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deactivating themselves
    if user["id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    new_status = not user["is_active"]
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"message": f"User {'activated' if new_status else 'deactivated'} successfully"}

@api_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deleting themselves
    if user["id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Prevent deleting other admins
    if user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

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
    """Parse date strings back to date objects from MongoDB and handle ObjectIds"""
    if isinstance(item, dict):
        # Remove MongoDB's _id field if present
        if '_id' in item:
            del item['_id']
        
        for key, value in item.items():
            # Handle ObjectId conversion to string
            if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                item[key] = str(value)
            elif key in ['date_of_birth', 'join_date', 'expiry_date', 'check_in_date', 'payment_date'] and isinstance(value, str):
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
async def create_member(
    member_data: MemberCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    member_dict = member_data.dict()
    
    # Generate automatic member number
    member_number = await generate_next_member_number()
    member_dict["member_number"] = member_number
    
    member = Member(**member_dict)
    
    # Generate QR code with member number
    member.qr_code = generate_qr_code(f"{member.member_number}-{member.id}")
    
    member_dict = prepare_for_mongo(member.dict())
    await db.members.insert_one(member_dict)
    return member

@api_router.get("/members", response_model=List[Member])
async def get_members(
    status: Optional[MemberStatus] = None,
    membership_type: Optional[MembershipType] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin_or_staff)
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
            {'email': {'$regex': search, '$options': 'i'}},
            {'member_number': {'$regex': search, '$options': 'i'}}  # Search by member number
        ]
    
    members = await db.members.find(filter_dict).to_list(1000)
    return [Member(**parse_from_mongo(member)) for member in members]

@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(
    member_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return Member(**parse_from_mongo(member))

@api_router.get("/members/number/{member_number}", response_model=Member)
async def get_member_by_number(
    member_number: str,
    current_user: User = Depends(require_admin_or_staff)
):
    """Get member by member number"""
    member = await db.members.find_one({"member_number": member_number})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return Member(**parse_from_mongo(member))

@api_router.put("/members/{member_id}", response_model=Member)
async def update_member(
    member_id: str,
    member_data: MemberCreate,
    current_user: User = Depends(require_admin_or_staff)
):
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
async def delete_member(
    member_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    result = await db.members.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}

# Attendance Routes
@api_router.post("/attendance", response_model=Attendance)
async def create_attendance(
    attendance_data: AttendanceCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    # Check if member exists
    member = await db.members.find_one({"id": attendance_data.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if activity exists
    activity = await db.activities.find_one({"id": attendance_data.activity_id, "is_active": True})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
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
    activity_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    filter_dict = {}
    if member_id:
        filter_dict['member_id'] = member_id
    if activity_id:
        filter_dict['activity_id'] = activity_id
    if start_date:
        filter_dict['check_in_date'] = filter_dict.get('check_in_date', {})
        filter_dict['check_in_date']['$gte'] = start_date.isoformat()
    if end_date:
        filter_dict['check_in_date'] = filter_dict.get('check_in_date', {})
        filter_dict['check_in_date']['$lte'] = end_date.isoformat()
    
    attendance_records = await db.attendance.find(filter_dict).to_list(1000)
    return [Attendance(**parse_from_mongo(record)) for record in attendance_records]

@api_router.get("/members/{member_id}/attendance", response_model=List[Attendance])
async def get_member_attendance(
    member_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(require_admin_or_staff)
):
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

@api_router.get("/attendance/detailed")
async def get_detailed_attendance(
    member_id: Optional[str] = None,
    activity_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    """Get attendance records with member and activity details"""
    filter_dict = {}
    if member_id:
        filter_dict['member_id'] = member_id
    if activity_id:
        filter_dict['activity_id'] = activity_id
    if start_date:
        filter_dict['check_in_date'] = filter_dict.get('check_in_date', {})
        filter_dict['check_in_date']['$gte'] = start_date.isoformat()
    if end_date:
        filter_dict['check_in_date'] = filter_dict.get('check_in_date', {})
        filter_dict['check_in_date']['$lte'] = end_date.isoformat()
    
    attendance_records = await db.attendance.find(filter_dict).to_list(1000)
    
    # Enrich with member and activity data
    detailed_records = []
    for record in attendance_records:
        try:
            # Get member data
            member = await db.members.find_one({"id": record["member_id"]})
            # Get activity data (handle legacy records without activity_id)
            activity = None
            if "activity_id" in record and record["activity_id"]:
                activity = await db.activities.find_one({"id": record["activity_id"]})
            
            detailed_record = {
                **parse_from_mongo(record),
                "member": parse_from_mongo(member) if member else None,
                "activity": parse_from_mongo(activity) if activity else None
            }
            detailed_records.append(detailed_record)
        except Exception as e:
            # Skip problematic records and log the error
            print(f"Error processing attendance record {record.get('id', 'unknown')}: {e}")
            continue
    
    return detailed_records

# Payment Routes (Admin only)
@api_router.post("/payments", response_model=Payment)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(require_admin)
):
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
    status: Optional[PaymentStatus] = None,
    current_user: User = Depends(require_admin)
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
async def create_inventory_item(
    item_data: InventoryItemCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    item = InventoryItem(**item_data.dict())
    item_dict = prepare_for_mongo(item.dict())
    await db.inventory.insert_one(item_dict)
    return item

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(
    category: Optional[ItemCategory] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    filter_dict = {}
    if category:
        filter_dict['category'] = category
    
    items = await db.inventory.find(filter_dict).to_list(1000)
    return [InventoryItem(**parse_from_mongo(item)) for item in items]

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(
    item_id: str,
    item_data: InventoryItemCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    item_dict = prepare_for_mongo(item_data.dict())
    result = await db.inventory.update_one(
        {"id": item_id},
        {"$set": item_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    updated_item = await db.inventory.find_one({"id": item_id})
    return InventoryItem(**parse_from_mongo(updated_item))

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(
    item_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# Dashboard & Reports
@api_router.get("/dashboard")
async def get_dashboard_stats(current_user: User = Depends(require_admin_or_staff)):
    # Get member stats
    total_members = await db.members.count_documents({})
    active_members = await db.members.count_documents({"status": "active"})
    
    # Get today's attendance
    today = date.today()
    today_attendance = await db.attendance.count_documents({
        "check_in_date": today.isoformat()
    })
    
    response = {
        "total_members": total_members,
        "active_members": active_members,
        "today_attendance": today_attendance,
    }
    
    # Only show financial data to admins
    if current_user.role == UserRole.ADMIN:
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
        response["monthly_revenue"] = monthly_revenue
    
    return response

@api_router.get("/reports/attendance")
async def get_attendance_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    activity_id: Optional[str] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    if not month or not year:
        current_date = date.today()
        month = month or current_date.month
        year = year or current_date.year
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    match_filter = {
        "check_in_date": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }
    
    if activity_id:
        match_filter["activity_id"] = activity_id
    
    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": "$member_id",
                "count": {"$sum": 1}
            }
        }
    ]
    
    attendance_stats = await db.attendance.aggregate(pipeline).to_list(1000)
    return attendance_stats

@api_router.get("/reports/activities")
async def get_activity_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    """Report of attendance by activity/modalidade"""
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
                "_id": "$activity_id",
                "total_sessions": {"$sum": 1},
                "unique_members": {"$addToSet": "$member_id"}
            }
        },
        {
            "$project": {
                "activity_id": "$_id",
                "total_sessions": 1,
                "unique_members_count": {"$size": "$unique_members"}
            }
        }
    ]
    
    activity_stats = await db.attendance.aggregate(pipeline).to_list(1000)
    
    # Enrich with activity names
    enriched_stats = []
    for stat in activity_stats:
        activity = await db.activities.find_one({"id": stat["activity_id"]})
        stat["activity_name"] = activity["name"] if activity else "Unknown"
        stat["activity_color"] = activity["color"] if activity else "#gray"
        enriched_stats.append(stat)
    
    return enriched_stats

@api_router.get("/reports/top-members")
async def get_top_members_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    activity_id: Optional[str] = None,
    limit: int = 10,
    current_user: User = Depends(require_admin_or_staff)
):
    """Report of most active members (optionally by activity)"""
    if not month or not year:
        current_date = date.today()
        month = month or current_date.month
        year = year or current_date.year
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    match_filter = {
        "check_in_date": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }
    
    if activity_id:
        match_filter["activity_id"] = activity_id
    
    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": "$member_id",
                "total_sessions": {"$sum": 1},
                "activities": {"$addToSet": "$activity_id"}
            }
        },
        {"$sort": {"total_sessions": -1}},
        {"$limit": limit}
    ]
    
    top_members = await db.attendance.aggregate(pipeline).to_list(limit)
    
    # Enrich with member names
    enriched_members = []
    for member_stat in top_members:
        member = await db.members.find_one({"id": member_stat["_id"]})
        member_stat["member_name"] = member["name"] if member else "Unknown"
        member_stat["member_id"] = member_stat["_id"]
        enriched_members.append(member_stat)
    
    return enriched_members

# QR Code check-in
@api_router.post("/checkin/qr")
async def qr_checkin(
    qr_data: str,
    activity_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    # Extract member number and ID from QR code
    if not qr_data or "-" not in qr_data:
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    try:
        parts = qr_data.split("-")
        member_number = parts[0]
        member_id = parts[1]
    except:
        raise HTTPException(status_code=400, detail="Invalid QR code format")
    
    # Check if member exists (try both member number and ID)
    member = await db.members.find_one({
        "$or": [
            {"member_number": member_number, "id": member_id},
            {"id": member_id}
        ]
    })
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Create attendance record
    attendance_data = AttendanceCreate(
        member_id=member["id"], 
        activity_id=activity_id,
        method="qr_code"
    )
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

@app.on_event("startup")
async def startup_db():
    await create_admin_user()
    await create_default_activities()
    await update_existing_members_with_numbers()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
