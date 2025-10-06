import strawberry
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

# GraphQL Types
@strawberry.type
class MemberType:
    id: str
    member_number: str
    name: str
    email: Optional[str]
    phone: str
    membership_type: str
    status: str
    join_date: str
    created_at: str

@strawberry.type
class AttendanceType:
    id: str
    member_id: str
    check_in_date: str
    check_in_time: str
    method: str
    member: Optional[MemberType]
    activity: Optional['ActivityType']

@strawberry.type
class ActivityType:
    id: str
    name: str
    color: str
    description: Optional[str]
    is_active: bool

@strawberry.type
class PaymentType:
    id: str
    member_id: str
    amount: float
    payment_date: str
    payment_method: str
    status: str
    description: Optional[str]

@strawberry.type
class InventoryType:
    id: str
    name: str
    category: str
    quantity: int
    price: float
    sold_quantity: Optional[int]
    purchase_price: Optional[float]

@strawberry.type
class UserType:
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool

# Input Types
@strawberry.input
class MemberInput:
    name: str
    phone: str
    date_of_birth: str
    nationality: str
    profession: str
    address: str
    membership_type: str
    email: Optional[str] = None
    notes: Optional[str] = None

@strawberry.input
class AttendanceInput:
    member_id: str
    activity_id: str
    method: str = "manual"

# Real-time Subscription Types
@strawberry.type
class CheckInEvent:
    member: MemberType
    activity: ActivityType
    timestamp: str
    event_type: str  # "check_in" or "check_out"

@strawberry.type
class DashboardStats:
    total_members: int
    active_today: int
    current_occupancy: int
    revenue_today: float
    timestamp: str

# Query Resolvers
@strawberry.type
class Query:
    @strawberry.field
    async def members(self, limit: Optional[int] = 100) -> List[MemberType]:
        """Get all members with optional limit"""
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        members = await db.members.find().limit(limit or 100).to_list(limit or 100)
        return [MemberType(**{k: str(v) if k in ['join_date', 'created_at'] else v 
                            for k, v in member.items() if k != '_id'}) 
                for member in members]
    
    @strawberry.field
    async def member_by_id(self, id: str) -> Optional[MemberType]:
        """Get member by ID"""
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        member = await db.members.find_one({"id": id})
        if member:
            return MemberType(**{k: str(v) if k in ['join_date', 'created_at'] else v 
                               for k, v in member.items() if k != '_id'})
        return None
    
    @strawberry.field
    async def attendance_today(self) -> List[AttendanceType]:
        """Get today's attendance"""
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        from datetime import date
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        today = date.today().isoformat()
        attendance = await db.attendance.find({"check_in_date": today}).to_list(1000)
        
        result = []
        for att in attendance:
            # Get member and activity data
            member = await db.members.find_one({"id": att["member_id"]})
            activity = None
            if att.get("activity_id"):
                activity = await db.activities.find_one({"id": att["activity_id"]})
            
            att_obj = AttendanceType(
                id=att["id"],
                member_id=att["member_id"],
                check_in_date=str(att["check_in_date"]),
                check_in_time=str(att["check_in_time"]),
                method=att.get("method", "manual"),
                member=MemberType(**{k: str(v) if k in ['join_date', 'created_at'] else v 
                                   for k, v in member.items() if k != '_id'}) if member else None,
                activity=ActivityType(**{k: str(v) if k == 'created_at' else v 
                                       for k, v in activity.items() if k != '_id'}) if activity else None
            )
            result.append(att_obj)
        
        return result
    
    @strawberry.field
    async def dashboard_stats(self) -> DashboardStats:
        """Get real-time dashboard statistics"""
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        from datetime import date, datetime
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        # Calculate stats
        total_members = await db.members.count_documents({"status": "active"})
        
        today = date.today().isoformat()
        active_today = len(await db.attendance.find({"check_in_date": today}).to_list(1000))
        
        # Mock current occupancy (would be real-time with IoT sensors)
        current_occupancy = active_today % 50  # Simple mock
        
        # Today's revenue
        payments = await db.payments.find({
            "payment_date": today, 
            "status": "paid"
        }).to_list(1000)
        revenue_today = sum(p["amount"] for p in payments)
        
        return DashboardStats(
            total_members=total_members,
            active_today=active_today,
            current_occupancy=current_occupancy,
            revenue_today=revenue_today,
            timestamp=datetime.now().isoformat()
        )

