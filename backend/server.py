from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Dict
import uuid
import unicodedata
import re
from datetime import datetime, date, timezone, timedelta, time
from enum import Enum
import qrcode
from io import BytesIO
import base64
from jose import JWTError, jwt
from passlib.context import CryptContext
import json
import random
import firebase_admin
from firebase_admin import credentials, messaging

# Sistemas Premium KO Gym
from utils.logger import gym_logger, LoggingMiddleware
from utils.cache import gym_cache, BusinessCache, cache_result
from utils.rate_limiter import gym_rate_limiter, auth_rate_limit, api_rate_limit, dashboard_rate_limit, RateLimitMiddleware
from utils.analytics import AnalyticsEngine

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Analytics Engine Premium
analytics_engine = None

# Firebase configuration (will be configured when user provides credentials)
firebase_app = None
firebase_enabled = False

def initialize_firebase():
    """Initialize Firebase when credentials are available"""
    global firebase_app, firebase_enabled
    try:
        firebase_config_path = os.environ.get('FIREBASE_CONFIG_PATH')
        if firebase_config_path and os.path.exists(firebase_config_path):
            if not firebase_admin._apps:
                cred = credentials.Certificate(firebase_config_path)
                firebase_app = firebase_admin.initialize_app(cred)
            firebase_enabled = True
            print("Firebase initialized successfully")
        else:
            print("Firebase configuration not found - push notifications disabled")
    except Exception as e:
        print(f"Firebase initialization failed: {e}")
        firebase_enabled = False

# Create the main app
app = FastAPI(title="KO Gym Management API - Premium Edition", version="2.0.0")
api_router = APIRouter(prefix="/api")

# Adicionar middlewares premium
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Configurar rate limiter no FastAPI
app.state.limiter = gym_rate_limiter.limiter

# Security
SECRET_KEY = "your-secret-key-change-in-production-2024-gym-management"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Enums
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

class MessageType(str, Enum):
    WELCOME = "welcome"
    RENEWAL_REMINDER = "renewal_reminder" 
    MILESTONE = "milestone"
    GENERAL = "general"
    AUTOMATED = "automated"

class AutomatedMessageTrigger(str, Enum):
    NEW_MEMBER = "new_member"
    MEMBERSHIP_EXPIRY_7_DAYS = "membership_expiry_7_days"
    MEMBERSHIP_EXPIRY_3_DAYS = "membership_expiry_3_days"
    MILESTONE_10_WORKOUTS = "milestone_10_workouts"
    MILESTONE_25_WORKOUTS = "milestone_25_workouts"
    MILESTONE_50_WORKOUTS = "milestone_50_workouts"
    MILESTONE_100_WORKOUTS = "milestone_100_workouts"
    INACTIVE_7_DAYS = "inactive_7_days"
    INACTIVE_30_DAYS = "inactive_30_days"

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
    status: MemberStatus
    join_date: date
    expiry_date: Optional[date] = None
    photo_url: Optional[str] = None
    qr_code: str  # Base64 QR code image
    workout_count: int = 0  # Total workouts
    current_motivational_note: Optional[str] = None
    subscription_active: bool = True
    fcm_token: Optional[str] = None
    # Estado das quotas e do seguro, para o cartao do socio
    membership_status: Optional[str] = None
    membership_valid_until: Optional[date] = None
    insurance_valid_until: Optional[date] = None
    activity_ids: List[str] = Field(default_factory=list)
    streak_weeks: int = 0            # Semanas seguidas com pelo menos um treino
    checked_in_today: bool = False

# Mobile Login Model
class MobileMemberLogin(BaseModel):
    member_number: str
    phone: str  # Using phone as password for simplicity

# FCM Token Update Model  
class FCMTokenUpdate(BaseModel):
    fcm_token: str

class PaymentType(str, Enum):
    QUOTA = "quota"                  # Mensalidade / quota do socio
    INSURANCE = "seguro"             # Seguro anual do socio
    QUOTA_INSURANCE = "quota_seguro" # Mensalidade + seguro, tipico na inscricao

INSURANCE_DEFAULT_AMOUNT = 20.0
INSURANCE_VALIDITY_DAYS = 365

# Preco de uma aula experimental. Pode ser alterado em cada registo.
TRIAL_DEFAULT_AMOUNT = 5.0

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"
    MBWAY = "mbway"

# Mobile Payment Model (mock for now)
class MobilePaymentRequest(BaseModel):
    amount: float
    payment_method: PaymentMethod
    description: Optional[str] = None

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: Optional[EmailStr] = None
    full_name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: str
    password: str
    role: UserRole = UserRole.STAFF

    @field_validator('email', mode='before')
    @classmethod
    def empty_email_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v

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
    status: MemberStatus = MemberStatus.ACTIVE
    join_date: date = Field(default_factory=lambda: date.today())
    expiry_date: Optional[date] = None
    photo_url: Optional[str] = None
    qr_code: Optional[str] = None
    nfc_tag_id: Optional[str] = None
    activity_id: Optional[str] = None  # Primary modality, kept for check-in and legacy records
    activity_ids: List[str] = Field(default_factory=list)  # All modalities subscribed by the member
    insurance_paid_date: Optional[date] = None      # Ultimo pagamento do seguro
    insurance_valid_until: Optional[date] = None    # Validade do seguro (= validade da inscricao)
    membership_paid_date: Optional[date] = None     # Ultimo pagamento de quota
    membership_valid_until: Optional[date] = None   # Quota paga ate esta data
    membership_status: Optional[str] = None         # Calculado: active / inactive / suspended
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
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    activity_id: Optional[str] = None
    activity_ids: Optional[List[str]] = None
    insurance_valid_until: Optional[date] = None

    @field_validator('email', mode='before')
    @classmethod
    def empty_email_to_none(cls, v):
        # O formulario envia sempre o campo, vazio quando o socio nao tem
        # email. Sem isto, a ficha era recusada com um erro de validacao.
        if v == '' or v is None:
            return None
        return v

class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    activity_id: Optional[str] = None  # Required for new records, optional for legacy
    check_in_date: date
    check_in_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    method: str = "manual"  # manual or qr_code

class AttendanceUpdate(BaseModel):
    activity_id: str

class AttendanceCreate(BaseModel):
    member_id: str
    activity_id: str  # Required modalidade
    check_in_date: Optional[date] = None
    method: str = "manual"

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    amount: float
    payment_date: date = Field(default_factory=lambda: date.today())
    # O dia em que o dinheiro conta para as contas do ginasio. Quase sempre e
    # o proprio dia do pagamento, e fica a None. So difere nos pagamentos do
    # fim de setembro de 2026, que eram a mensalidade de outubro: contam em
    # outubro, mas a validade da quota continua a nascer do dia em que o
    # socio pagou, que e o que lhe interessa a ele.
    accounting_date: Optional[date] = None
    payment_type: PaymentType = PaymentType.QUOTA
    payment_method: PaymentMethod = PaymentMethod.CASH
    status: PaymentStatus = PaymentStatus.PAID
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    member_id: str
    amount: float
    payment_date: Optional[date] = None  # Chosen by the user; falls back to today
    payment_type: PaymentType = PaymentType.QUOTA
    payment_method: PaymentMethod = PaymentMethod.CASH
    description: Optional[str] = None

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: Optional[str] = None
    amount: float
    expense_date: date = Field(default_factory=lambda: date.today())
    category: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    description: Optional[str] = None
    amount: float
    expense_date: Optional[date] = None
    category: Optional[str] = None

class TrialClass(BaseModel):
    """Aula experimental: alguem que veio experimentar uma modalidade.

    Nao e um socio nem uma presenca: fica a parte, para nao inflacionar as
    contagens de presencas, e serve para contar quantas experimentais houve
    por mes, por ano e por modalidade.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    activity_id: str
    activity_name: str
    trial_date: date = Field(default_factory=lambda: date.today())
    amount: float = TRIAL_DEFAULT_AMOUNT   # As experimentais sao pagas
    registered_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TrialClassCreate(BaseModel):
    activity_id: str
    trial_date: Optional[date] = None
    amount: Optional[float] = None   # Sem valor, vale o preco normal

class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: ItemCategory
    size: Optional[str] = None
    color: Optional[str] = None
    quantity: int = 0
    price: float
    description: Optional[str] = None
    photo_url: Optional[str] = None      # A fotografia que a montra da app mostra
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Sale(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    quantity: int
    unit_price: float                    # Preco cobrado por unidade
    list_price: Optional[float] = None   # Preco de tabela, para comparar
    total: float
    sale_date: date = Field(default_factory=lambda: date.today())
    member_id: Optional[str] = None      # Cliente, quando e socio
    member_name: Optional[str] = None
    sold_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleCreate(BaseModel):
    item_id: str
    quantity: int
    unit_price: Optional[float] = None   # Vazio usa o preco de tabela
    sale_date: Optional[date] = None
    member_id: Optional[str] = None

class InventoryItemCreate(BaseModel):
    name: str
    category: ItemCategory
    size: Optional[str] = None
    color: Optional[str] = None
    quantity: int = 0
    price: float
    description: Optional[str] = None
    photo_url: Optional[str] = None


# ----------------------------------------------------------------- Parceiros
# Protocolos de parceria: entidades que dao vantagens a quem e socio do KO.

class Partner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    benefit: str                          # "10% em consultas", e o que mais conta
    category: Optional[str] = None        # Saude, Restauracao, Desporto...
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PartnerCreate(BaseModel):
    name: str
    benefit: str
    category: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True


# ---------------------------------------------------------------- Multimedia
# Fotografias dos treinos, alojadas aqui, e videos por link para as redes do
# ginasio: um minuto de video de telemovel sao 50 a 100 MB, e as redes ja
# tem o conteudo e ja tem publico.

class MediaKind(str, Enum):
    PHOTO = "photo"
    VIDEO_LINK = "video_link"


class MediaItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: MediaKind = MediaKind.PHOTO
    url: str                              # Ficheiro nosso, ou link do Instagram
    caption: Optional[str] = None
    taken_on: Optional[date] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MediaItemCreate(BaseModel):
    kind: MediaKind = MediaKind.PHOTO
    url: str
    caption: Optional[str] = None
    taken_on: Optional[date] = None
    is_active: bool = True


# --------------------------------------------------------------- Reservas
# O socio reserva na app e levanta no ginasio. Nao e uma venda: so avisa o
# balcao para deixar o artigo preparado. A venda faz-se quando ele chega.

class ReservationStatus(str, Enum):
    PENDING = "pending"        # Pedida, por preparar
    READY = "ready"            # Preparada, a espera que o socio venha
    DELIVERED = "delivered"    # Entregue (e vendida)
    CANCELLED = "cancelled"


class Reservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    item_details: Optional[str] = None    # Tamanho e cor, para o balcao nao se enganar
    quantity: int = 1
    member_id: str
    member_name: Optional[str] = None
    member_number: Optional[str] = None
    status: ReservationStatus = ReservationStatus.PENDING
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReservationCreate(BaseModel):
    item_id: str
    member_id: str
    quantity: int = 1
    note: Optional[str] = None

# Automated Messaging Models
class AutomatedMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trigger: AutomatedMessageTrigger
    title_pt: str
    title_en: str
    message_pt: str
    message_en: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AutomatedMessageCreate(BaseModel):
    trigger: AutomatedMessageTrigger
    title_pt: str
    title_en: str
    message_pt: str
    message_en: str

class AutomatedMessageUpdate(BaseModel):
    title_pt: Optional[str] = None
    title_en: Optional[str] = None
    message_pt: Optional[str] = None
    message_en: Optional[str] = None
    is_active: Optional[bool] = None

# Financial Models
class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str  # Auto-generated: INV-YYYY-001
    member_id: str
    member_name: str
    member_email: Optional[str] = None
    amount: float
    tax_amount: float = 0.0
    total_amount: float
    description: str
    due_date: date
    issue_date: date = Field(default_factory=lambda: date.today())
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    paid_date: Optional[date] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    member_id: str
    amount: float
    tax_rate: float = 0.23  # 23% IVA Portugal
    description: str
    due_days: int = 30  # Days from issue date

class FiscalReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: str  # monthly, quarterly, yearly
    period_start: date
    period_end: date
    total_revenue: float
    total_tax: float
    total_invoices: int
    paid_invoices: int
    pending_invoices: int
    overdue_invoices: int
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SmartDiscount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    discount_type: str  # percentage, fixed_amount
    discount_value: float
    conditions: Dict  # JSON conditions for automatic application
    is_active: bool = True
    valid_from: date
    valid_until: Optional[date] = None
    usage_limit: Optional[int] = None
    used_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SmartDiscountCreate(BaseModel):
    name: str
    description: str
    discount_type: str
    discount_value: float
    conditions: Dict
    valid_from: date
    valid_until: Optional[date] = None
    usage_limit: Optional[int] = None

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
    except Exception:
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

class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

async def log_audit(current_user: User, action: str, entity_type: str, entity_id: Optional[str] = None, details: Optional[str] = None):
    try:
        log_entry = AuditLog(
            user_id=current_user.id,
            username=current_user.username,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
        log_dict = prepare_for_mongo(log_entry.dict())
        await db.audit_logs.insert_one(log_dict)
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")

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
    """Update existing members with sequential numbers if they don't have them"""
    members_without_numbers = await db.members.find({"member_number": {"$exists": False}}).to_list(None)
    
    for i, member in enumerate(members_without_numbers, 1):
        # Get the next number
        next_number = await generate_next_member_number()
        
        # Update member with number and improved QR code
        qr_code_data = generate_member_qr_code(next_number, member["id"])
        await db.members.update_one(
            {"_id": member["_id"]},
            {
                "$set": {
                    "member_number": next_number,
                    "qr_code": qr_code_data
                }
            }
        )
        print(f"Updated member {member['name']} with number {next_number}")

