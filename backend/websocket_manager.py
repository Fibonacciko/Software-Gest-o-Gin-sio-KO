import socketio
import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

class GymWebSocketManager:
    """Advanced WebSocket manager for real-time gym operations"""
    
    def __init__(self):
        self.sio = socketio.AsyncServer(
            cors_allowed_origins="*",
            logger=True,
            engineio_logger=False
        )
        self.connected_clients = {}
        self.room_members = {}  # Track which users are in which rooms
        
        # Setup event handlers
        self.setup_events()
    
    def setup_events(self):
        """Setup WebSocket event handlers"""
        
        @self.sio.event
        async def connect(sid, environ, auth):
            """Handle client connection"""
            try:
                # Extract user info from auth token
                user_info = self.verify_auth_token(auth.get('token') if auth else None)
                if user_info:
                    self.connected_clients[sid] = {
                        'user_id': user_info['user_id'],
                        'role': user_info['role'],
                        'connected_at': datetime.now().isoformat()
                    }
                    await self.sio.emit('connection_success', {
                        'message': 'Connected to Ginásio KO real-time service',
                        'timestamp': datetime.now().isoformat()
                    }, room=sid)
                    
                    logger.info(f"✅ Client connected: {sid} (User: {user_info['user_id']})")
                else:
                    await self.sio.emit('connection_error', {
                        'message': 'Authentication required'
                    }, room=sid)
                    await self.sio.disconnect(sid)
                    
            except Exception as e:
                logger.error(f"Connection error for {sid}: {e}")
                await self.sio.disconnect(sid)
        
        @self.sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            if sid in self.connected_clients:
                user_info = self.connected_clients[sid]
                logger.info(f"👋 Client disconnected: {sid} (User: {user_info['user_id']})")
                del self.connected_clients[sid]
                
                # Remove from rooms
                for room, members in self.room_members.items():
                    if sid in members:
                        members.remove(sid)
        
        @self.sio.event
        async def join_dashboard(sid):
            """Join dashboard updates room"""
            await self.sio.enter_room(sid, 'dashboard')
            if 'dashboard' not in self.room_members:
                self.room_members['dashboard'] = []
            self.room_members['dashboard'].append(sid)
            
            # Send current stats immediately
            stats = await self.get_current_dashboard_stats()
            await self.sio.emit('dashboard_update', stats, room=sid)
            
        @self.sio.event
        async def join_attendance(sid):
            """Join attendance updates room"""
            await self.sio.enter_room(sid, 'attendance')
            if 'attendance' not in self.room_members:
                self.room_members['attendance'] = []
            self.room_members['attendance'].append(sid)
        
        @self.sio.event
        async def request_member_count(sid):
            """Get real-time member count"""
            count = await self.get_current_member_count()
            await self.sio.emit('member_count_update', {
                'count': count,
                'timestamp': datetime.now().isoformat()
            }, room=sid)
    
    def verify_auth_token(self, token: str) -> Optional[Dict]:
        """Verify JWT token and return user info"""
        try:
            if not token:
                return None
                
            # Mock verification for now - in production use proper JWT verification
            # This should match the JWT verification in your main FastAPI app
            return {
                'user_id': 'mock_user',
                'role': 'admin'
            }
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    async def get_current_dashboard_stats(self) -> Dict:
        """Get current dashboard statistics"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import os
            
            client = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = client[os.environ['DB_NAME']]
            
            # Get real-time stats
            total_members = await db.members.count_documents({"status": "active"})
            
            today = date.today().isoformat()
            attendance_today = await db.attendance.count_documents({"check_in_date": today})
            
            # Mock current occupancy (would be IoT sensors in production)
            current_occupancy = min(attendance_today, 50)  # Max 50 for demo
            
            # Today's revenue
            payments = await db.payments.find({
                "payment_date": today,
                "status": "paid"
            }).to_list(1000)
            revenue_today = sum(p["amount"] for p in payments)
            
            return {
                'total_members': total_members,
                'attendance_today': attendance_today,
                'current_occupancy': current_occupancy,
                'revenue_today': round(revenue_today, 2),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            return {
                'total_members': 0,
                'attendance_today': 0,
                'current_occupancy': 0,
                'revenue_today': 0.0,
                'timestamp': datetime.now().isoformat()
            }
    
    async def get_current_member_count(self) -> int:
        """Get current active member count"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import os
            
            client = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = client[os.environ['DB_NAME']]
            
            return await db.members.count_documents({"status": "active"})
        except Exception as e:
            logger.error(f"Error getting member count: {e}")
            return 0
    
    async def broadcast_check_in(self, member_data: Dict, activity_data: Dict):
        """Broadcast check-in event to all connected clients"""
        event_data = {
            'type': 'check_in',
            'member': member_data,
            'activity': activity_data,
            'timestamp': datetime.now().isoformat()
        }
        
        # Broadcast to attendance room
        await self.sio.emit('attendance_update', event_data, room='attendance')
        
        # Update dashboard stats
        stats = await self.get_current_dashboard_stats()
        await self.sio.emit('dashboard_update', stats, room='dashboard')
        
        logger.info(f"📢 Broadcasted check-in: {member_data.get('name')} -> {activity_data.get('name')}")
    
    async def broadcast_payment_received(self, payment_data: Dict, member_data: Dict):
        """Broadcast payment received event"""
        event_data = {
            'type': 'payment_received',
            'payment': payment_data,
            'member': member_data,
            'timestamp': datetime.now().isoformat()
        }
        
        # Update dashboard with new revenue
        stats = await self.get_current_dashboard_stats()
        await self.sio.emit('dashboard_update', stats, room='dashboard')
        await self.sio.emit('payment_update', event_data, room='dashboard')
        
        logger.info(f"💰 Broadcasted payment: €{payment_data.get('amount')} from {member_data.get('name')}")
    
    async def broadcast_member_joined(self, member_data: Dict):
        """Broadcast new member joined event"""
        event_data = {
            'type': 'member_joined',
            'member': member_data,
            'timestamp': datetime.now().isoformat()
        }
        
        # Update member count
        count = await self.get_current_member_count()
        await self.sio.emit('member_count_update', {'count': count, 'timestamp': datetime.now().isoformat()}, room='dashboard')
        await self.sio.emit('member_update', event_data, room='dashboard')
        
        logger.info(f"👥 Broadcasted new member: {member_data.get('name')}")
    
    async def broadcast_system_alert(self, alert_type: str, message: str, level: str = 'info'):
        """Broadcast system alerts to admin users"""
        event_data = {
            'type': alert_type,
            'message': message,
            'level': level,  # 'info', 'warning', 'error'
            'timestamp': datetime.now().isoformat()
        }
        
        # Send only to admin users
        for sid, client_info in self.connected_clients.items():
            if client_info.get('role') == 'admin':
                await self.sio.emit('system_alert', event_data, room=sid)
        
        logger.info(f"🚨 System alert broadcasted: {message}")
    
    async def start_background_tasks(self):
        """Start background tasks for periodic updates"""
        asyncio.create_task(self.dashboard_updater())
        asyncio.create_task(self.occupancy_simulator())
    
    async def dashboard_updater(self):
        """Periodic dashboard updates"""
        while True:
            try:
                await asyncio.sleep(30)  # Update every 30 seconds
                
                if 'dashboard' in self.room_members and self.room_members['dashboard']:
                    stats = await self.get_current_dashboard_stats()
                    await self.sio.emit('dashboard_update', stats, room='dashboard')
                    
            except Exception as e:
                logger.error(f"Dashboard updater error: {e}")
    
    async def occupancy_simulator(self):
        """Simulate real-time occupancy changes (would be IoT sensors in production)"""
        import random
        
        while True:
            try:
                await asyncio.sleep(45)  # Update every 45 seconds
                
                # Simulate occupancy changes based on time of day
                hour = datetime.now().hour
                base_occupancy = {
                    6: 15, 7: 25, 8: 35, 9: 20, 10: 15,
                    11: 10, 12: 12, 13: 8, 14: 10, 15: 15,
                    16: 20, 17: 35, 18: 45, 19: 40, 20: 30,
                    21: 20, 22: 10, 23: 5
                }.get(hour, 5)
                
                # Add some randomness
                current_occupancy = max(0, base_occupancy + random.randint(-5, 5))
                
                occupancy_data = {
                    'current_occupancy': current_occupancy,
                    'max_capacity': 80,
                    'utilization_percentage': round((current_occupancy / 80) * 100, 1),
                    'timestamp': datetime.now().isoformat()
                }
                
                await self.sio.emit('occupancy_update', occupancy_data, room='dashboard')
                
            except Exception as e:
                logger.error(f"Occupancy simulator error: {e}")

# Global WebSocket manager instance
ws_manager = GymWebSocketManager()

# Helper functions to integrate with existing FastAPI endpoints
async def notify_check_in(member_data: Dict, activity_data: Dict):
    """Helper to notify check-in from FastAPI endpoints"""
    await ws_manager.broadcast_check_in(member_data, activity_data)

async def notify_payment(payment_data: Dict, member_data: Dict):
    """Helper to notify payment from FastAPI endpoints"""
    await ws_manager.broadcast_payment_received(payment_data, member_data)

async def notify_new_member(member_data: Dict):
    """Helper to notify new member from FastAPI endpoints"""
    await ws_manager.broadcast_member_joined(member_data)

async def notify_system_alert(alert_type: str, message: str, level: str = 'info'):
    """Helper to send system alerts"""
    await ws_manager.broadcast_system_alert(alert_type, message, level)