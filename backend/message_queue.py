import aio_pika
import asyncio
import json
import os
from typing import Dict, Any, Callable, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EventBusManager:
    """Advanced Event-Driven Architecture with RabbitMQ"""
    
    def __init__(self):
        self.connection = None
        self.channel = None
        self.exchanges = {}
        self.queues = {}
        self.consumers = {}
        self.connected = False
        
    async def connect(self):
        """Initialize RabbitMQ connection"""
        try:
            # Try to connect to RabbitMQ
            rabbitmq_url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
            self.connection = await aio_pika.connect_robust(rabbitmq_url)
            self.channel = await self.connection.channel()
            
            # Set quality of service
            await self.channel.set_qos(prefetch_count=100)
            
            self.connected = True
            logger.info("✅ RabbitMQ event bus connected successfully")
            
            # Create exchanges and queues
            await self.setup_infrastructure()
            
        except Exception as e:
            logger.warning(f"⚠️ RabbitMQ not available, using fallback: {e}")
            self.connected = False
    
    async def setup_infrastructure(self):
        """Setup exchanges and queues for different event types"""
        if not self.connected:
            return
            
        try:
            # Main gym events exchange
            self.exchanges['gym.events'] = await self.channel.declare_exchange(
                'gym.events',
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            
            # Notification events exchange
            self.exchanges['gym.notifications'] = await self.channel.declare_exchange(
                'gym.notifications',
                aio_pika.ExchangeType.FANOUT,
                durable=True
            )
            
            # Analytics events exchange
            self.exchanges['gym.analytics'] = await self.channel.declare_exchange(
                'gym.analytics',
                aio_pika.ExchangeType.DIRECT,
                durable=True
            )
            
            # Create queues for different services
            queue_configs = [
                ('gym.members.events', 'gym.events', 'member.*'),
                ('gym.attendance.events', 'gym.events', 'attendance.*'),
                ('gym.payments.events', 'gym.events', 'payment.*'),
                ('gym.notifications.queue', 'gym.notifications', ''),
                ('gym.analytics.queue', 'gym.analytics', 'analytics')
            ]
            
            for queue_name, exchange_name, routing_key in queue_configs:
                queue = await self.channel.declare_queue(
                    queue_name,
                    durable=True,
                    arguments={'x-message-ttl': 86400000}  # 24 hours TTL
                )
                
                if exchange_name == 'gym.notifications':
                    await queue.bind(self.exchanges[exchange_name])
                else:
                    await queue.bind(self.exchanges[exchange_name], routing_key)
                
                self.queues[queue_name] = queue
            
            logger.info("🏗️ Message queue infrastructure setup complete")
            
        except Exception as e:
            logger.error(f"Queue setup error: {e}")
    
    async def publish_event(self, event_type: str, data: Dict[str, Any], routing_key: str = ''):
        """Publish event to message queue"""
        if not self.connected:
            logger.debug(f"Queue not connected, skipping event: {event_type}")
            return
            
        try:
            event_data = {
                'event_type': event_type,
                'data': data,
                'timestamp': datetime.now().isoformat(),
                'event_id': f"{event_type}_{datetime.now().timestamp()}"
            }
            
            message = aio_pika.Message(
                json.dumps(event_data, default=str).encode(),
                content_type='application/json',
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            )
            
            # Determine which exchange to use
            if event_type.startswith('notification'):
                exchange = self.exchanges['gym.notifications']
                await exchange.publish(message, routing_key='')
            elif event_type.startswith('analytics'):
                exchange = self.exchanges['gym.analytics']
                await exchange.publish(message, routing_key='analytics')
            else:
                exchange = self.exchanges['gym.events']
                await exchange.publish(message, routing_key=routing_key)
            
            logger.debug(f"📤 Published event: {event_type} -> {routing_key}")
            
        except Exception as e:
            logger.error(f"Event publishing error: {e}")
    
    async def subscribe_to_events(self, queue_name: str, handler: Callable):
        """Subscribe to events from a specific queue"""
        if not self.connected or queue_name not in self.queues:
            logger.warning(f"Cannot subscribe to {queue_name}: queue not available")
            return
            
        try:
            queue = self.queues[queue_name]
            
            async def message_handler(message: aio_pika.IncomingMessage):
                async with message.process():
                    try:
                        event_data = json.loads(message.body.decode())
                        await handler(event_data)
                    except Exception as e:
                        logger.error(f"Event handler error: {e}")
            
            # Start consuming
            await queue.consume(message_handler)
            self.consumers[queue_name] = message_handler
            
            logger.info(f"🎧 Subscribed to events: {queue_name}")
            
        except Exception as e:
            logger.error(f"Subscription error for {queue_name}: {e}")

# Global event bus instance
event_bus = EventBusManager()

# Event Types and Publishers
class GymEvents:
    """Standard gym events for the event bus"""
    
    # Member Events
    MEMBER_CREATED = "member.created"
    MEMBER_UPDATED = "member.updated" 
    MEMBER_DELETED = "member.deleted"
    MEMBER_STATUS_CHANGED = "member.status_changed"
    
    # Attendance Events
    MEMBER_CHECKED_IN = "attendance.checked_in"
    MEMBER_CHECKED_OUT = "attendance.checked_out"
    ATTENDANCE_MILESTONE = "attendance.milestone"
    
    # Payment Events
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_FAILED = "payment.failed"
    SUBSCRIPTION_RENEWED = "payment.subscription_renewed"
    SUBSCRIPTION_EXPIRED = "payment.subscription_expired"
    
    # Notification Events
    NOTIFICATION_EMAIL = "notification.email"
    NOTIFICATION_SMS = "notification.sms"
    NOTIFICATION_PUSH = "notification.push"
    
    # Analytics Events
    ANALYTICS_USER_ACTION = "analytics.user_action"
    ANALYTICS_REVENUE = "analytics.revenue"
    ANALYTICS_PERFORMANCE = "analytics.performance"

# Event Publishers
async def publish_member_event(event_type: str, member_data: Dict, additional_data: Dict = None):
    """Publish member-related event"""
    data = {
        'member': member_data,
        **(additional_data or {})
    }
    await event_bus.publish_event(event_type, data, f"member.{event_type.split('.')[-1]}")

async def publish_attendance_event(event_type: str, member_data: Dict, activity_data: Dict, attendance_data: Dict):
    """Publish attendance-related event"""
    data = {
        'member': member_data,
        'activity': activity_data,
        'attendance': attendance_data
    }
    await event_bus.publish_event(event_type, data, f"attendance.{event_type.split('.')[-1]}")

async def publish_payment_event(event_type: str, payment_data: Dict, member_data: Dict):
    """Publish payment-related event"""
    data = {
        'payment': payment_data,
        'member': member_data
    }
    await event_bus.publish_event(event_type, data, f"payment.{event_type.split('.')[-1]}")

async def publish_notification_event(event_type: str, recipient: Dict, message_data: Dict):
    """Publish notification event"""
    data = {
        'recipient': recipient,
        'message': message_data
    }
    await event_bus.publish_event(event_type, data)

async def publish_analytics_event(event_type: str, analytics_data: Dict):
    """Publish analytics event"""
    await event_bus.publish_event(event_type, analytics_data, 'analytics')

# Event Handlers
class EventHandlers:
    """Event handlers for different types of events"""
    
    @staticmethod
    async def handle_member_events(event_data: Dict):
        """Handle member-related events"""
        event_type = event_data['event_type']
        member = event_data['data']['member']
        
        if event_type == GymEvents.MEMBER_CREATED:
            # Send welcome notification
            await publish_notification_event(
                GymEvents.NOTIFICATION_EMAIL,
                {'email': member['email'], 'name': member['name']},
                {
                    'subject': 'Bem-vindo ao Ginásio KO!',
                    'template': 'welcome',
                    'data': {'member_name': member['name'], 'member_number': member['member_number']}
                }
            )
            
            # Update analytics
            await publish_analytics_event(GymEvents.ANALYTICS_USER_ACTION, {
                'action': 'member_registration',
                'member_id': member['id'],
                'timestamp': datetime.now().isoformat()
            })
    
    @staticmethod
    async def handle_attendance_events(event_data: Dict):
        """Handle attendance-related events"""
        event_type = event_data['event_type']
        member = event_data['data']['member']
        activity = event_data['data']['activity']
        
        if event_type == GymEvents.MEMBER_CHECKED_IN:
            # Notify via WebSocket
            from websocket_manager import notify_check_in
            await notify_check_in(member, activity)
            
            # Check for milestones (e.g., 100th visit)
            # This would require counting attendance records
            
            # Update analytics
            await publish_analytics_event(GymEvents.ANALYTICS_USER_ACTION, {
                'action': 'check_in',
                'member_id': member['id'],
                'activity_id': activity['id'],
                'timestamp': datetime.now().isoformat()
            })
    
    @staticmethod
    async def handle_payment_events(event_data: Dict):
        """Handle payment-related events"""
        event_type = event_data['event_type']
        payment = event_data['data']['payment']
        member = event_data['data']['member']
        
        if event_type == GymEvents.PAYMENT_RECEIVED:
            # Send receipt
            await publish_notification_event(
                GymEvents.NOTIFICATION_EMAIL,
                {'email': member['email'], 'name': member['name']},
                {
                    'subject': 'Recibo de Pagamento - Ginásio KO',
                    'template': 'payment_receipt',
                    'data': {
                        'member_name': member['name'],
                        'amount': payment['amount'],
                        'payment_date': payment['payment_date']
                    }
                }
            )
            
            # Notify via WebSocket
            from websocket_manager import notify_payment
            await notify_payment(payment, member)
            
            # Update analytics
            await publish_analytics_event(GymEvents.ANALYTICS_REVENUE, {
                'amount': payment['amount'],
                'member_id': member['id'],
                'payment_method': payment['payment_method'],
                'timestamp': datetime.now().isoformat()
            })
    
    @staticmethod
    async def handle_notification_events(event_data: Dict):
        """Handle notification dispatch"""
        event_type = event_data['event_type']
        recipient = event_data['data']['recipient']
        message = event_data['data']['message']
        
        # This would integrate with actual email/SMS services
        logger.info(f"📧 Would send {event_type} to {recipient.get('email', recipient.get('phone'))}: {message.get('subject', message.get('text'))}")
    
    @staticmethod
    async def handle_analytics_events(event_data: Dict):
        """Handle analytics data collection"""
        event_type = event_data['event_type']
        analytics_data = event_data['data']
        
        # Store in analytics database or send to analytics service
        logger.info(f"📊 Analytics event: {event_type} -> {analytics_data}")

# Setup event subscriptions
async def setup_event_subscriptions():
    """Setup all event subscriptions"""
    if not event_bus.connected:
        return
        
    try:
        # Subscribe to different event queues
        await event_bus.subscribe_to_events('gym.members.events', EventHandlers.handle_member_events)
        await event_bus.subscribe_to_events('gym.attendance.events', EventHandlers.handle_attendance_events)
        await event_bus.subscribe_to_events('gym.payments.events', EventHandlers.handle_payment_events)
        await event_bus.subscribe_to_events('gym.notifications.queue', EventHandlers.handle_notification_events)
        await event_bus.subscribe_to_events('gym.analytics.queue', EventHandlers.handle_analytics_events)
        
        logger.info("🎯 All event subscriptions setup complete")
        
    except Exception as e:
        logger.error(f"Event subscription setup error: {e}")

# Background task scheduler using message queues
class TaskScheduler:
    """Background task scheduler using message queues"""
    
    @staticmethod
    async def schedule_membership_expiry_check():
        """Schedule daily check for expiring memberships"""
        await event_bus.publish_event(
            'task.scheduled',
            {
                'task_type': 'membership_expiry_check',
                'schedule': 'daily',
                'time': '09:00'
            },
            'task.scheduled'
        )
    
    @staticmethod
    async def schedule_payment_reminders():
        """Schedule payment reminder notifications"""
        await event_bus.publish_event(
            'task.scheduled',
            {
                'task_type': 'payment_reminders',
                'schedule': 'weekly',
                'day': 'friday'
            },
            'task.scheduled'
        )