async def create_default_motivational_notes():
    """Create default sarcastic motivational notes if they don't exist"""
    existing_notes = await db.motivational_notes.count_documents({})
    if existing_notes > 0:
        # Update existing notes to new sarcastic version
        await db.motivational_notes.delete_many({})  # Clear old notes
        print("Cleared old motivational notes for sarcastic update")
    
    sarcastic_notes = [
        {
            "workout_count_min": 1, "workout_count_max": 5, "level_name": "iniciantes",
            "note_pt": "Calçar as luvas já conta como exercício? 🥊",
            "note_en": "Does putting on gloves count as exercise? 🥊"
        },
        {
            "workout_count_min": 6, "workout_count_max": 20, "level_name": "intermedios",
            "note_pt": "O saco ainda não tem medo de ti. Mas já te respeita. 🤷‍♂️", 
            "note_en": "The bag isn't afraid of you yet. But it respects you. 🤷‍♂️"
        },
        {
            "workout_count_min": 21, "workout_count_max": 50, "level_name": "avançados",
            "note_pt": "Parabéns! Já fazes sombra... ao espelho. 😈",
            "note_en": "Congratulations! You're throwing shade... at the mirror. 😈"
        },
        {
            "workout_count_min": 51, "workout_count_max": 999, "level_name": "hardcore",
            "note_pt": "O teu suor devia pagar renda. 🥵",
            "note_en": "Your sweat should pay rent. 🥵"
        }
    ]
    
    for note_data in sarcastic_notes:
        note = MotivationalNote(**note_data)
        note_dict = prepare_for_mongo(note.dict())
        await db.motivational_notes.insert_one(note_dict)
    
    print("Sarcastic motivational notes created successfully! 🔥")

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

# Automated Messaging Helper Functions
async def create_default_automated_messages():
    """Create default automated messages if they don't exist"""
    try:
        existing_count = await db.automated_messages.count_documents({})
        if existing_count > 0:
            return
        
        default_messages = [
            {
                "trigger": "new_member",
                "title_pt": "Bem-vindo ao KO Gym! 🥊",
                "title_en": "Welcome to KO Gym! 🥊",
                "message_pt": "Parabéns por escolheres o KO Gym! Estamos ansiosos para te ver em ação. Prepara-te para dar tudo!",
                "message_en": "Congratulations on choosing KO Gym! We're excited to see you in action. Get ready to give it your all!"
            },
            {
                "trigger": "membership_expiry_7_days",
                "title_pt": "Renovação em 7 dias ⏰",
                "title_en": "Renewal in 7 days ⏰",
                "message_pt": "O teu membership expira em 7 dias! Não percas o ritmo - renova já e continua a tua jornada fitness.",
                "message_en": "Your membership expires in 7 days! Don't lose momentum - renew now and continue your fitness journey."
            },
            {
                "trigger": "membership_expiry_3_days",
                "title_pt": "ÚLTIMA CHAMADA! 3 dias ⚠️",
                "title_en": "LAST CALL! 3 days ⚠️",
                "message_pt": "Só tens 3 dias para renovar! Não deixes que o teu progresso pare aqui. Renova agora!",
                "message_en": "You only have 3 days to renew! Don't let your progress stop here. Renew now!"
            },
            {
                "trigger": "milestone_25_workouts",
                "title_pt": "25 Treinos! 🔥",
                "title_en": "25 Workouts! 🔥",
                "message_pt": "Incrível! Completaste 25 treinos. O teu corpo já está a agradecer. Continua assim, campeão!",
                "message_en": "Amazing! You've completed 25 workouts. Your body is already thanking you. Keep it up, champion!"
            },
            {
                "trigger": "milestone_50_workouts",
                "title_pt": "LENDA! 50 Treinos 🏆",
                "title_en": "LEGEND! 50 Workouts 🏆",
                "message_pt": "50 treinos? És oficialmente uma lenda do KO Gym! O teu suor podia encher uma piscina pequena.",
                "message_en": "50 workouts? You're officially a KO Gym legend! Your sweat could fill a small pool."
            },
            {
                "trigger": "inactive_7_days",
                "title_pt": "Sentimos a tua falta 😢",
                "title_en": "We miss you 😢",
                "message_pt": "Já não te vemos há uma semana! Os sacos de boxe estão com saudades. Volta em breve!",
                "message_en": "We haven't seen you for a week! The punching bags miss you. Come back soon!"
            }
        ]
        
        for msg_data in default_messages:
            message = AutomatedMessage(**msg_data)
            message_dict = prepare_for_mongo(message.dict())
            await db.automated_messages.insert_one(message_dict)
        
        print("Default automated messages created successfully")
    except Exception as e:
        print(f"Error creating default automated messages: {e}")

async def trigger_automated_message(trigger: AutomatedMessageTrigger, member_id: str, context: Dict = {}):
    """Trigger an automated message for a specific member"""
    try:
        # Get the automated message template
        message_template = await db.automated_messages.find_one({
            "trigger": trigger,
            "is_active": True
        })
        
        if not message_template:
            print(f"No active automated message found for trigger: {trigger}")
            return
        
        # Get member info
        member = await db.members.find_one({"id": member_id})
        if not member:
            print(f"Member not found: {member_id}")
            return
        
        # Create the message
        message_data = {
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "member_name": member["name"],
            "title": message_template["title_pt"],  # Default to PT
            "message": message_template["message_pt"],
            "message_type": "automated",
            "trigger": trigger,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "read": False
        }
        
        await db.messages.insert_one(message_data)
        
        # Send push notification if member has FCM token
        if firebase_enabled and member.get("fcm_token"):
            try:
                notification = messaging.Notification(
                    title=message_template["title_pt"],
                    body=message_template["message_pt"]
                )
                
                message = messaging.Message(
                    notification=notification,
                    token=member["fcm_token"],
                    data={
                        "message_id": message_data["id"],
                        "trigger": trigger,
                        "type": "automated_message"
                    }
                )
                
                response = messaging.send(message)
                print(f"Push notification sent successfully: {response}")
            except Exception as e:
                print(f"Push notification failed: {e}")
        
        print(f"Automated message triggered: {trigger} for member {member['name']}")
        return message_data["id"]
        
    except Exception as e:
        print(f"Error triggering automated message: {e}")
        return None

# Financial Helper Functions
async def generate_next_invoice_number():
    """Generate the next sequential invoice number"""
    try:
        current_year = datetime.now().year
        invoice_prefix = f"INV-{current_year}-"
        
        # Find the highest invoice number for current year
        pipeline = [
            {"$match": {"invoice_number": {"$regex": f"^{invoice_prefix}"}}},
            {
                "$addFields": {
                    "invoice_suffix": {
                        "$toInt": {
                            "$arrayElemAt": [
                                {"$split": ["$invoice_number", "-"]}, 2
                            ]
                        }
                    }
                }
            },
            {"$sort": {"invoice_suffix": -1}},
            {"$limit": 1}
        ]
        
        result = await db.invoices.aggregate(pipeline).to_list(1)
        
        if result:
            last_number = result[0].get("invoice_suffix", 0)
            next_number = last_number + 1
        else:
            next_number = 1
        
        return f"{invoice_prefix}{next_number:03d}"
    
    except Exception as e:
        print(f"Error generating invoice number: {e}")
        # Fallback
        timestamp = int(datetime.now().timestamp())
        return f"INV-{datetime.now().year}-{timestamp}"

async def calculate_smart_discount(member_id: str, amount: float):
    """Calculate applicable smart discounts for a member"""
    try:
        member = await db.members.find_one({"id": member_id})
        if not member:
            return 0.0, None
        
        # Get member's workout count and membership duration
        workout_count = member.get("workout_count", 0)
        join_date = member.get("join_date")
        if isinstance(join_date, str):
            join_date = datetime.fromisoformat(join_date).date()
        
        membership_days = (date.today() - join_date).days
        
        # Get active smart discounts
        active_discounts = await db.smart_discounts.find({
            "is_active": True,
            "valid_from": {"$lte": date.today().isoformat()},
            "$or": [
                {"valid_until": None},
                {"valid_until": {"$gte": date.today().isoformat()}}
            ]
        }).to_list(100)
        
        best_discount = 0.0
        best_discount_obj = None
        
        for discount in active_discounts:
            # Check usage limit
            if discount.get("usage_limit") and discount.get("used_count", 0) >= discount["usage_limit"]:
                continue
            
            # Evaluate conditions
            conditions = discount.get("conditions", {})
            applies = True
            
            if "min_workouts" in conditions and workout_count < conditions["min_workouts"]:
                applies = False
            if "min_membership_days" in conditions and membership_days < conditions["min_membership_days"]:
                applies = False
            
            if applies:
                if discount["discount_type"] == "percentage":
                    discount_amount = amount * (discount["discount_value"] / 100)
                else:  # fixed_amount
                    discount_amount = discount["discount_value"]
                
                if discount_amount > best_discount:
                    best_discount = discount_amount
                    best_discount_obj = discount
        
        return best_discount, best_discount_obj
    
    except Exception as e:
        print(f"Error calculating smart discount: {e}")
        return 0.0, None

async def generate_fiscal_report(report_type: str, period_start: date, period_end: date):
    """Generate fiscal report for a specific period"""
    try:
        # Convert dates to ISO strings for MongoDB query
        start_str = period_start.isoformat()
        end_str = period_end.isoformat()
        
        # Aggregate invoice data
        pipeline = [
            {
                "$match": {
                    "issue_date": {
                        "$gte": start_str,
                        "$lte": end_str
                    }
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_revenue": {"$sum": "$total_amount"},
                    "total_tax": {"$sum": "$tax_amount"},
                    "total_invoices": {"$sum": 1},
                    "paid_invoices": {
                        "$sum": {"$cond": [{"$eq": ["$status", "paid"]}, 1, 0]}
                    },
                    "pending_invoices": {
                        "$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}
                    },
                    "overdue_invoices": {
                        "$sum": {"$cond": [{"$eq": ["$status", "overdue"]}, 1, 0]}
                    }
                }
            }
        ]
        
        result = await db.invoices.aggregate(pipeline).to_list(1)
        
        if result:
            data = result[0]
            report = FiscalReport(
                report_type=report_type,
                period_start=period_start,
                period_end=period_end,
                total_revenue=data.get("total_revenue", 0.0),
                total_tax=data.get("total_tax", 0.0),
                total_invoices=data.get("total_invoices", 0),
                paid_invoices=data.get("paid_invoices", 0),
                pending_invoices=data.get("pending_invoices", 0),
                overdue_invoices=data.get("overdue_invoices", 0)
            )
        else:
            # No invoices in period
            report = FiscalReport(
                report_type=report_type,
                period_start=period_start,
                period_end=period_end,
                total_revenue=0.0,
                total_tax=0.0,
                total_invoices=0,
                paid_invoices=0,
                pending_invoices=0,
                overdue_invoices=0
            )
        
        # Save report
        report_dict = prepare_for_mongo(report.dict())
        await db.fiscal_reports.insert_one(report_dict)
        
        return report
    
    except Exception as e:
        print(f"Error generating fiscal report: {e}")
        raise HTTPException(status_code=500, detail="Error generating fiscal report")

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
    
    # Check if email already exists (only if email provided)
    if user_data.email:
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
    await log_audit(current_user, "create", "user", entity_id=user.id, details=f"Criou utilizador {user.username} ({user.role})")
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
    await log_audit(current_user, "update", "user", entity_id=user_id, details=f"Atualizou utilizador {user_id}")
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
    
    await log_audit(current_user, "update", "user", entity_id=user_id, details=f"Alterou estado de utilizador {user_id} para {'ativo' if new_status else 'inativo'}")
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
    
    await log_audit(current_user, "delete", "user", entity_id=user_id, details=f"Eliminou utilizador {user.get('username', user_id)}")
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

