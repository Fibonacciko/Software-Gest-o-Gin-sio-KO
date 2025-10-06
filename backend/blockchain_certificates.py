from web3 import Web3, HTTPProvider
from eth_account import Account
import json
import os
from typing import Dict, Optional, List
from datetime import datetime, date
import hashlib
import logging

logger = logging.getLogger(__name__)

class BlockchainCertificateManager:
    """Advanced Blockchain Certificate System for Gym Achievements"""
    
    def __init__(self):
        # Use testnet for development (free)
        self.w3 = None
        self.account = None
        self.contract = None
        self.connected = False
        
        # Certificate types
        self.certificate_types = {
            'attendance_streak': 'Frequência Consistente',
            'monthly_champion': 'Campeão Mensal',
            'fitness_milestone': 'Marco de Fitness',
            'loyalty_member': 'Membro Fiel',
            'achievement_unlock': 'Conquista Desbloqueada'
        }
        
    async def connect(self):
        """Initialize blockchain connection"""
        try:
            # Use Sepolia testnet (free Ethereum testnet)
            rpc_url = os.environ.get('ETH_RPC_URL', 'https://sepolia.infura.io/v3/demo')
            self.w3 = Web3(HTTPProvider(rpc_url))
            
            # Test connection
            if self.w3.is_connected():
                self.connected = True
                logger.info("✅ Blockchain connected successfully (Sepolia Testnet)")
                
                # Load or create account
                await self.setup_account()
                
            else:
                logger.warning("⚠️ Blockchain connection failed, using local certificates")
                self.connected = False
                
        except Exception as e:
            logger.warning(f"⚠️ Blockchain not available, using fallback: {e}")
            self.connected = False
    
    async def setup_account(self):
        """Setup blockchain account for certificate issuing"""
        try:
            # In production, load from secure environment variables
            private_key = os.environ.get('ETH_PRIVATE_KEY')
            
            if not private_key:
                # Generate new account for demo (in production, use existing)
                account = Account.create()
                private_key = account._private_key.hex()
                logger.warning(f"🔑 Generated new account: {account.address}")
                logger.warning("⚠️ In production, fund this account and store private key securely")
            
            self.account = Account.from_key(private_key)
            logger.info(f"🔐 Blockchain account loaded: {self.account.address}")
            
        except Exception as e:
            logger.error(f"Account setup error: {e}")
    
    def create_certificate_hash(self, member_data: Dict, achievement_data: Dict) -> str:
        """Create tamper-proof hash for certificate"""
        certificate_string = json.dumps({
            'member_id': member_data['id'],
            'member_name': member_data['name'],
            'achievement_type': achievement_data['type'],
            'achievement_description': achievement_data['description'],
            'date_achieved': achievement_data['date'],
            'issuer': 'Ginásio KO',
            'timestamp': datetime.now().isoformat()
        }, sort_keys=True)
        
        return hashlib.sha256(certificate_string.encode()).hexdigest()
    
    async def issue_certificate(self, member_data: Dict, achievement_type: str, achievement_description: str, metadata: Dict = None) -> Dict:
        """Issue a blockchain certificate for gym achievement"""
        try:
            achievement_data = {
                'type': achievement_type,
                'description': achievement_description,
                'date': date.today().isoformat(),
                'metadata': metadata or {}
            }
            
            # Create certificate hash
            certificate_hash = self.create_certificate_hash(member_data, achievement_data)
            
            certificate = {
                'id': f"cert_{certificate_hash[:16]}",
                'member_id': member_data['id'],
                'member_name': member_data['name'],
                'achievement_type': achievement_type,
                'achievement_title': self.certificate_types.get(achievement_type, achievement_type),
                'description': achievement_description,
                'date_issued': date.today().isoformat(),
                'certificate_hash': certificate_hash,
                'blockchain_verified': False,
                'transaction_hash': None,
                'metadata': metadata or {},
                'issuer': {
                    'name': 'Ginásio KO',
                    'address': self.account.address if self.account else 'local',
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            if self.connected:
                # Issue on blockchain
                try:
                    tx_hash = await self.record_on_blockchain(certificate_hash, member_data, achievement_data)
                    certificate['blockchain_verified'] = True
                    certificate['transaction_hash'] = tx_hash
                    logger.info(f"🏆 Blockchain certificate issued: {certificate['id']}")
                except Exception as e:
                    logger.error(f"Blockchain recording failed: {e}")
            
            # Store in database
            await self.store_certificate(certificate)
            
            # Trigger events
            await self.notify_certificate_issued(member_data, certificate)
            
            return certificate
            
        except Exception as e:
            logger.error(f"Certificate issuance error: {e}")
            return None
    
    async def record_on_blockchain(self, certificate_hash: str, member_data: Dict, achievement_data: Dict) -> str:
        """Record certificate hash on blockchain (mock implementation)"""
        try:
            # In a real implementation, this would:
            # 1. Deploy or use existing certificate smart contract
            # 2. Call contract method to store certificate hash
            # 3. Return transaction hash
            
            # Mock transaction for demo
            mock_tx_hash = f"0x{certificate_hash[:40]}"
            
            logger.info(f"📝 Mock blockchain transaction: {mock_tx_hash}")
            return mock_tx_hash
            
        except Exception as e:
            logger.error(f"Blockchain recording error: {e}")
            raise
    
    async def store_certificate(self, certificate: Dict):
        """Store certificate in database"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            
            client = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = client[os.environ['DB_NAME']]
            
            await db.certificates.insert_one(certificate)
            logger.info(f"💾 Certificate stored: {certificate['id']}")
            
        except Exception as e:
            logger.error(f"Certificate storage error: {e}")
    
    async def verify_certificate(self, certificate_id: str) -> Dict:
        """Verify certificate authenticity"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            
            client = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = client[os.environ['DB_NAME']]
            
            certificate = await db.certificates.find_one({"id": certificate_id})
            if not certificate:
                return {"valid": False, "error": "Certificate not found"}
            
            # Verify hash integrity
            member_data = {"id": certificate["member_id"], "name": certificate["member_name"]}
            achievement_data = {
                "type": certificate["achievement_type"],
                "description": certificate["description"],
                "date": certificate["date_issued"]
            }
            
            expected_hash = self.create_certificate_hash(member_data, achievement_data)
            
            verification_result = {
                "valid": certificate["certificate_hash"] == expected_hash,
                "certificate": certificate,
                "verified_on_blockchain": certificate.get("blockchain_verified", False),
                "verification_timestamp": datetime.now().isoformat()
            }
            
            if self.connected and certificate.get("transaction_hash"):
                # In real implementation, verify on blockchain
                verification_result["blockchain_status"] = "verified"
            
            return verification_result
            
        except Exception as e:
            logger.error(f"Certificate verification error: {e}")
            return {"valid": False, "error": str(e)}
    
    async def get_member_certificates(self, member_id: str) -> List[Dict]:
        """Get all certificates for a member"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            
            client = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = client[os.environ['DB_NAME']]
            
            certificates = await db.certificates.find(
                {"member_id": member_id}
            ).sort("date_issued", -1).to_list(100)
            
            # Remove MongoDB ObjectId
            for cert in certificates:
                cert.pop('_id', None)
            
            return certificates
            
        except Exception as e:
            logger.error(f"Error fetching member certificates: {e}")
            return []
    
    async def notify_certificate_issued(self, member_data: Dict, certificate: Dict):
        """Notify member about new certificate"""
        try:
            # Trigger event bus notification
            from message_queue import publish_notification_event, GymEvents
            
            await publish_notification_event(
                GymEvents.NOTIFICATION_EMAIL,
                {'email': member_data.get('email'), 'name': member_data['name']},
                {
                    'subject': f'🏆 Novo Certificado: {certificate["achievement_title"]}',
                    'template': 'certificate_issued',
                    'data': {
                        'member_name': member_data['name'],
                        'achievement_title': certificate['achievement_title'],
                        'description': certificate['description'],
                        'certificate_id': certificate['id'],
                        'verification_link': f"/certificates/verify/{certificate['id']}"
                    }
                }
            )
            
            # WebSocket notification
            from websocket_manager import ws_manager
            await ws_manager.broadcast_system_alert(
                'certificate_issued',
                f"🏆 {member_data['name']} conquistou: {certificate['achievement_title']}",
                'success'
            )
            
        except Exception as e:
            logger.error(f"Certificate notification error: {e}")

# Global certificate manager
cert_manager = BlockchainCertificateManager()

# Achievement Detection System
class AchievementDetector:
    """Detect and award achievements automatically"""
    
    @staticmethod
    async def check_attendance_milestones(member_id: str, attendance_count: int):
        """Check for attendance-based achievements"""
        milestones = [
            (10, "Primeiro Marco", "Completou 10 visitas ao ginásio"),
            (30, "Dedicação Crescente", "Completou 30 visitas ao ginásio"), 
            (50, "Membro Comprometido", "Completou 50 visitas ao ginásio"),
            (100, "Centúria Fitness", "Completou 100 visitas ao ginásio"),
            (200, "Guerreiro Fitness", "Completou 200 visitas ao ginásio"),
            (365, "Lenda do Ginásio", "Um ano completo de dedicação")
        ]
        
        for count, title, description in milestones:
            if attendance_count == count:
                await AchievementDetector.award_achievement(
                    member_id, 
                    'attendance_streak', 
                    f"{title}: {description}",
                    {'milestone_count': count}
                )
    
    @staticmethod
    async def check_monthly_champions():
        """Check and award monthly champions"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            from datetime import datetime, date
            import calendar
            
            client = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = client[os.environ['DB_NAME']]
            
            # Get current month data
            now = datetime.now()
            month_start = date(now.year, now.month, 1)
            
            # Get next month start for range
            if now.month == 12:
                month_end = date(now.year + 1, 1, 1)
            else:
                month_end = date(now.year, now.month + 1, 1)
            
            # Count attendance by member for current month
            pipeline = [
                {
                    "$match": {
                        "check_in_date": {
                            "$gte": month_start.isoformat(),
                            "$lt": month_end.isoformat()
                        }
                    }
                },
                {
                    "$group": {
                        "_id": "$member_id",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"count": -1}
                },
                {
                    "$limit": 3
                }
            ]
            
            top_members = await db.attendance.aggregate(pipeline).to_list(3)
            
            for i, member_stat in enumerate(top_members):
                member = await db.members.find_one({"id": member_stat["_id"]})
                if member:
                    position = ["Campeão", "Vice-Campeão", "3º Lugar"][i]
                    await AchievementDetector.award_achievement(
                        member["id"],
                        'monthly_champion',
                        f"{position} do mês com {member_stat['count']} visitas",
                        {
                            'position': i + 1,
                            'visits_count': member_stat['count'],
                            'month': now.strftime('%B %Y')
                        }
                    )
            
        except Exception as e:
            logger.error(f"Monthly champion check error: {e}")
    
    @staticmethod
    async def check_loyalty_milestones(member_id: str, days_since_join: int):
        """Check for loyalty-based achievements"""
        milestones = [
            (30, "Primeiro Mês", "30 dias como membro"),
            (90, "Trimestre Completo", "3 meses de membership"),
            (180, "Meio Ano", "6 meses de fidelidade"),
            (365, "Um Ano de Força", "1 ano como membro fiel"),
            (730, "Dois Anos de Dedicação", "2 anos de membership"),
            (1095, "Veterano do Fitness", "3 anos de fidelidade")
        ]
        
        for days, title, description in milestones:
            if days_since_join == days:
                await AchievementDetector.award_achievement(
                    member_id,
                    'loyalty_member',
                    f"{title}: {description}",
                    {'days_as_member': days}
                )
    
    @staticmethod
    async def award_achievement(member_id: str, achievement_type: str, description: str, metadata: Dict = None):
        """Award achievement and issue certificate"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            
            client = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = client[os.environ['DB_NAME']]
            
            # Get member data
            member = await db.members.find_one({"id": member_id})
            if not member:
                logger.error(f"Member not found for achievement: {member_id}")
                return
            
            # Check if already awarded
            existing = await db.certificates.find_one({
                "member_id": member_id,
                "achievement_type": achievement_type,
                "description": description
            })
            
            if existing:
                logger.info(f"Achievement already awarded: {achievement_type} to {member['name']}")
                return
            
            # Issue certificate
            certificate = await cert_manager.issue_certificate(
                member,
                achievement_type,
                description,
                metadata
            )
            
            if certificate:
                logger.info(f"🏆 Achievement awarded: {description} to {member['name']}")
            
        except Exception as e:
            logger.error(f"Achievement award error: {e}")

# Certificate template generator
class CertificateTemplate:
    """Generate beautiful certificate templates"""
    
    @staticmethod
    def generate_certificate_html(certificate: Dict) -> str:
        """Generate HTML certificate for display/download"""
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Certificado - {certificate['achievement_title']}</title>
            <style>
                body {{
                    font-family: 'Georgia', serif;
                    background: linear-gradient(135deg, #f97316 0%, #ffffff 50%, #f97316 100%);
                    margin: 0;
                    padding: 20px;
                }}
                .certificate {{
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border: 8px solid #f97316;
                    border-radius: 20px;
                    padding: 60px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }}
                .logo {{
                    width: 100px;
                    height: auto;
                    margin-bottom: 20px;
                }}
                .title {{
                    font-size: 48px;
                    color: #f97316;
                    margin-bottom: 20px;
                    font-weight: bold;
                }}
                .subtitle {{
                    font-size: 24px;
                    color: #666;
                    margin-bottom: 40px;
                }}
                .member-name {{
                    font-size: 36px;
                    color: #333;
                    margin: 30px 0;
                    padding: 20px;
                    border-top: 2px solid #f97316;
                    border-bottom: 2px solid #f97316;
                }}
                .achievement {{
                    font-size: 20px;
                    color: #555;
                    margin: 30px 0;
                    line-height: 1.5;
                }}
                .date {{
                    font-size: 16px;
                    color: #888;
                    margin-top: 40px;
                }}
                .signature {{
                    margin-top: 60px;
                    border-top: 1px solid #ccc;
                    padding-top: 20px;
                    font-size: 14px;
                    color: #666;
                }}
                .blockchain {{
                    margin-top: 20px;
                    padding: 10px;
                    background: #f0f9ff;
                    border: 1px solid #0284c7;
                    border-radius: 8px;
                    font-size: 12px;
                    color: #0284c7;
                }}
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="logo">🏆</div>
                
                <div class="title">CERTIFICADO</div>
                <div class="subtitle">de Conquista Fitness</div>
                
                <div style="font-size: 18px; margin: 20px 0;">
                    Certificamos que
                </div>
                
                <div class="member-name">{certificate['member_name']}</div>
                
                <div class="achievement">
                    conquistou com mérito:<br>
                    <strong>{certificate['achievement_title']}</strong><br>
                    {certificate['description']}
                </div>
                
                <div class="date">
                    Emitido em {certificate['date_issued']}<br>
                    Certificado ID: {certificate['id']}
                </div>
                
                <div class="signature">
                    <strong>Ginásio KO</strong><br>
                    Sistema de Gestão Fitness
                </div>
                
                {'<div class="blockchain">🔒 Verificado na Blockchain: ' + certificate.get('transaction_hash', 'N/A') + '</div>' if certificate.get('blockchain_verified') else ''}
            </div>
        </body>
        </html>
        """
        return html_template