# Mutation Resolvers
@strawberry.type
class Mutation:
    @strawberry.field
    async def create_member(self, member_input: MemberInput) -> MemberType:
        """Create a new member"""
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        from uuid import uuid4
        from datetime import datetime, date, timezone
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        # Generate member number
        member_count = await db.members.count_documents({})
        member_number = f"{member_count + 1:03d}"
        
        # Create member object
        member_data = {
            "id": str(uuid4()),
            "member_number": member_number,
            "name": member_input.name,
            "email": member_input.email,
            "phone": member_input.phone,
            "date_of_birth": member_input.date_of_birth,
            "nationality": member_input.nationality,
            "profession": member_input.profession,
            "address": member_input.address,
            "membership_type": member_input.membership_type,
            "status": "active",
            "join_date": date.today().isoformat(),
            "notes": member_input.notes,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Insert into database
        await db.members.insert_one(member_data)
        
        return MemberType(**{k: str(v) if k in ['join_date', 'created_at'] else v 
                           for k, v in member_data.items()})
    
    @strawberry.field
    async def create_attendance(self, attendance_input: AttendanceInput) -> AttendanceType:
        """Create attendance record"""
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        from uuid import uuid4
        from datetime import datetime, date, timezone
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        # Create attendance record
        attendance_data = {
            "id": str(uuid4()),
            "member_id": attendance_input.member_id,
            "activity_id": attendance_input.activity_id,
            "check_in_date": date.today().isoformat(),
            "check_in_time": datetime.now(timezone.utc).isoformat(),
            "method": attendance_input.method
        }
        
        # Insert into database
        await db.attendance.insert_one(attendance_data)
        
        # Get member and activity for response
        member = await db.members.find_one({"id": attendance_input.member_id})
        activity = await db.activities.find_one({"id": attendance_input.activity_id})
        
        return AttendanceType(
            id=attendance_data["id"],
            member_id=attendance_data["member_id"],
            check_in_date=attendance_data["check_in_date"],
            check_in_time=attendance_data["check_in_time"],
            method=attendance_data["method"],
            member=MemberType(**{k: str(v) if k in ['join_date', 'created_at'] else v 
                               for k, v in member.items() if k != '_id'}) if member else None,
            activity=ActivityType(**{k: str(v) if k == 'created_at' else v 
                                   for k, v in activity.items() if k != '_id'}) if activity else None
        )

# Real-time Subscriptions
@strawberry.type
class Subscription:
    @strawberry.subscription
    async def check_in_events(self) -> CheckInEvent:
        """Subscribe to real-time check-in events"""
        # This would connect to a real message queue like RabbitMQ
        # For now, we'll simulate with a simple async generator
        import asyncio
        from datetime import datetime
        
        while True:
            # Simulate check-in event every 10 seconds
            await asyncio.sleep(10)
            
            # Mock event data
            yield CheckInEvent(
                member=MemberType(
                    id="mock-id",
                    member_number="001",
                    name="Mock Member",
                    email="mock@example.com",
                    phone="123456789",
                    membership_type="premium",
                    status="active",
                    join_date=datetime.now().isoformat(),
                    created_at=datetime.now().isoformat()
                ),
                activity=ActivityType(
                    id="mock-activity",
                    name="Boxe",
                    color="#ef4444",
                    description="Treino de boxe",
                    is_active=True
                ),
                timestamp=datetime.now().isoformat(),
                event_type="check_in"
            )
    
    @strawberry.subscription
    async def dashboard_updates(self) -> DashboardStats:
        """Subscribe to real-time dashboard updates"""
        import asyncio
        from datetime import datetime
        
        while True:
            await asyncio.sleep(5)  # Update every 5 seconds
            
            # This would normally fetch real data
            yield DashboardStats(
                total_members=150,
                active_today=45,
                current_occupancy=23,
                revenue_today=1250.50,
                timestamp=datetime.now().isoformat()
            )

# Create the schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription
)