def generate_member_qr_code(member_number: str, member_id: str) -> str:
    """Generate QR code for member check-in"""
    qr_data = f"{member_number}-{member_id}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def get_motivational_note_for_member(workout_count: int, language: str = "pt") -> Optional[str]:
    """Get appropriate motivational note based on workout count"""
    # Sarcastic motivational notes - gym humor with edge
    sarcastic_notes = [
        # Iniciantes (1-5 treinos) 🐣
        {
            "min": 1, "max": 5, "level": "iniciantes",
            "notes_pt": [
                "Uau. Um treino. Já te achas lutador, não?",
                "Calçar as luvas já conta como exercício?", 
                "Cuidado, essa motivação toda pode durar... até amanhã.",
                "Já fizeste mais que a maioria. Pena que isso não diga muito.",
                "Duas sessões? A Netflix está a perder um atleta de sofá."
            ],
            "notes_en": [
                "Wow. One workout. Think you're a fighter now?",
                "Does putting on gloves count as exercise?",
                "Be careful, all that motivation might last... until tomorrow.",
                "You've done more than most. Too bad that's not saying much.",
                "Two sessions? Netflix is losing a couch athlete."
            ]
        },
        # Intermédios (6-20 treinos) 🤷‍♂️
        {
            "min": 6, "max": 20, "level": "intermedios", 
            "notes_pt": [
                "Já dás uns murros decentes... no ar.",
                "O saco ainda não tem medo de ti. Mas já te respeita.",
                "Quase a meio caminho de impressionar a tua avó.",
                "Já transpiraste mais que num verão no Alentejo.",
                "A tua consistência surpreende... pela raridade."
            ],
            "notes_en": [
                "You throw decent punches... at the air.",
                "The bag isn't afraid of you yet. But it respects you.",
                "Halfway to impressing your grandmother.",
                "You've sweated more than in an Alentejo summer.",
                "Your consistency is surprising... for its rarity."
            ]
        },
        # Avançados (21-50 treinos) 😈
        {
            "min": 21, "max": 50, "level": "avançados",
            "notes_pt": [
                "A tua frequência de treinos é inversamente proporcional à tua vida social.",
                "Estás a treinar tanto que já achas que és invencível. Spoiler: não és.",
                "És o motivo pelo qual o saco está a pensar em mudar de ginásio.",
                "Parabéns! Já fazes sombra... ao espelho.",
                "Isto começa a parecer compromisso. Estás bem?"
            ],
            "notes_en": [
                "Your workout frequency is inversely proportional to your social life.",
                "You're training so much you think you're invincible. Spoiler: you're not.",
                "You're the reason the bag is thinking about changing gyms.",
                "Congratulations! You're throwing shade... at the mirror.",
                "This is starting to look like commitment. Are you okay?"
            ]
        },
        # Hardcore (51+ treinos) 🥵
        {
            "min": 51, "max": 999, "level": "hardcore",
            "notes_pt": [
                "Estás aqui outra vez? Queres uma cama no balneário?",
                "Estás a treinar tanto que o teu corpo pediu divórcio.",
                "Até o Rocky diria: 'calma, campeão'.",
                "Se os treinos dessem dinheiro... ainda estavas pobre.",
                "Neste ponto, o saco já devia ter plano de saúde.",
                "O teu suor devia pagar renda.",
                "És o pesadelo dos sacos de boxe.",
                "A app tem medo de ti."
            ],
            "notes_en": [
                "Here again? Want a bed in the locker room?", 
                "You're training so much your body filed for divorce.",
                "Even Rocky would say: 'calm down, champ'.",
                "If workouts paid money... you'd still be poor.",
                "At this point, the bag should have health insurance.",
                "Your sweat should pay rent.",
                "You're the nightmare of punching bags.",
                "The app is afraid of you."
            ]
        }
    ]
    
    
    for note_group in sarcastic_notes:
        if note_group["min"] <= workout_count <= note_group["max"]:
            notes = note_group["notes_pt"] if language == "pt" else note_group["notes_en"]
            return random.choice(notes)
    
    return "Estás oficialmente fora da escala. Procura ajuda profissional... ou não. 🔥" if language == "pt" else "You're officially off the charts. Seek professional help... or don't. 🔥"

async def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None):
    """Send push notification via FCM"""
    if not firebase_enabled or not fcm_token:
        print("Firebase not enabled or no FCM token provided")
        return False
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            data=data or {},
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='gym_notifications'
                )
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        sound='default',
                        badge=1
                    )
                )
            )
        )
        
        response = messaging.send(message)
        print(f'Successfully sent message: {response}')
        return True
    except Exception as e:
        print(f'Failed to send push notification: {e}')
        return False

LIGACOES_NOME = {"de", "da", "do", "das", "dos", "e", "du", "del", "di", "van", "von"}

def normalizar_texto(texto: str) -> str:
    """Minusculas e sem acentos, para a pesquisa nao depender de preciosismos."""
    if not texto:
        return ""
    semacentos = unicodedata.normalize("NFD", str(texto))
    semacentos = "".join(c for c in semacentos if unicodedata.category(c) != "Mn")
    return semacentos.lower().strip()

def corresponde_pesquisa(procurado: str, nome=None, telefone=None, email=None, numero=None) -> bool:
    """Todas as palavras escritas tem de bater certo com o socio.

    Procura pelo *inicio* das palavras, nunca a meio, e desde a primeira
    letra: "i" mostra "Ines Ferreira", "Isabel Dias" e "Ana Isabel", mas
    nao "Maria Silva", onde o "i" esta a meio.

    Quem tem o *nome proprio* a comecar pelas letras escritas aparece
    primeiro na lista (ver `relevancia_pesquisa`).

    Ignora maiusculas, acentos e as ligacoes dos nomes ("de", "da", "dos"),
    e a ordem das palavras nao importa.

    O telefone e a excecao: aceita parte do numero em qualquer posicao,
    porque as pessoas costumam lembrar-se dos ultimos digitos.
    """
    termos = [t for t in normalizar_texto(procurado).split() if t and t not in LIGACOES_NOME]
    if not termos:
        return True

    palavras_nome = [p for p in normalizar_texto(nome).split() if p not in LIGACOES_NOME]
    email_partes = [p for p in re.split(r"[@._-]", normalizar_texto(email)) if p]
    numero_limpo = normalizar_texto(numero)
    telefone_digitos = "".join(c for c in str(telefone or "") if c.isdigit())

    for termo in termos:
        if any(p.startswith(termo) for p in palavras_nome):
            continue
        if numero_limpo and (numero_limpo.startswith(termo) or numero_limpo.lstrip("0").startswith(termo)):
            continue
        if any(p.startswith(termo) for p in email_partes):
            continue
        if telefone_digitos and termo.isdigit() and termo in telefone_digitos:
            continue
        return False

    return True

async def recalcular_validades(member_id: str, mexer_no_seguro: bool = True):
    """Reconstroi a quota e o seguro do socio a partir dos pagamentos que existem.

    Chamada depois de editar ou apagar um pagamento: sem isto, apagar a
    mensalidade deixava o socio ativo na mesma, com uma validade orfa.

    **`mexer_no_seguro=False` quando a operacao nao envolveu nenhum seguro.**
    Ha socios com o seguro posto a mao na ficha, sem pagamento associado
    (vieram assim da importacao). Para esses, recalcular apagava o seguro
    silenciosamente, so por se ter corrigido uma mensalidade. O seguro so se
    mexe quando foi mesmo um pagamento de seguro que mudou.
    """
    pagamentos = await db.payments.find({"member_id": member_id, "status": "paid"}).to_list(5000)

    def ultima_data(tipos):
        datas = []
        for p in pagamentos:
            if p.get("payment_type", "quota") not in tipos:
                continue
            valor = p.get("payment_date")
            if isinstance(valor, str):
                try:
                    datas.append(datetime.fromisoformat(valor).date())
                except (ValueError, TypeError):
                    continue
            elif isinstance(valor, date):
                datas.append(valor)
        return max(datas) if datas else None

    quota = ultima_data({"quota", "quota_seguro"})
    seguro = ultima_data({"seguro", "quota_seguro"})

    alteracoes, remover = {}, {}

    if quota:
        alteracoes["membership_paid_date"] = quota
        alteracoes["membership_valid_until"] = add_one_month(quota)
    else:
        remover["membership_paid_date"] = ""
        remover["membership_valid_until"] = ""

    if mexer_no_seguro:
        if seguro:
            validade = seguro + timedelta(days=INSURANCE_VALIDITY_DAYS)
            alteracoes["insurance_paid_date"] = seguro
            alteracoes["insurance_valid_until"] = validade
            alteracoes["expiry_date"] = validade
        else:
            remover["insurance_paid_date"] = ""
            remover["insurance_valid_until"] = ""
            remover["expiry_date"] = ""

    operacao = {}
    if alteracoes:
        operacao["$set"] = prepare_for_mongo(alteracoes)
    if remover:
        operacao["$unset"] = remover

    if operacao:
        await db.members.update_one({"id": member_id}, operacao)
        BusinessCache.invalidate_member_cache()

def numero_de_socio(numero):
    """O numero de socio como numero, para a lista vir 1, 2, 10 e nao 1, 10, 2.

    Uma ficha sem numero vai para o fim, em vez de rebentar a ordenacao.
    """
    try:
        return (0, int(str(numero).strip()))
    except (TypeError, ValueError):
        return (1, 0)


def relevancia_pesquisa(procurado: str, nome: str) -> int:
    """0 para quem tem o nome proprio a comecar pelo que foi escrito, 1 para
    os restantes. Serve para os nomes proprios virem primeiro na lista."""
    termos = [t for t in normalizar_texto(procurado).split() if t and t not in LIGACOES_NOME]
    palavras = [p for p in normalizar_texto(nome).split() if p not in LIGACOES_NOME]
    if not termos or not palavras:
        return 1
    return 0 if any(palavras[0].startswith(t) for t in termos) else 1

def add_one_month(d: date) -> date:
    """Mesmo dia do mes seguinte.

    Quando esse dia nao existe (pagou a 31, o mes seguinte tem 30 ou 28),
    a quota passa para o primeiro dia do mes a seguir, em vez de encurtar
    para o dia 28 ou 30. O socio nunca perde dias por causa do calendario.
    """
    if d.month == 12:
        ano, mes = d.year + 1, 1
    else:
        ano, mes = d.year, d.month + 1

    try:
        return date(ano, mes, d.day)
    except ValueError:
        if mes == 12:
            return date(ano + 1, 1, 1)
        return date(ano, mes + 1, 1)

def derive_member_status(data: dict) -> dict:
    """Estado mostrado ao utilizador: a quota tem de estar em vigor.

    Uma suspensao manual manda sempre. Socios sem nenhuma quota registada
    mantem o estado gravado na ficha, para nao ficarem todos inativos de um
    dia para o outro so porque ainda nao ha historico de pagamentos.
    """
    gravado = data.get("status")
    valid_until = data.get("membership_valid_until")

    if isinstance(valid_until, str):
        try:
            valid_until = datetime.fromisoformat(valid_until).date()
        except (ValueError, TypeError):
            valid_until = None

    if gravado == MemberStatus.SUSPENDED or gravado == "suspended":
        data["membership_status"] = "suspended"
    elif valid_until and valid_until >= date.today():
        data["membership_status"] = "active"
    else:
        # Regra unica e sem excecoes: so esta ativo quem tem a mensalidade
        # paga e dentro da validade. Sem pagamento registado, inativo.
        data["membership_status"] = "inactive"

    return data

def normalize_member_read(data: dict) -> dict:
    """Tudo o que uma ficha precisa antes de ser devolvida."""
    return derive_member_status(normalize_member_activities(data))

def normalize_member_activities(data: dict) -> dict:
    """Keep activity_id (primary, used by check-in) and activity_ids (all modalities) in sync.

    Members created before multi-modality support only carry activity_id, so the list is
    derived from it; when a list is sent, its first entry becomes the primary modality.
    """
    activity_ids = data.get("activity_ids")
    activity_id = data.get("activity_id")

    if activity_ids:
        # Drop empties and duplicates while preserving the order chosen by the user
        seen = []
        for aid in activity_ids:
            if aid and aid not in seen:
                seen.append(aid)
        activity_ids = seen
    elif activity_id:
        activity_ids = [activity_id]
    else:
        activity_ids = []

    data["activity_ids"] = activity_ids
    if activity_ids and activity_id not in activity_ids:
        data["activity_id"] = activity_ids[0]
    elif not activity_ids:
        data["activity_id"] = None
    return data

def prepare_for_mongo(data):
    """Convert date/time objects to ISO strings for MongoDB"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, date):
                # Convert date to midnight datetime for MongoDB compatibility
                midnight_dt = datetime.combine(value, datetime.min.time()).replace(tzinfo=timezone.utc)
                result[key] = midnight_dt.isoformat()
            elif isinstance(value, time):
                result[key] = value.strftime('%H:%M:%S')
            elif isinstance(value, dict):
                result[key] = prepare_for_mongo(value)
            elif isinstance(value, list):
                result[key] = [prepare_for_mongo(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        return result
    elif isinstance(data, date):
        # Handle standalone date objects
        midnight_dt = datetime.combine(data, datetime.min.time()).replace(tzinfo=timezone.utc)
        return midnight_dt.isoformat()
    elif isinstance(data, datetime):
        # Handle standalone datetime objects
        return data.isoformat()
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
            elif key in ['date_of_birth', 'join_date', 'expiry_date', 'check_in_date', 'payment_date', 'sale_date', 'expense_date', 'insurance_paid_date', 'insurance_valid_until', 'membership_paid_date', 'membership_valid_until', 'trial_date'] and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value).date()
                except (ValueError, TypeError):
                    pass
            elif key in ['created_at', 'check_in_time'] and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value)
                except (ValueError, TypeError):
                    pass
    return item

# Member Routes
@api_router.post("/members", response_model=Member)
@api_rate_limit()
async def create_member(
    member_data: MemberCreate,
    current_user: User = Depends(require_admin_or_staff),
    request: Request = None
):
    """Create a new member with premium logging and cache invalidation"""
    try:
        gym_logger.info("Creating new member", 
                       user_id=current_user.id, member_name=member_data.name)
        
        member_dict = normalize_member_activities(member_data.dict())

        # A validade da inscricao e a do seguro
        if member_dict.get("insurance_valid_until"):
            member_dict["expiry_date"] = member_dict["insurance_valid_until"]

        # Generate automatic member number
        member_number = await generate_next_member_number()
        member_dict["member_number"] = member_number
        
        member = Member(**member_dict)
        
        # Generate QR code with member number
        member.qr_code = generate_qr_code(f"{member.member_number}-{member.id}")
        
        member_dict = prepare_for_mongo(member.dict())
        await db.members.insert_one(member_dict)
        
        # Invalidate related cache
        BusinessCache.invalidate_member_cache()
        
        # Log business metric
        gym_logger.business_metric("member_created", 1,
                                 user_id=current_user.id,
                                 member_id=member.id)
        
        gym_logger.info("Member created successfully", 
                       member_id=member.id, 
                       member_number=member_number)
        
        await log_audit(current_user, "create", "member", entity_id=member.id, details=f"Criou membro {member.name}")
        return member
        
    except Exception as e:
        gym_logger.error("Member creation failed", error=e, 
                        user_id=current_user.id, member_name=member_data.name)
        raise HTTPException(status_code=500, detail="Failed to create member")

@api_router.get("/members", response_model=List[Member])
@api_rate_limit()
async def get_members(
    status: Optional[MemberStatus] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin_or_staff),
    request: Request = None
):
    filter_dict = {}
    if status:
        filter_dict['status'] = status
    # A pesquisa e feita aqui e nao na base de dados: assim ignora acentos,
    # maiusculas e as ligacoes dos nomes, que o Mongo nao sabe ignorar
    members = await db.members.find(filter_dict).to_list(2000)

    if search:
        members = [
            m for m in members
            if corresponde_pesquisa(
                search,
                m.get("name"), m.get("phone"), m.get("email"), m.get("member_number")
            )
        ]

    # O QR code e uma imagem em texto e vale 58% do peso da resposta.
    # A lista nao o mostra: quem precisa dele e a ficha individual e a app.
    for m in members:
        m.pop("qr_code", None)

    # Sem pesquisa, a lista vem por numero de socio: e assim que se procura
    # alguem a correr os olhos pela lista. A pesquisar, mandam os nomes
    # proprios, como o dono do ginasio pediu.
    if search:
        members.sort(
            key=lambda m: (
                relevancia_pesquisa(search, m.get("name")),
                normalizar_texto(m.get("name")),
            )
        )
    else:
        members.sort(key=lambda m: numero_de_socio(m.get("member_number")))

    return [Member(**normalize_member_read(parse_from_mongo(member))) for member in members]

@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(
    member_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return Member(**normalize_member_read(parse_from_mongo(member)))

@api_router.get("/members/number/{member_number}", response_model=Member)
async def get_member_by_number(
    member_number: str,
    current_user: User = Depends(require_admin_or_staff)
):
    """Get member by member number"""
    member = await db.members.find_one({"member_number": member_number})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return Member(**normalize_member_read(parse_from_mongo(member)))

@api_router.put("/members/{member_id}", response_model=Member)
async def update_member(
    member_id: str,
    member_data: MemberCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    member_dict = normalize_member_activities(member_data.dict())

    if member_dict.get("insurance_valid_until"):
        member_dict["expiry_date"] = member_dict["insurance_valid_until"]
    else:
        # Sem valor no formulario, mantem-se o que ja estava gravado
        member_dict.pop("insurance_valid_until", None)

    member_dict = prepare_for_mongo(member_dict)
    result = await db.members.update_one(
        {"id": member_id},
        {"$set": member_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    updated_member = await db.members.find_one({"id": member_id})
    await log_audit(current_user, "update", "member", entity_id=member_id, details=f"Atualizou membro {member_id}")
    return Member(**normalize_member_read(parse_from_mongo(updated_member)))

@api_router.delete("/members/{member_id}")
async def delete_member(
    member_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    result = await db.members.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    await log_audit(current_user, "delete", "member", entity_id=member_id, details=f"Eliminou membro {member_id}")
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

@api_router.put("/attendance/{attendance_id}", response_model=Attendance)
async def update_attendance(
    attendance_id: str,
    dados: AttendanceUpdate,
    current_user: User = Depends(require_admin_or_staff)
):
    """Corrige a modalidade de um check-in feito na modalidade errada."""
    registo = await db.attendance.find_one({"id": attendance_id})
    if not registo:
        raise HTTPException(status_code=404, detail="Presenca nao encontrada")

    activity = await db.activities.find_one({"id": dados.activity_id, "is_active": True})
    if not activity:
        raise HTTPException(status_code=404, detail="Modalidade nao encontrada")

    await db.attendance.update_one(
        {"id": attendance_id}, {"$set": {"activity_id": dados.activity_id}}
    )
    BusinessCache.invalidate_member_cache()

    await log_audit(current_user, "update", "attendance", entity_id=attendance_id,
                    details=f"Corrigiu a modalidade da presenca para {activity['name']}")

    atualizado = await db.attendance.find_one({"id": attendance_id})
    return Attendance(**parse_from_mongo(atualizado))

@api_router.delete("/attendance/{attendance_id}")
async def delete_attendance(
    attendance_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    """Apaga um check-in feito por engano.

    As contagens de presencas sao feitas a partir destes registos, por isso
    um check-in a mais estraga as estatisticas do mes.
    """
    registo = await db.attendance.find_one({"id": attendance_id})
    if not registo:
        raise HTTPException(status_code=404, detail="Presenca nao encontrada")

    await db.attendance.delete_one({"id": attendance_id})
    BusinessCache.invalidate_member_cache()

    await log_audit(current_user, "delete", "attendance", entity_id=attendance_id,
                    details=f"Eliminou uma presenca de {registo.get('check_in_date')}")
    return {"message": "Presenca eliminada"}

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
        # As datas sao guardadas com hora, por isso o limite e o dia seguinte:
        # com $lte, um intervalo excluia sempre o ultimo dia
        filter_dict['check_in_date']['$lt'] = (end_date + timedelta(days=1)).isoformat()
    
    attendance_records = await db.attendance.find(filter_dict).to_list(20000)
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
    
    attendance_records = await db.attendance.find(filter_dict).to_list(20000)
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
        # As datas sao guardadas com hora, por isso o limite e o dia seguinte:
        # com $lte, um intervalo excluia sempre o ultimo dia
        filter_dict['check_in_date']['$lt'] = (end_date + timedelta(days=1)).isoformat()
    
    attendance_records = await db.attendance.find(filter_dict).to_list(20000)
    
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
    current_user: User = Depends(require_admin_or_staff)
):
    # Check if member exists
    member = await db.members.find_one({"id": payment_data.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    payment_dict_in = payment_data.dict()
    # An empty date must not override the model default of today
    if payment_dict_in.get("payment_date") is None:
        payment_dict_in.pop("payment_date", None)

    payment = Payment(**payment_dict_in)
    payment_dict = prepare_for_mongo(payment.dict())
    await db.payments.insert_one(payment_dict)

    # Cada pagamento renova o que lhe corresponde na ficha do socio
    renovacao = {}

    if payment.payment_type in (PaymentType.QUOTA, PaymentType.QUOTA_INSURANCE):
        # Quota: cobre ate ao mesmo dia do mes seguinte
        renovacao["membership_paid_date"] = payment.payment_date
        renovacao["membership_valid_until"] = add_one_month(payment.payment_date)

    if payment.payment_type in (PaymentType.INSURANCE, PaymentType.QUOTA_INSURANCE):
        seguro_ate = payment.payment_date + timedelta(days=INSURANCE_VALIDITY_DAYS)
        renovacao["insurance_paid_date"] = payment.payment_date
        renovacao["insurance_valid_until"] = seguro_ate
        # A validade da inscricao acompanha o seguro
        renovacao["expiry_date"] = seguro_ate

    if renovacao:
        await db.members.update_one(
            {"id": payment.member_id},
            {"$set": prepare_for_mongo(renovacao)}
        )
        BusinessCache.invalidate_member_cache()

    detalhe = {
        PaymentType.INSURANCE: "seguro",
        PaymentType.QUOTA_INSURANCE: "quota + seguro"
    }.get(payment.payment_type, "quota")
    await log_audit(current_user, "create", "payment", entity_id=payment.id,
                    details=f"Registou pagamento de {detalhe}: {payment.amount} EUR")
    return payment

@api_router.put("/payments/{payment_id}", response_model=Payment)
async def update_payment(
    payment_id: str,
    dados: PaymentCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    """Corrige um pagamento mal lancado e refaz as validades do socio."""
    existente = await db.payments.find_one({"id": payment_id})
    if not existente:
        raise HTTPException(status_code=404, detail="Pagamento nao encontrado")

    membro = await db.members.find_one({"id": dados.member_id})
    if not membro:
        raise HTTPException(status_code=404, detail="Socio nao encontrado")

    novos = dados.dict()
    if novos.get("payment_date") is None:
        novos["payment_date"] = existente.get("payment_date")

    atualizado = Payment(**{**parse_from_mongo(dict(existente)), **novos, "id": payment_id})
    await db.payments.replace_one({"id": payment_id}, prepare_for_mongo(atualizado.dict()))

    tipos_de_seguro = {PaymentType.INSURANCE.value, PaymentType.QUOTA_INSURANCE.value}
    envolve_seguro = (
        existente.get("payment_type") in tipos_de_seguro
        or atualizado.payment_type in tipos_de_seguro
    )

    # O socio pode ter mudado; ambos tem de ser recalculados
    await recalcular_validades(dados.member_id, mexer_no_seguro=envolve_seguro)
    if existente.get("member_id") != dados.member_id:
        await recalcular_validades(existente["member_id"], mexer_no_seguro=envolve_seguro)

    await log_audit(current_user, "update", "payment", entity_id=payment_id,
                    details=f"Corrigiu pagamento para {atualizado.amount} EUR")
    return atualizado

@api_router.delete("/payments/{payment_id}")
async def delete_payment(
    payment_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    """Apaga um pagamento lancado por engano.

    Ao alcance do colaborador, tal como em Membros. Fica registado no
    historico quem apagou o que, e quando.
    """
    pagamento = await db.payments.find_one({"id": payment_id})
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento nao encontrado")

    await db.payments.delete_one({"id": payment_id})
    await recalcular_validades(
        pagamento["member_id"],
        mexer_no_seguro=pagamento.get("payment_type") in {
            PaymentType.INSURANCE.value, PaymentType.QUOTA_INSURANCE.value
        }
    )

    await log_audit(current_user, "delete", "payment", entity_id=payment_id,
                    details=f"Eliminou pagamento de {pagamento.get('amount')} EUR")
    return {"message": "Pagamento eliminado"}

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(
    member_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[PaymentStatus] = None,
    current_user: User = Depends(require_admin_or_staff)
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
        # As datas sao guardadas com hora, por isso o limite e o dia seguinte:
        # com $lte, um intervalo excluia sempre o ultimo dia
        filter_dict['payment_date']['$lt'] = (end_date + timedelta(days=1)).isoformat()
    
    payments = await db.payments.find(filter_dict).to_list(20000)
    return [Payment(**parse_from_mongo(payment)) for payment in payments]

# Expense Routes (admin and staff)
@api_router.post("/expenses", response_model=Expense)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    expense_dict_in = expense_data.dict()
    if not expense_dict_in.get('expense_date'):
        expense_dict_in['expense_date'] = date.today()
    expense = Expense(**expense_dict_in)
    expense_dict = prepare_for_mongo(expense.dict())
    await db.expenses.insert_one(expense_dict)
    await log_audit(current_user, "create", "expense", entity_id=expense.id, details=f"Registou despesa de {expense.amount} EUR - {expense.description}")
    return expense

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(
    expense_id: str,
    expense_data: ExpenseCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    """Corrige uma despesa lancada com engano.

    Ao alcance do colaborador, tal como os pagamentos: quem a lanca tem de
    a poder emendar. Fica registado no historico quem mudou o que.
    """
    antiga = await db.expenses.find_one({"id": expense_id})
    if not antiga:
        raise HTTPException(status_code=404, detail="Despesa nao encontrada")

    campos = expense_data.dict()
    if not campos.get("expense_date"):
        campos["expense_date"] = parse_from_mongo(dict(antiga)).get("expense_date") or date.today()

    nova = Expense(**campos, id=expense_id, created_at=antiga.get("created_at"))
    await db.expenses.replace_one({"id": expense_id}, prepare_for_mongo(nova.dict()))

    await log_audit(current_user, "update", "expense", entity_id=expense_id,
                    details=f"Corrigiu despesa: {antiga.get('amount')} EUR -> {nova.amount} EUR")
    return nova

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    despesa = await db.expenses.find_one({"id": expense_id})
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa nao encontrada")

    await db.expenses.delete_one({"id": expense_id})
    await log_audit(current_user, "delete", "expense", entity_id=expense_id,
                    details=f"Eliminou despesa de {despesa.get('amount')} EUR")
    return {"message": "Despesa eliminada"}

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    filter_dict = {}
    if category:
        filter_dict['category'] = category
    if start_date:
        filter_dict['expense_date'] = filter_dict.get('expense_date', {})
        filter_dict['expense_date']['$gte'] = start_date.isoformat()
    if end_date:
        filter_dict['expense_date'] = filter_dict.get('expense_date', {})
        # As datas sao guardadas com hora, por isso o limite e o dia seguinte:
        # com $lte, um intervalo excluia sempre o ultimo dia
        filter_dict['expense_date']['$lt'] = (end_date + timedelta(days=1)).isoformat()

    expenses = await db.expenses.find(filter_dict).sort("expense_date", -1).to_list(20000)
    return [Expense(**parse_from_mongo(expense)) for expense in expenses]

# Inventory Routes
@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(
    item_data: InventoryItemCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    item = InventoryItem(**item_data.dict())
    item_dict = prepare_for_mongo(item.dict())
    await db.inventory.insert_one(item_dict)
    await log_audit(current_user, "create", "inventory", entity_id=item.id, details=f"Criou artigo de stock {item.name}")
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
    await log_audit(current_user, "update", "inventory", entity_id=item_id, details=f"Atualizou artigo de stock {item_id}")
    return InventoryItem(**parse_from_mongo(updated_item))

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(
    item_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    await log_audit(current_user, "delete", "inventory", entity_id=item_id, details=f"Eliminou artigo de stock {item_id}")
    return {"message": "Item deleted successfully"}

# Audit Log Routes (Admin only)
@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_admin)
):
    filter_dict = {}
    if entity_type:
        filter_dict['entity_type'] = entity_type
    if action:
        filter_dict['action'] = action
    if start_date or end_date:
        filter_dict['timestamp'] = {}
        if start_date:
            filter_dict['timestamp']['$gte'] = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
        if end_date:
            filter_dict['timestamp']['$lte'] = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc).isoformat()

    logs = await db.audit_logs.find(filter_dict).sort("timestamp", -1).to_list(500)
    return [AuditLog(**parse_from_mongo(log)) for log in logs]

# Dashboard & Reports
@api_router.get("/dashboard")
@dashboard_rate_limit()
async def get_dashboard_stats(current_user: User = Depends(require_admin_or_staff), request: Request = None):
    """Get dashboard statistics with premium analytics"""
    
    try:
        # Log dashboard access
        gym_logger.business_metric("dashboard_accessed", True, 
                                 user_id=current_user.id, user_role=current_user.role)
        
        # Use premium analytics engine
        if analytics_engine:
            gym_logger.info("Getting dashboard analytics", user_role=current_user.role)
            analytics_data = await analytics_engine.get_dashboard_analytics(current_user.role)
            gym_logger.info("Analytics data received", keys=list(analytics_data.keys()))
            
            # Convert to legacy format for frontend compatibility + add new premium data
            response = {
                # Legacy format (maintain compatibility)
                "total_members": analytics_data["members"]["total"],
                "active_members": analytics_data["members"]["active"],
                "today_attendance": analytics_data["attendance"]["today"],
                
                # Premium Analytics Data
                "premium_analytics": {
                    "members": analytics_data["members"],
                    "attendance": analytics_data["attendance"],
                    "activities": analytics_data["activities"],
                    "growth": analytics_data["growth"],
                    "generated_at": analytics_data["generated_at"]
                }
            }
            
            # Add financial data for admins
            if current_user.role == UserRole.ADMIN:
                response["monthly_revenue"] = analytics_data["financial"]["current_month"]
                response["premium_analytics"]["financial"] = analytics_data["financial"]
            
            gym_logger.info("Premium dashboard analytics served", 
                          user_id=current_user.id, metrics_count=len(response["premium_analytics"]))
            
            return response
        
        # Fallback to basic stats if analytics engine not available
        else:
            gym_logger.warning("Analytics engine not available, using fallback")
            
            # Basic fallback stats
            total_members = await db.members.count_documents({})
            hoje_iso = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
            active_members = await db.members.count_documents({
                "status": {"$ne": "suspended"},
                "membership_valid_until": {"$gte": hoje_iso}
            })
            today = date.today()
            today_attendance = await db.attendance.count_documents({
                "check_in_date": {"$regex": f"^{today.isoformat()}"}
            })
            
            response = {
                "total_members": total_members,
                "active_members": active_members,
                "today_attendance": today_attendance,
            }
            
            if current_user.role == UserRole.ADMIN:
                start_of_month = date(today.year, today.month, 1)
                monthly_revenue_result = await db.payments.aggregate([
                    {"$match": {"payment_date": {"$gte": start_of_month.isoformat()}, "status": "paid"}},
                    {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                ]).to_list(1)
                monthly_revenue = monthly_revenue_result[0]["total"] if monthly_revenue_result else 0
                response["monthly_revenue"] = monthly_revenue
            
            return response
            
    except Exception as e:
        gym_logger.error("Dashboard stats generation failed", error=e, user_id=current_user.id)
        raise HTTPException(status_code=500, detail="Failed to generate dashboard statistics")


# Trial Class Routes (aulas experimentais)
@api_router.post("/trials", response_model=TrialClass)
async def create_trial(
    dados: TrialClassCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    activity = await db.activities.find_one({"id": dados.activity_id, "is_active": True})
    if not activity:
        raise HTTPException(status_code=404, detail="Modalidade nao encontrada")

    valor = TRIAL_DEFAULT_AMOUNT if dados.amount is None else dados.amount
    if valor < 0:
        raise HTTPException(status_code=400, detail="O valor nao pode ser negativo")

    trial = TrialClass(
        activity_id=activity["id"],
        activity_name=activity["name"],
        trial_date=dados.trial_date or date.today(),
        amount=valor,
        registered_by=current_user.username
    )
    await db.trial_classes.insert_one(prepare_for_mongo(trial.dict()))
    await log_audit(current_user, "create", "trial", entity_id=trial.id,
                    details=f"Registou aula experimental de {trial.activity_name} ({trial.amount} EUR)")
    return trial

@api_router.get("/trials", response_model=List[TrialClass])
async def get_trials(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    activity_id: Optional[str] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    filtro = {}
    if start_date:
        filtro.setdefault("trial_date", {})["$gte"] = start_date.isoformat()
    if end_date:
        # As datas sao guardadas com hora, por isso o limite e o dia seguinte
        filtro.setdefault("trial_date", {})["$lt"] = (end_date + timedelta(days=1)).isoformat()
    if activity_id:
        filtro["activity_id"] = activity_id

    trials = await db.trial_classes.find(filtro).sort("created_at", -1).to_list(2000)
    return [TrialClass(**parse_from_mongo(t)) for t in trials]

@api_router.put("/trials/{trial_id}", response_model=TrialClass)
async def update_trial(
    trial_id: str,
    dados: TrialClassCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    antiga = await db.trial_classes.find_one({"id": trial_id})
    if not antiga:
        raise HTTPException(status_code=404, detail="Aula experimental nao encontrada")

    activity = await db.activities.find_one({"id": dados.activity_id, "is_active": True})
    if not activity:
        raise HTTPException(status_code=404, detail="Modalidade nao encontrada")

    valor = antiga.get("amount", TRIAL_DEFAULT_AMOUNT) if dados.amount is None else dados.amount
    if valor < 0:
        raise HTTPException(status_code=400, detail="O valor nao pode ser negativo")

    nova = TrialClass(
        id=trial_id,
        activity_id=activity["id"],
        activity_name=activity["name"],
        trial_date=dados.trial_date or parse_from_mongo(dict(antiga)).get("trial_date") or date.today(),
        amount=valor,
        registered_by=antiga.get("registered_by"),
        created_at=antiga.get("created_at")
    )
    await db.trial_classes.replace_one({"id": trial_id}, prepare_for_mongo(nova.dict()))

    await log_audit(current_user, "update", "trial", entity_id=trial_id,
                    details=f"Corrigiu aula experimental para {nova.activity_name} ({nova.amount} EUR)")
    return nova

@api_router.delete("/trials/{trial_id}")
async def delete_trial(trial_id: str, current_user: User = Depends(require_admin_or_staff)):
    resultado = await db.trial_classes.delete_one({"id": trial_id})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aula experimental nao encontrada")
    await log_audit(current_user, "delete", "trial", entity_id=trial_id,
                    details="Eliminou uma aula experimental")
    return {"message": "Aula experimental eliminada"}

# Sales Routes (merchandise sold at the counter)
@api_router.post("/sales", response_model=Sale)
async def create_sale(
    sale_data: SaleCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    if sale_data.quantity <= 0:
        raise HTTPException(status_code=400, detail="A quantidade tem de ser maior que zero")

    item = await db.inventory.find_one({"id": sale_data.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Artigo nao encontrado")

    disponivel = item.get("quantity", 0)
    if sale_data.quantity > disponivel:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente: existem {disponivel} unidades de {item['name']}"
        )

    # Cliente opcional: a venda tambem pode ser a quem nao e socio
    member = None
    if sale_data.member_id:
        member = await db.members.find_one({"id": sale_data.member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Socio nao encontrado")

    preco_tabela = float(item.get("price", 0))
    # O valor cobrado pode diferir do preco de tabela (descontos, promocoes)
    if sale_data.unit_price is None:
        preco = preco_tabela
    else:
        preco = float(sale_data.unit_price)
        if preco < 0:
            raise HTTPException(status_code=400, detail="O preco nao pode ser negativo")

    sale = Sale(
        item_id=item["id"],
        item_name=item["name"],
        quantity=sale_data.quantity,
        unit_price=preco,
        list_price=preco_tabela,
        total=round(preco * sale_data.quantity, 2),
        sale_date=sale_data.sale_date or date.today(),
        member_id=member["id"] if member else None,
        member_name=member["name"] if member else None,
        sold_by=current_user.username
    )

    # Baixa o stock e regista a venda
    await db.inventory.update_one(
        {"id": item["id"]},
        {"$inc": {"quantity": -sale_data.quantity}}
    )
    await db.sales.insert_one(prepare_for_mongo(sale.dict()))
    detalhe = f"Vendeu {sale.quantity}x {sale.item_name} por {sale.total} EUR"
    if abs(preco - preco_tabela) > 0.001:
        detalhe += f" (tabela: {preco_tabela} EUR/un)"
    await log_audit(current_user, "create", "sale", entity_id=sale.id, details=detalhe)

    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    filter_dict = {}
    if start_date:
        filter_dict.setdefault("sale_date", {})["$gte"] = start_date.isoformat()
    if end_date:
        # As datas sao guardadas com hora, por isso o limite e o dia seguinte
        filter_dict.setdefault("sale_date", {})["$lt"] = (end_date + timedelta(days=1)).isoformat()

    sales = await db.sales.find(filter_dict).sort("created_at", -1).to_list(500)
    return [Sale(**parse_from_mongo(sale)) for sale in sales]


@api_router.get("/dashboard/alerts")
@api_rate_limit()
async def get_dashboard_alerts(request: Request, current_user: User = Depends(require_admin_or_staff)):
    """Alertas do Painel Principal: aniversarios de membros e renovacao anual do seguro (aniversario de inscricao)"""
    try:
        today = date.today()
        members = await db.members.find({"status": "active"}).to_list(5000)

        def to_date(value):
            if isinstance(value, datetime):
                return value.date()
            if isinstance(value, date):
                return value
            if isinstance(value, str):
                try:
                    return datetime.fromisoformat(value).date()
                except (ValueError, TypeError):
                    return None
            return None

        def next_occurrence(month, day, base):
            year = base.year
            try:
                occ = date(year, month, day)
            except ValueError:
                occ = date(year, month, 28)
            if occ < base:
                try:
                    occ = date(year + 1, month, day)
                except ValueError:
                    occ = date(year + 1, month, 28)
            return occ

        birthdays_today = []
        birthdays_upcoming = []
        insurance_due_today = []
        insurance_upcoming = []

        for m in members:
            dob = to_date(m.get("date_of_birth"))
            jd = to_date(m.get("join_date"))

            if dob:
                occ = next_occurrence(dob.month, dob.day, today)
                days_until = (occ - today).days
                age = occ.year - dob.year
                entry = {"id": m["id"], "name": m["name"], "member_number": m.get("member_number"), "age": age}
                if days_until == 0:
                    birthdays_today.append(entry)
                elif 0 < days_until <= 7:
                    entry["date"] = occ.isoformat()
                    entry["days_until"] = days_until
                    birthdays_upcoming.append(entry)

            # O seguro e anual. Quando ja foi pago, manda a validade registada;
            # caso contrario cai no aniversario da inscricao, como antes.
            valid_until = to_date(m.get("insurance_valid_until"))
            entry = {"id": m["id"], "name": m["name"], "member_number": m.get("member_number")}

            if valid_until:
                days_until = (valid_until - today).days
                entry["date"] = valid_until.isoformat()
                entry["days_until"] = days_until
                entry["paid"] = True
                if days_until < 0:
                    entry["expired"] = True
                    insurance_due_today.append(entry)
                elif days_until == 0:
                    insurance_due_today.append(entry)
                elif days_until <= 30:
                    insurance_upcoming.append(entry)
            elif jd:
                occ = next_occurrence(jd.month, jd.day, today)
                years = occ.year - jd.year
                if years > 0:
                    days_until = (occ - today).days
                    entry["years"] = years
                    entry["paid"] = False
                    if days_until == 0:
                        insurance_due_today.append(entry)
                    elif 0 < days_until <= 30:
                        entry["date"] = occ.isoformat()
                        entry["days_until"] = days_until
                        insurance_upcoming.append(entry)

        birthdays_upcoming.sort(key=lambda x: x["days_until"])
        insurance_upcoming.sort(key=lambda x: x.get("days_until", 0))

        return {
            "birthdays_today": birthdays_today,
            "birthdays_upcoming": birthdays_upcoming,
            "insurance_due_today": insurance_due_today,
            "insurance_upcoming": insurance_upcoming,
        }
    except Exception as e:
        gym_logger.error("Dashboard alerts generation failed", error=e, user_id=current_user.id)
        raise HTTPException(status_code=500, detail="Failed to generate dashboard alerts")

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
    except (ValueError, IndexError):
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
        "member": Member(**normalize_member_read(parse_from_mongo(member))),
        "attendance": attendance
    }


# NFC Tag check-in
@api_router.put("/members/{member_id}/nfc")
async def assign_member_nfc_tag(
    member_id: str,
    payload: dict,
    current_user: User = Depends(require_admin_or_staff)
):
    """Associar ou atualizar o cartao/pulseira NFC de um membro"""
    nfc_tag_id = (payload.get("nfc_tag_id") or "").strip()
    if not nfc_tag_id:
        raise HTTPException(status_code=400, detail="nfc_tag_id e obrigatorio")

    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    existing = await db.members.find_one({"nfc_tag_id": nfc_tag_id, "id": {"$ne": member_id}})
    if existing:
        raise HTTPException(status_code=400, detail="Este cartao NFC ja esta associado a outro membro")

    await db.members.update_one({"id": member_id}, {"$set": {"nfc_tag_id": nfc_tag_id}})
    updated_member = await db.members.find_one({"id": member_id})
    return Member(**parse_from_mongo(updated_member))


@api_router.post("/checkin/nfc")
async def nfc_checkin(
    payload: dict,
    current_user: User = Depends(require_admin_or_staff)
):
    """Check-in atraves de cartao/pulseira NFC"""
    tag_id = (payload.get("tag_id") or "").strip()
    if not tag_id:
        raise HTTPException(status_code=400, detail="tag_id e obrigatorio")

    member = await db.members.find_one({"nfc_tag_id": tag_id})
    if not member:
        raise HTTPException(status_code=404, detail="Cartao NFC nao reconhecido")

    activity_id = payload.get("activity_id") or member.get("activity_id")
    if not activity_id:
        raise HTTPException(status_code=400, detail="Este membro nao tem modalidade definida. Edite a ficha do membro.")

    attendance_data = AttendanceCreate(
        member_id=member["id"],
        activity_id=activity_id,
        method="nfc"
    )
    attendance = await create_attendance(attendance_data)

    return {
        "message": "Check-in successful",
        "member": Member(**normalize_member_read(parse_from_mongo(member))),
        "attendance": attendance
    }

# Mobile API Endpoints
async def build_mobile_member(member: dict) -> MobileMember:
    """Monta o cartao do socio: treinos, estado das quotas, sequencia e frase."""
    member_id = member["id"]
    workout_count = await db.attendance.count_documents({"member_id": member_id})

    hoje = date.today()

    # Ja treinou hoje?
    checked_in_today = await db.attendance.count_documents({
        "member_id": member_id,
        "check_in_date": {"$regex": f"^{hoje.isoformat()}"}
    }) > 0

    # Sequencia: semanas seguidas com pelo menos um treino, a contar desta
    registos = await db.attendance.find(
        {"member_id": member_id}, {"check_in_date": 1}
    ).to_list(2000)

    semanas = set()
    for r in registos:
        valor = r.get("check_in_date")
        if isinstance(valor, str):
            try:
                d = datetime.fromisoformat(valor).date()
            except (ValueError, TypeError):
                continue
        elif isinstance(valor, date):
            d = valor
        else:
            continue
        inicio_semana = d - timedelta(days=d.weekday())
        semanas.add(inicio_semana)

    streak = 0
    semana_atual = hoje - timedelta(days=hoje.weekday())
    # Se ainda nao treinou esta semana, a sequencia conta a partir da anterior
    if semana_atual not in semanas:
        semana_atual -= timedelta(days=7)
    while semana_atual in semanas:
        streak += 1
        semana_atual -= timedelta(days=7)

    dados = derive_member_status(normalize_member_activities(parse_from_mongo(dict(member))))
    dados["workout_count"] = workout_count
    dados["current_motivational_note"] = get_motivational_note_for_member(workout_count, "pt")
    dados["streak_weeks"] = streak
    dados["checked_in_today"] = checked_in_today

    return MobileMember(**dados)

def so_digitos(texto: str) -> str:
    return "".join(c for c in (texto or "") if c.isdigit())

def telefones_coincidem(escrito: str, guardado: str) -> bool:
    """Compara telefones ignorando espacos, tracos e indicativo do pais."""
    a, b = so_digitos(escrito), so_digitos(guardado)
    if not a or not b:
        return False
    if a == b:
        return True
    # 351912345678 vale tanto como 912345678
    return a.lstrip("0").endswith(b[-9:]) or b.lstrip("0").endswith(a[-9:])

@api_router.post("/mobile/auth/login")
async def mobile_login(credentials: MobileMemberLogin):
    """Login do socio na app, pelo numero de socio e telefone.

    O numero pode ser escrito com ou sem zeros a frente, e o telefone com
    espacos ou indicativo. Socios com a quota em atraso entram na mesma:
    e precisamente quem mais precisa de ver o aviso no cartao.
    """
    escrito = (credentials.member_number or "").strip()
    variantes = {escrito, escrito.lstrip("0"), escrito.zfill(3)}
    variantes = {v for v in variantes if v}

    candidatos = await db.members.find({"member_number": {"$in": list(variantes)}}).to_list(20)

    member = next(
        (m for m in candidatos if telefones_coincidem(credentials.phone, m.get("phone", ""))),
        None
    )

    if not member:
        raise HTTPException(
            status_code=401,
            detail="Numero de socio ou telefone nao conferem. Confirma na rececao."
        )

    if member.get("status") == "suspended":
        raise HTTPException(
            status_code=403,
            detail="Inscricao suspensa. Fala com a rececao."
        )
    
    # Get workout count for motivational note
    workout_count = await db.attendance.count_documents({"member_id": member["id"]})
    
    # Generate token for member (using member role)
    token_data = {"sub": member["id"], "role": "member"}
    access_token = create_access_token(data=token_data)
    
    mobile_member = await build_mobile_member(member)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "member": mobile_member
    }

@api_router.get("/mobile/profile", response_model=MobileMember)
async def get_mobile_profile(member_id: str):
    """Get mobile member profile with workout count and motivational note"""
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return await build_mobile_member(member)

@api_router.put("/mobile/profile/{member_id}")
async def update_mobile_profile(member_id: str, profile_data: dict):
    """Update mobile member profile (limited fields)"""
    # Only allow updating certain fields from mobile
    allowed_fields = ["email", "phone", "address", "photo_url"]
    update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.members.update_one(
        {"id": member_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"message": "Profile updated successfully"}

@api_router.post("/mobile/fcm-token/{member_id}")
async def update_fcm_token(member_id: str, token_data: FCMTokenUpdate):
    """Update FCM token for push notifications"""
    result = await db.members.update_one(
        {"id": member_id},
        {"$set": {"fcm_token": token_data.fcm_token}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"message": "FCM token updated successfully"}

@api_router.get("/mobile/activities", response_model=List[Activity])
async def get_mobile_activities():
    """Get active activities for mobile check-in"""
    activities = await db.activities.find({"is_active": True}).to_list(100)
    return [Activity(**parse_from_mongo(activity)) for activity in activities]

class MobileCheckin(BaseModel):
    member_id: str
    activity_id: Optional[str] = None   # Sem modalidade usa a principal do socio
    method: str = "mobile_qr"           # mobile_qr ou mobile_nfc

@api_router.post("/mobile/checkin/app")
async def mobile_app_checkin(dados: MobileCheckin):
    """Check-in feito pela aplicacao do socio (QR na parede ou autocolante NFC)."""
    member = await db.members.find_one({"id": dados.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Socio nao encontrado")
    if member.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Inscricao suspensa. Fala com a rececao.")

    # Modalidade: a escolhida, ou a principal da ficha
    activity_id = dados.activity_id or member.get("activity_id")
    if not activity_id:
        ids = member.get("activity_ids") or []
        activity_id = ids[0] if ids else None
    if not activity_id:
        raise HTTPException(status_code=400, detail="Sem modalidade definida. Fala com a rececao.")

    activity = await db.activities.find_one({"id": activity_id, "is_active": True})
    if not activity:
        raise HTTPException(status_code=404, detail="Modalidade nao encontrada")

    hoje = date.today()

    # Evita o check-in repetido na mesma modalidade no mesmo dia
    ja_hoje = await db.attendance.find_one({
        "member_id": dados.member_id,
        "activity_id": activity_id,
        "check_in_date": {"$regex": f"^{hoje.isoformat()}"}
    })
    if ja_hoje:
        cartao = await build_mobile_member(member)
        return {
            "message": "Ja tinhas feito check-in hoje nesta modalidade",
            "already_checked_in": True,
            "activity_name": activity["name"],
            "workout_count": cartao.workout_count,
            "streak_weeks": cartao.streak_weeks,
            "motivational_note": cartao.current_motivational_note
        }

    attendance = Attendance(
        member_id=dados.member_id,
        activity_id=activity_id,
        check_in_date=hoje,
        method=dados.method
    )
    await db.attendance.insert_one(prepare_for_mongo(attendance.dict()))
    BusinessCache.invalidate_member_cache()

    cartao = await build_mobile_member(member)
    marcos = [10, 25, 50, 100, 200, 365]

    return {
        "message": "Check-in realizado",
        "already_checked_in": False,
        "activity_name": activity["name"],
        "workout_count": cartao.workout_count,
        "streak_weeks": cartao.streak_weeks,
        "milestone": cartao.workout_count if cartao.workout_count in marcos else None,
        "motivational_note": cartao.current_motivational_note,
        "membership_status": cartao.membership_status,
        "membership_valid_until": cartao.membership_valid_until
    }

@api_router.post("/mobile/checkin")
async def mobile_qr_checkin(member_id: str, activity_id: str):
    """Mobile QR check-in"""
    # Verify member exists and is active
    member = await db.members.find_one({"id": member_id, "status": "active"})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found or inactive")
    
    # Verify activity exists and is active
    activity = await db.activities.find_one({"id": activity_id, "is_active": True})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found or inactive")
    
    # Create attendance record
    attendance_data = AttendanceCreate(
        member_id=member_id,
        activity_id=activity_id,
        check_in_date=date.today(),
        method="mobile_qr"
    )
    attendance = Attendance(**attendance_data.dict())
    attendance_dict = prepare_for_mongo(attendance.dict())
    await db.attendance.insert_one(attendance_dict)
    
    # Get updated workout count and motivational note
    workout_count = await db.attendance.count_documents({"member_id": member_id})
    motivational_note = get_motivational_note_for_member(workout_count, "pt")
    
    return {
        "message": "Check-in successful",
        "workout_count": workout_count,
        "motivational_note": motivational_note,
        "attendance": attendance
    }

@api_router.get("/mobile/attendance/{member_id}")
async def get_mobile_attendance_history(
    member_id: str,
    limit: int = 20,
    offset: int = 0
):
    """Get member attendance history for mobile"""
    # Get attendance with activity details
    attendance_records = await db.attendance.find(
        {"member_id": member_id}
    ).sort("check_in_date", -1).skip(offset).limit(limit).to_list(limit)
    
    # Enrich with activity data
    detailed_records = []
    for record in attendance_records:
        activity = None
        if record.get("activity_id"):
            activity = await db.activities.find_one({"id": record["activity_id"]})
        
        detailed_record = {
            **parse_from_mongo(record),
            "activity": parse_from_mongo(activity) if activity else None
        }
        detailed_records.append(detailed_record)
    
    return detailed_records

@api_router.get("/mobile/messages/{member_id}")
async def get_mobile_messages(member_id: str, unread_only: bool = False):
    """Get messages for member"""
    filter_dict = {
        "$or": [
            {"target_member_id": member_id},  # Individual messages
            {"message_type": "general"},      # General broadcasts
            {"target_role": "member"}         # Member role messages
        ]
    }
    
    messages = await db.messages.find(filter_dict).sort("created_at", -1).limit(50).to_list(50)
    
    # Get notification status for each message
    detailed_messages = []
    for message in messages:
        notification_log = await db.notification_logs.find_one({
            "message_id": message["id"],
            "member_id": member_id
        })
        
        message_data = {
            **parse_from_mongo(message),
            "is_read": notification_log.get("status") == "read" if notification_log else False,
            "read_at": notification_log.get("read_at") if notification_log else None
        }
        
        if not unread_only or not message_data["is_read"]:
            detailed_messages.append(message_data)
    
    return detailed_messages

@api_router.post("/mobile/messages/{message_id}/read/{member_id}")
async def mark_message_as_read(message_id: str, member_id: str):
    """Mark message as read"""
    # Update or create notification log
    await db.notification_logs.update_one(
        {"message_id": message_id, "member_id": member_id},
        {
            "$set": {
                "status": "read",
                "read_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {"message": "Message marked as read"}

@api_router.post("/mobile/payments/mock")
async def mock_mobile_payment(member_id: str, payment_data: MobilePaymentRequest):
    """Mock payment endpoint for mobile app (not operational)"""
    # Verify member exists
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Return mock response
    return {
        "success": False,
        "message": "Payment system is not yet operational. Please pay at the gym reception.",
        "payment_methods_available": ["Cash", "Card", "Transfer", "MBWay"],
        "contact_info": "Please contact gym staff for payment assistance."
    }

# Message/Notification Management (Admin/Staff only)
@api_router.post("/messages", response_model=Message)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(require_admin_or_staff)
):
    """Create and send message/notification"""
    message = Message(
        **message_data.dict(),
        created_by=current_user.id
    )
    message_dict = prepare_for_mongo(message.dict())
    await db.messages.insert_one(message_dict)
    
    # If it's a push notification, create notification logs for target members
    if message.is_push_notification:
        target_members = []
        
        if message.message_type == MessageType.INDIVIDUAL and message.target_member_id:
            # Single member
            member = await db.members.find_one({"id": message.target_member_id})
            if member:
                target_members = [member]
        elif message.message_type == MessageType.GENERAL:
            # All active members
            target_members = await db.members.find({"status": "active"}).to_list(1000)
        elif message.target_role == UserRole.MEMBER:
            # All members with member role
            target_members = await db.members.find({"status": "active"}).to_list(1000)
        
        # Create notification logs and send push notifications
        for member in target_members:
            # Create notification log
            notification_log = NotificationLog(
                message_id=message.id,
                member_id=member["id"],
                fcm_token=member.get("fcm_token")
            )
            
            # Send push notification if FCM token exists
            fcm_token = member.get("fcm_token")
            if fcm_token and firebase_enabled:
                success = await send_push_notification(
                    fcm_token=fcm_token,
                    title=message.title,
                    body=message.content,
                    data={
                        "message_id": message.id,
                        "type": message.message_type,
                        "language": message.language
                    }
                )
                if success:
                    notification_log.status = NotificationStatus.DELIVERED
                else:
                    notification_log.status = NotificationStatus.FAILED
            
            await db.notification_logs.insert_one(prepare_for_mongo(notification_log.dict()))
    
    return message

@api_router.get("/messages", response_model=List[Message])
async def get_messages(
    message_type: Optional[MessageType] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    """Get messages (admin/staff view)"""
    filter_dict = {}
    if message_type:
        filter_dict["message_type"] = message_type
    
    messages = await db.messages.find(filter_dict).sort("created_at", -1).limit(100).to_list(100)
    return [Message(**parse_from_mongo(message)) for message in messages]

# Motivational Notes Management (Admin only)
@api_router.post("/motivational-notes", response_model=MotivationalNote)
async def create_motivational_note(
    note_data: MotivationalNoteCreate,
    current_user: User = Depends(require_admin)
):
    """Create custom motivational note"""
    note = MotivationalNote(**note_data.dict())
    note_dict = prepare_for_mongo(note.dict())
    await db.motivational_notes.insert_one(note_dict)
    return note

@api_router.get("/motivational-notes", response_model=List[MotivationalNote])
async def get_motivational_notes(current_user: User = Depends(require_admin)):
    """Get all motivational notes"""
    notes = await db.motivational_notes.find({"is_active": True}).sort("workout_count_min", 1).to_list(100)
    return [MotivationalNote(**parse_from_mongo(note)) for note in notes]

# Premium Analytics Endpoints
@api_router.get("/analytics/member/{member_id}")
@api_rate_limit()
async def get_member_analytics(
    member_id: str,
    current_user: User = Depends(require_admin_or_staff),
    request: Request = None
):
    """Get detailed analytics for a specific member"""
    try:
        if not analytics_engine:
            raise HTTPException(status_code=503, detail="Analytics engine not available")
        
        analytics = await analytics_engine.get_member_analytics(member_id)
        
        gym_logger.business_metric("member_analytics_accessed", True,
                                 user_id=current_user.id, target_member_id=member_id)
        
        return analytics.__dict__
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        gym_logger.error("Member analytics generation failed", error=e, 
                        user_id=current_user.id, member_id=member_id)
        raise HTTPException(status_code=500, detail="Failed to generate member analytics")

@api_router.get("/analytics/churn")
@dashboard_rate_limit()
async def get_churn_analysis(current_user: User = Depends(require_admin), request: Request = None):
    """Get churn analysis and member retention data (Admin only)"""
    try:
        if not analytics_engine:
            raise HTTPException(status_code=503, detail="Analytics engine not available")
        
        churn_data = await analytics_engine.get_churn_prediction()
        
        gym_logger.business_metric("churn_analysis_accessed", True, user_id=current_user.id)
        
        return churn_data
        
    except Exception as e:
        gym_logger.error("Churn analysis generation failed", error=e, user_id=current_user.id)
        raise HTTPException(status_code=500, detail="Failed to generate churn analysis")

@api_router.get("/system/status")
@api_rate_limit()
async def get_system_status(current_user: User = Depends(require_admin), request: Request = None):
    """Get system health and performance status (Admin only)"""
    try:
        # Cache status
        cache_stats = gym_cache.get_stats()
        
        # Database status
        db_stats = {
            "connected": True,
            "collections": await db.list_collection_names()
        }
        
        # Analytics engine status
        analytics_status = {
            "available": analytics_engine is not None,
            "version": "2.0.0"
        }
        
        # Firebase status
        firebase_status = {
            "enabled": firebase_enabled,
            "messaging_available": firebase_enabled
        }
        
        system_status = {
            "status": "healthy",
            "version": "2.0.0 Premium",
            "cache": cache_stats,
            "database": db_stats,
            "analytics": analytics_status,
            "firebase": firebase_status,
            "uptime_info": "Available in production monitoring"
        }
        
        gym_logger.business_metric("system_status_checked", True, user_id=current_user.id)
        
        return system_status
        
    except Exception as e:
        gym_logger.error("System status check failed", error=e, user_id=current_user.id)
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@api_router.post("/cache/clear")
@api_rate_limit()
async def clear_cache(
    pattern: Optional[str] = None,
    current_user: User = Depends(require_admin),
    request: Request = None
):
    """Clear cache (Admin only)"""
    try:
        if pattern:
            cleared = gym_cache.clear_pattern(pattern)
            message = f"Cleared {cleared} keys matching pattern '{pattern}'"
        else:
            # Clear all business cache
            BusinessCache.invalidate_member_cache()
            gym_cache.clear_pattern("analytics")
            gym_cache.clear_pattern("func:")
            message = "Cleared all business cache"
        
        gym_logger.business_metric("cache_cleared", True, 
                                 user_id=current_user.id, pattern=pattern)
        
        return {"message": message, "success": True}
        
    except Exception as e:
        gym_logger.error("Cache clear failed", error=e, user_id=current_user.id)
        raise HTTPException(status_code=500, detail="Failed to clear cache")

# Authentication helper function
async def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate user with username and password"""
    user = await db.users.find_one({"username": username})
    if not user:
        return None
    
    if not verify_password(password, user["password_hash"]):
        return None
    
    return User(**parse_from_mongo(user))

# Enhanced login endpoint with rate limiting
@api_router.post("/auth/login-premium")
@auth_rate_limit()
async def login_with_premium_features(request: Request, user_data: UserLogin):
    """Premium login with advanced security and logging"""
    
    # Log login attempt
    gym_logger.security_event("login_attempt", user_id=user_data.username)
    
    try:
        user = await authenticate_user(user_data.username, user_data.password)
        if not user:
            # Record failed attempt
            gym_logger.security_event("login_failed", user_id=user_data.username)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Success
        gym_logger.security_event("login_success", user_id=user.id)
        
        # Generate token
        access_token = create_access_token(data={"sub": user.id, "role": user.role})
        
        # Log business metric
        gym_logger.business_metric("user_login", 1, user_id=user.id, user_role=user.role)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user,
            "features": ["premium_analytics", "advanced_security", "enhanced_logging"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        gym_logger.error("Login system error", error=e, user_id=user_data.username)
        raise HTTPException(status_code=500, detail="Authentication system error")

# Automated Messaging Routes (Admin only)
@api_router.post("/automated-messages", response_model=AutomatedMessage)
async def create_automated_message(
    message_data: AutomatedMessageCreate,
    current_user: User = Depends(require_admin)
):
    """Create or update automated message template"""
    message = AutomatedMessage(**message_data.dict())
    message_dict = prepare_for_mongo(message.dict())
    await db.automated_messages.insert_one(message_dict)
    
    gym_logger.business_metric("automated_message_created", True, 
                             user_id=current_user.id, trigger=message.trigger)
    return message

@api_router.get("/automated-messages", response_model=List[AutomatedMessage])
async def get_automated_messages(current_user: User = Depends(require_admin)):
    """Get all automated message templates"""
    messages = await db.automated_messages.find().sort("trigger", 1).to_list(100)
    return [AutomatedMessage(**parse_from_mongo(msg)) for msg in messages]

@api_router.put("/automated-messages/{message_id}", response_model=AutomatedMessage)
async def update_automated_message(
    message_id: str,
    message_data: AutomatedMessageUpdate,
    current_user: User = Depends(require_admin)
):
    """Update automated message template"""
    update_data = {k: v for k, v in message_data.dict().items() if v is not None}
    
    result = await db.automated_messages.update_one(
        {"id": message_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Automated message not found")
    
    updated_message = await db.automated_messages.find_one({"id": message_id})
    return AutomatedMessage(**parse_from_mongo(updated_message))

@api_router.post("/automated-messages/trigger")
async def trigger_automated_message_endpoint(
    trigger_data: dict,
    current_user: User = Depends(require_admin)
):
    """Manually trigger an automated message"""
    trigger = trigger_data.get("trigger")
    member_id = trigger_data.get("member_id")
    
    if not trigger or not member_id:
        raise HTTPException(status_code=400, detail="trigger and member_id required")
    
    message_id = await trigger_automated_message(trigger, member_id)
    if message_id:
        return {"message": "Automated message triggered successfully", "message_id": message_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to trigger automated message")

# Financial Management Routes
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(require_admin)
):
    """Create automatic invoice"""
    # Get member info
    member = await db.members.find_one({"id": invoice_data.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Calculate amounts
    tax_amount = invoice_data.amount * invoice_data.tax_rate
    total_amount = invoice_data.amount + tax_amount
    
    # Calculate smart discount
    discount_amount, discount_obj = await calculate_smart_discount(
        invoice_data.member_id, 
        total_amount
    )
    
    if discount_amount > 0:
        total_amount -= discount_amount
        # Update discount usage count
        if discount_obj:
            await db.smart_discounts.update_one(
                {"id": discount_obj["id"]},
                {"$inc": {"used_count": 1}}
            )
    
    # Generate invoice
    invoice = Invoice(
        invoice_number=await generate_next_invoice_number(),
        member_id=invoice_data.member_id,
        member_name=member["name"],
        member_email=member.get("email"),
        amount=invoice_data.amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        description=invoice_data.description,
        due_date=date.today() + timedelta(days=invoice_data.due_days)
    )
    
    invoice_dict = prepare_for_mongo(invoice.dict())
    await db.invoices.insert_one(invoice_dict)
    
    gym_logger.business_metric("invoice_created", True, 
                             user_id=current_user.id, member_id=invoice_data.member_id,
                             amount=total_amount, discount_applied=discount_amount > 0)
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    member_id: Optional[str] = None,
    status: Optional[PaymentStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_admin_or_staff)
):
    """Get invoices with filters"""
    filter_dict = {}
    if member_id:
        filter_dict["member_id"] = member_id
    if status:
        filter_dict["status"] = status
    if start_date:
        filter_dict["issue_date"] = filter_dict.get("issue_date", {})
        filter_dict["issue_date"]["$gte"] = start_date.isoformat()
    if end_date:
        filter_dict["issue_date"] = filter_dict.get("issue_date", {})
        filter_dict["issue_date"]["$lt"] = (end_date + timedelta(days=1)).isoformat()
    
    invoices = await db.invoices.find(filter_dict).sort("issue_date", -1).to_list(1000)
    return [Invoice(**parse_from_mongo(invoice)) for invoice in invoices]

@api_router.put("/invoices/{invoice_id}/pay")
async def mark_invoice_as_paid(
    invoice_id: str,
    payment_data: dict,
    current_user: User = Depends(require_admin_or_staff)
):
    """Mark invoice as paid"""
    payment_method = payment_data.get("payment_method")
    
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {
            "$set": {
                "status": "paid",
                "payment_method": payment_method,
                "paid_date": date.today().isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Create payment record
    invoice = await db.invoices.find_one({"id": invoice_id})
    payment = Payment(
        member_id=invoice["member_id"],
        amount=invoice["total_amount"],
        payment_method=payment_method,
        description=f"Payment for invoice {invoice['invoice_number']}",
        invoice_id=invoice_id
    )
    payment_dict = prepare_for_mongo(payment.dict())
    await db.payments.insert_one(payment_dict)
    
    gym_logger.business_metric("invoice_paid", True, 
                             user_id=current_user.id, invoice_id=invoice_id,
                             amount=invoice["total_amount"])
    return {"message": "Invoice marked as paid"}

@api_router.get("/fiscal-reports/{report_type}")
async def get_fiscal_report(
    report_type: str,
    year: int = None,
    month: int = None,
    quarter: int = None,
    current_user: User = Depends(require_admin)
):
    """Generate fiscal report"""
    if year is None:
        year = datetime.now().year
    
    # Calculate period
    if report_type == "monthly" and month:
        period_start = date(year, month, 1)
        if month == 12:
            period_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            period_end = date(year, month + 1, 1) - timedelta(days=1)
    elif report_type == "quarterly" and quarter:
        start_month = (quarter - 1) * 3 + 1
        period_start = date(year, start_month, 1)
        if quarter == 4:
            period_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            period_end = date(year, start_month + 3, 1) - timedelta(days=1)
    elif report_type == "yearly":
        period_start = date(year, 1, 1)
        period_end = date(year, 12, 31)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type or missing parameters")
    
    report = await generate_fiscal_report(report_type, period_start, period_end)
    
    gym_logger.business_metric("fiscal_report_generated", True,
                             user_id=current_user.id, report_type=report_type,
                             period_start=period_start.isoformat())
    return report

# Smart Discounts Routes
@api_router.post("/smart-discounts", response_model=SmartDiscount)
async def create_smart_discount(
    discount_data: SmartDiscountCreate,
    current_user: User = Depends(require_admin)
):
    """Create smart discount rule"""
    discount = SmartDiscount(**discount_data.dict())
    discount_dict = prepare_for_mongo(discount.dict())
    await db.smart_discounts.insert_one(discount_dict)
    
    gym_logger.business_metric("smart_discount_created", True,
                             user_id=current_user.id, discount_name=discount.name)
    return discount

@api_router.get("/smart-discounts", response_model=List[SmartDiscount])
async def get_smart_discounts(current_user: User = Depends(require_admin)):
    """Get all smart discount rules"""
    discounts = await db.smart_discounts.find().sort("created_at", -1).to_list(100)
    return [SmartDiscount(**parse_from_mongo(discount)) for discount in discounts]

@api_router.put("/smart-discounts/{discount_id}/toggle")
async def toggle_smart_discount(
    discount_id: str,
    current_user: User = Depends(require_admin)
):
    """Toggle smart discount active status"""
    discount = await db.smart_discounts.find_one({"id": discount_id})
    if not discount:
        raise HTTPException(status_code=404, detail="Smart discount not found")
    
    new_status = not discount.get("is_active", True)
    
    await db.smart_discounts.update_one(
        {"id": discount_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"message": f"Smart discount {'activated' if new_status else 'deactivated'}"}

# Automated Membership Management
@api_router.post("/members/{member_id}/check-triggers")
async def check_member_triggers(
    member_id: str,
    current_user: User = Depends(require_admin_or_staff)
):
    """Check and trigger automated messages for member based on their current state"""
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    triggered_messages = []
    
    # Check workout milestones
    workout_count = member.get("workout_count", 0)
    milestone_triggers = {
        10: "milestone_10_workouts",
        25: "milestone_25_workouts", 
        50: "milestone_50_workouts",
        100: "milestone_100_workouts"
    }
    
    for milestone, trigger in milestone_triggers.items():
        if workout_count == milestone:
            message_id = await trigger_automated_message(trigger, member_id)
            if message_id:
                triggered_messages.append({"trigger": trigger, "message_id": message_id})
    
    # Check membership expiry
    if member.get("expiry_date"):
        expiry_date = member["expiry_date"]
        if isinstance(expiry_date, str):
            expiry_date = datetime.fromisoformat(expiry_date).date()
        
        days_until_expiry = (expiry_date - date.today()).days
        
        if days_until_expiry == 7:
            message_id = await trigger_automated_message("membership_expiry_7_days", member_id)
            if message_id:
                triggered_messages.append({"trigger": "membership_expiry_7_days", "message_id": message_id})
        elif days_until_expiry == 3:
            message_id = await trigger_automated_message("membership_expiry_3_days", member_id)
            if message_id:
                triggered_messages.append({"trigger": "membership_expiry_3_days", "message_id": message_id})
    
    # Check inactivity (no attendance in 7 or 30 days)
    recent_attendance = await db.attendance.find({
        "member_id": member_id,
        "date": {"$gte": (date.today() - timedelta(days=30)).isoformat()}
    }).sort("date", -1).limit(1).to_list(1)
    
    if not recent_attendance:
        # No attendance in 30 days
        message_id = await trigger_automated_message("inactive_30_days", member_id)
        if message_id:
            triggered_messages.append({"trigger": "inactive_30_days", "message_id": message_id})
    else:
        last_attendance = recent_attendance[0]
        last_date = datetime.fromisoformat(last_attendance["date"]).date()
        days_since_last = (date.today() - last_date).days
        
        if days_since_last == 7:
            message_id = await trigger_automated_message("inactive_7_days", member_id)
            if message_id:
                triggered_messages.append({"trigger": "inactive_7_days", "message_id": message_id})
    
    return {
        "member_name": member["name"],
        "triggered_messages": triggered_messages,
        "total_triggered": len(triggered_messages)
    }

# Apply rate limiting to existing endpoints
original_create_member = api_router.routes[0]  # Will be properly applied after all routes

# Include router
# ============================================================================
# FOTOGRAFIAS
# ============================================================================
# Ficam em disco, num volume do Docker, e sao servidas pelo proprio servidor
# em /api/uploads/... Assim passam pelo encaminhamento que o site ja tem e
# nao e preciso mexer no nginx da maquina.
#
# Nao vao para a base de dados: as copias de seguranca sao despejos da base, e
# meia duzia de fotografias punham um ficheiro de 15 MB a pesar centenas.

PASTA_UPLOADS = Path(os.environ.get("UPLOADS_DIR", "/app/uploads"))
EXTENSOES_DE_IMAGEM = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
TAMANHO_MAXIMO = 8 * 1024 * 1024   # 8 MB: uma fotografia de telemovel cabe


@api_router.post("/uploads")
async def guardar_imagem(
    ficheiro: UploadFile = File(...),
    current_user: User = Depends(require_admin_or_staff)
):
    """Recebe uma imagem e devolve o endereco onde ela fica."""
    extensao = Path(ficheiro.filename or "").suffix.lower()
    if extensao not in EXTENSOES_DE_IMAGEM:
        raise HTTPException(status_code=400, detail="So aceito imagens: jpg, png, webp ou gif.")

    conteudo = await ficheiro.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="O ficheiro esta vazio.")
    if len(conteudo) > TAMANHO_MAXIMO:
        raise HTTPException(
            status_code=400,
            detail=f"A imagem e demasiado grande ({len(conteudo) // (1024 * 1024)} MB). O limite sao 8 MB."
        )

    PASTA_UPLOADS.mkdir(parents=True, exist_ok=True)
    nome = f"{uuid.uuid4().hex}{extensao}"
    (PASTA_UPLOADS / nome).write_bytes(conteudo)

    await log_audit(current_user, "create", "upload", entity_id=nome,
                    details=f"Carregou a imagem {ficheiro.filename}")
    return {"url": f"/api/uploads/{nome}", "bytes": len(conteudo)}


@api_router.delete("/uploads/{nome}")
async def apagar_imagem(nome: str, current_user: User = Depends(require_admin_or_staff)):
    # So o proprio nome do ficheiro, para ninguem sair da pasta das imagens
    if "/" in nome or chr(92) in nome or ".." in nome:
        raise HTTPException(status_code=400, detail="Nome invalido.")
    caminho = PASTA_UPLOADS / nome
    if caminho.exists():
        caminho.unlink()
    return {"message": "Imagem eliminada"}


# ============================================================================
# PARCEIROS
# ============================================================================

@api_router.post("/partners", response_model=Partner)
async def criar_parceiro(dados: PartnerCreate, current_user: User = Depends(require_admin)):
    parceiro = Partner(**dados.dict())
    await db.partners.insert_one(prepare_for_mongo(parceiro.dict()))
    await log_audit(current_user, "create", "partner", entity_id=parceiro.id,
                    details=f"Criou o parceiro {parceiro.name}")
    return parceiro


@api_router.get("/partners", response_model=List[Partner])
async def listar_parceiros(current_user: User = Depends(require_admin_or_staff)):
    parceiros = await db.partners.find().sort("name", 1).to_list(500)
    return [Partner(**parse_from_mongo(x)) for x in parceiros]


@api_router.put("/partners/{partner_id}", response_model=Partner)
async def corrigir_parceiro(
    partner_id: str, dados: PartnerCreate, current_user: User = Depends(require_admin)
):
    antigo = await db.partners.find_one({"id": partner_id})
    if not antigo:
        raise HTTPException(status_code=404, detail="Parceiro nao encontrado")
    novo = Partner(**dados.dict(), id=partner_id, created_at=antigo.get("created_at"))
    await db.partners.replace_one({"id": partner_id}, prepare_for_mongo(novo.dict()))
    await log_audit(current_user, "update", "partner", entity_id=partner_id,
                    details=f"Corrigiu o parceiro {novo.name}")
    return novo


@api_router.delete("/partners/{partner_id}")
async def apagar_parceiro(partner_id: str, current_user: User = Depends(require_admin)):
    parceiro = await db.partners.find_one({"id": partner_id})
    if not parceiro:
        raise HTTPException(status_code=404, detail="Parceiro nao encontrado")
    await db.partners.delete_one({"id": partner_id})
    await log_audit(current_user, "delete", "partner", entity_id=partner_id,
                    details=f"Eliminou o parceiro {parceiro.get('name')}")
    return {"message": "Parceiro eliminado"}


# ============================================================================
# MULTIMEDIA
# ============================================================================

@api_router.post("/media", response_model=MediaItem)
async def criar_media(dados: MediaItemCreate, current_user: User = Depends(require_admin_or_staff)):
    item = MediaItem(**dados.dict())
    await db.media.insert_one(prepare_for_mongo(item.dict()))
    await log_audit(current_user, "create", "media", entity_id=item.id,
                    details="Publicou um item de multimedia")
    return item


@api_router.get("/media", response_model=List[MediaItem])
async def listar_media(current_user: User = Depends(require_admin_or_staff)):
    itens = await db.media.find().sort("created_at", -1).to_list(2000)
    return [MediaItem(**parse_from_mongo(m)) for m in itens]


@api_router.put("/media/{media_id}", response_model=MediaItem)
async def corrigir_media(
    media_id: str, dados: MediaItemCreate, current_user: User = Depends(require_admin_or_staff)
):
    antigo = await db.media.find_one({"id": media_id})
    if not antigo:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    novo = MediaItem(**dados.dict(), id=media_id, created_at=antigo.get("created_at"))
    await db.media.replace_one({"id": media_id}, prepare_for_mongo(novo.dict()))
    return novo


@api_router.delete("/media/{media_id}")
async def apagar_media(media_id: str, current_user: User = Depends(require_admin_or_staff)):
    item = await db.media.find_one({"id": media_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    await db.media.delete_one({"id": media_id})
    await log_audit(current_user, "delete", "media", entity_id=media_id,
                    details="Eliminou um item de multimedia")
    return {"message": "Item eliminado"}


# ============================================================================
# RESERVAS
# ============================================================================

@api_router.get("/reservations", response_model=List[Reservation])
async def listar_reservas(
    status_filtro: Optional[ReservationStatus] = Query(None, alias="status"),
    current_user: User = Depends(require_admin_or_staff)
):
    filtro = {"status": status_filtro.value} if status_filtro else {}
    reservas = await db.reservations.find(filtro).sort("created_at", -1).to_list(2000)
    return [Reservation(**parse_from_mongo(r)) for r in reservas]


@api_router.put("/reservations/{reservation_id}", response_model=Reservation)
async def mudar_estado_da_reserva(
    reservation_id: str,
    novo_estado: ReservationStatus = Query(..., alias="status"),
    current_user: User = Depends(require_admin_or_staff)
):
    reserva = await db.reservations.find_one({"id": reservation_id})
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva nao encontrada")
    await db.reservations.update_one(
        {"id": reservation_id}, {"$set": {"status": novo_estado.value}}
    )
    await log_audit(current_user, "update", "reservation", entity_id=reservation_id,
                    details=f"Reserva de {reserva.get('item_name')} passou a {novo_estado.value}")
    atualizada = await db.reservations.find_one({"id": reservation_id})
    return Reservation(**parse_from_mongo(atualizada))


@api_router.delete("/reservations/{reservation_id}")
async def apagar_reserva(reservation_id: str, current_user: User = Depends(require_admin_or_staff)):
    if (await db.reservations.delete_one({"id": reservation_id})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reserva nao encontrada")
    return {"message": "Reserva eliminada"}


# ============================================================================
# O QUE A APLICACAO DO SOCIO LE
# ============================================================================
# Como as outras rotas /mobile, nao pedem sessao: o que mostram e publico do
# ginasio (parceiros, fotografias, montra) e nao tem dados de ninguem.

@api_router.get("/mobile/partners", response_model=List[Partner])
async def parceiros_para_a_app():
    parceiros = await db.partners.find({"is_active": True}).sort("name", 1).to_list(500)
    return [Partner(**parse_from_mongo(x)) for x in parceiros]


@api_router.get("/mobile/media", response_model=List[MediaItem])
async def multimedia_para_a_app():
    itens = await db.media.find({"is_active": True}).sort("created_at", -1).to_list(300)
    return [MediaItem(**parse_from_mongo(m)) for m in itens]


@api_router.get("/mobile/shop", response_model=List[InventoryItem])
async def montra_para_a_app():
    """A montra: so o que tem stock e fotografia."""
    artigos = await db.inventory.find({
        "quantity": {"$gt": 0},
        "photo_url": {"$nin": [None, ""]}
    }).sort("name", 1).to_list(500)
    return [InventoryItem(**parse_from_mongo(a)) for a in artigos]


@api_router.post("/mobile/reservations", response_model=Reservation)
async def reservar_pela_app(dados: ReservationCreate):
    """O socio reserva; o balcao prepara. Nao mexe no stock nem no dinheiro."""
    if dados.quantity < 1:
        raise HTTPException(status_code=400, detail="A quantidade tem de ser pelo menos 1.")

    artigo = await db.inventory.find_one({"id": dados.item_id})
    if not artigo:
        raise HTTPException(status_code=404, detail="Artigo nao encontrado")
    if artigo.get("quantity", 0) < dados.quantity:
        raise HTTPException(
            status_code=400, detail=f"So restam {artigo.get('quantity', 0)} unidades."
        )

    socio = await db.members.find_one({"id": dados.member_id})
    if not socio:
        raise HTTPException(status_code=404, detail="Socio nao encontrado")

    detalhes = " - ".join(x for x in [artigo.get("size"), artigo.get("color")] if x)
    reserva = Reservation(
        item_id=artigo["id"],
        item_name=artigo["name"],
        item_details=detalhes or None,
        quantity=dados.quantity,
        member_id=socio["id"],
        member_name=socio.get("name"),
        member_number=socio.get("member_number"),
        note=dados.note,
    )
    await db.reservations.insert_one(prepare_for_mongo(reserva.dict()))
    return reserva


@api_router.get("/mobile/reservations/{member_id}", response_model=List[Reservation])
async def reservas_do_socio(member_id: str):
    reservas = await db.reservations.find({"member_id": member_id}).sort("created_at", -1).to_list(200)
    return [Reservation(**parse_from_mongo(r)) for r in reservas]


app.include_router(api_router)

# As fotografias sao servidas depois do router, para nao tapar as rotas da API
PASTA_UPLOADS.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(PASTA_UPLOADS)), name="uploads")

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
async def criar_indices():
    """Indices da base de dados, criados no arranque.

    Sem eles, cada consulta percorre a coleccao inteira. Com mil registos
    ainda e rapido; com dez mil deixa de ser. Criar um indice que ja existe
    nao faz nada, por isso e seguro correr sempre.
    """
    indices = {
        "members": ["id", "member_number", "status", "membership_valid_until", "nfc_tag_id"],
        "attendance": ["member_id", "check_in_date", "activity_id"],
        "payments": ["member_id", "payment_date", "status", "payment_type"],
        "sales": ["sale_date", "item_id", "member_id"],
        "trial_classes": ["trial_date", "activity_id"],
        "expenses": ["expense_date", "category"],
        "inventory": ["id", "category"],
        "activities": ["id", "is_active"],
        "users": ["username", "id"],
        "audit_logs": ["timestamp", "entity_type"],
    }

    criados = 0
    for coleccao, campos in indices.items():
        for campo in campos:
            try:
                await db[coleccao].create_index(campo)
                criados += 1
            except Exception as e:
                gym_logger.warning("Indice nao criado", collection=coleccao, field=campo, error=e)

    gym_logger.info("Indices verificados", total=criados)

async def startup_db():
    global analytics_engine
    
    gym_logger.info("🚀 Starting KO Gym Management API - Premium Edition")
    
    initialize_firebase()
    await criar_indices()
    await create_admin_user()
    await create_default_activities()
    await update_existing_members_with_numbers()
    await create_default_motivational_notes()
    await create_default_automated_messages()
    
    # Inicializar Analytics Engine
    global analytics_engine
    analytics_engine = AnalyticsEngine(db)
    gym_logger.info("✅ Analytics Engine initialized")
    
    # Verificar status dos sistemas premium
    cache_stats = gym_cache.get_stats()
    gym_logger.info("💾 Cache system status", **cache_stats)
    
    gym_logger.info("🎯 KO Gym API Premium started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
