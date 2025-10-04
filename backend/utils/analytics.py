"""
KO Gym - Sistema de Analytics Premium
Business Intelligence e métricas avançadas
"""
from datetime import datetime, timedelta, timezone, date
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import asyncio
from .logger import gym_logger
from .cache import gym_cache, BusinessCache

def serialize_mongo_data(data):
    """Convert MongoDB ObjectIds and dates to strings for JSON serialization"""
    if isinstance(data, dict):
        return {k: serialize_mongo_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [serialize_mongo_data(item) for item in data]
    elif hasattr(data, '__class__') and data.__class__.__name__ == 'ObjectId':
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, date):
        return data.isoformat()
    else:
        return data

@dataclass
class BusinessMetric:
    """Classe para métricas de negócio"""
    name: str
    value: Any
    timestamp: datetime
    metadata: Dict[str, Any] = None

@dataclass
class MemberAnalytics:
    """Analytics de membro individual"""
    member_id: str
    total_workouts: int
    avg_workouts_per_week: float
    most_common_activity: str
    streak_current: int
    streak_longest: int
    first_workout: datetime
    last_workout: datetime
    retention_risk: str  # low, medium, high
    lifetime_value: float

@dataclass
class GymAnalytics:
    """Analytics gerais do ginásio"""
    total_members: int
    active_members: int
    new_members_this_month: int
    churn_rate: float
    retention_rate: float
    avg_monthly_revenue: float
    peak_hours: List[int]
    most_popular_activities: List[Dict[str, Any]]
    capacity_utilization: float

class AnalyticsEngine:
    """Motor de analytics premium para o KO Gym"""
    
    def __init__(self, db):
        self.db = db
        
    async def get_dashboard_analytics(self, user_role: str = "admin") -> Dict[str, Any]:
        """Analytics completas para o dashboard"""
        
        # Verificar cache primeiro
        cache_key = f"dashboard_analytics:{user_role}"
        cached = BusinessCache.get_analytics_data(cache_key)
        if cached:
            return cached
        
        gym_logger.info("Generating dashboard analytics", user_role=user_role)
        
        # Calcular métricas em paralelo
        tasks = [
            self._get_member_metrics(),
            self._get_attendance_metrics(),
            self._get_financial_metrics() if user_role == "admin" else self._get_basic_financial_metrics(),
            self._get_activity_metrics(),
            self._get_growth_metrics(),
        ]
        
        results = await asyncio.gather(*tasks)
        
        analytics = {
            "members": results[0],
            "attendance": results[1], 
            "financial": results[2],
            "activities": results[3],
            "growth": results[4],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "user_role": user_role
        }
        
        # Cachear resultado por 5 minutos
        BusinessCache.cache_analytics_data(cache_key, analytics, 300)
        
        gym_logger.business_metric("dashboard_analytics_generated", True, 
                                 user_role=user_role, metrics_count=len(analytics))
        
        return analytics
    
    async def _get_member_metrics(self) -> Dict[str, Any]:
        """Métricas de membros"""
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        
        # Contagens básicas
        total_members = await self.db.members.count_documents({})
        active_members = await self.db.members.count_documents({"status": "active"})
        new_members = await self.db.members.count_documents({
            "join_date": {"$gte": thirty_days_ago}
        })
        
        # Membros por tipo
        membership_breakdown = await self.db.members.aggregate([
            {"$group": {
                "_id": "$membership_type",
                "count": {"$sum": 1}
            }}
        ]).to_list(None)
        
        # Taxa de crescimento
        sixty_days_ago = now - timedelta(days=60)
        members_last_month = await self.db.members.count_documents({
            "join_date": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}
        })
        
        growth_rate = 0
        if members_last_month > 0:
            growth_rate = ((new_members - members_last_month) / members_last_month) * 100
        
        return serialize_mongo_data({
            "total": total_members,
            "active": active_members,
            "inactive": total_members - active_members,
            "new_this_month": new_members,
            "growth_rate": round(growth_rate, 2),
            "membership_breakdown": {item["_id"]: item["count"] for item in membership_breakdown}
        })
    
    async def _get_attendance_metrics(self) -> Dict[str, Any]:
        """Métricas de frequência"""
        now = datetime.now(timezone.utc)
        today = now.date()
        thirty_days_ago = now - timedelta(days=30)
        
        # Presenças hoje
        today_attendance = await self.db.attendance.count_documents({
            "check_in_date": today
        })
        
        # Presenças nos últimos 30 dias
        monthly_attendance = await self.db.attendance.count_documents({
            "check_in_time": {"$gte": thirty_days_ago}
        })
        
        # Média diária
        avg_daily = monthly_attendance / 30
        
        # Horários de pico (últimos 7 dias)
        seven_days_ago = now - timedelta(days=7)
        hourly_distribution = await self.db.attendance.aggregate([
            {
                "$match": {
                    "check_in_time": {"$gte": seven_days_ago}
                }
            },
            {
                "$group": {
                    "_id": {"$hour": "$check_in_time"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}}
        ]).to_list(None)
        
        peak_hours = [item["_id"] for item in hourly_distribution[:3]]
        
        # Frequência por dia da semana
        weekly_distribution = await self.db.attendance.aggregate([
            {
                "$match": {
                    "check_in_time": {"$gte": thirty_days_ago}
                }
            },
            {
                "$group": {
                    "_id": {"$dayOfWeek": "$check_in_time"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]).to_list(None)
        
        return serialize_mongo_data({
            "today": today_attendance,
            "monthly_total": monthly_attendance,
            "daily_average": round(avg_daily, 1),
            "peak_hours": peak_hours,
            "weekly_distribution": {item["_id"]: item["count"] for item in weekly_distribution},
            "capacity_utilization": min(round((avg_daily / 100) * 100, 1), 100)  # Assumindo capacidade de 100
        })
    
    async def _get_financial_metrics(self) -> Dict[str, Any]:
        """Métricas financeiras completas (admin only)"""
        now = datetime.now(timezone.utc)
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        
        # Receita do mês atual - usar payment_date como string ISO
        current_month_date_str = current_month_start.date().isoformat()
        current_revenue = await self.db.payments.aggregate([
            {
                "$match": {
                    "payment_date": {"$gte": current_month_date_str},
                    "status": "paid"
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(None)
        
        current_revenue = current_revenue[0]["total"] if current_revenue else 0
        
        # Receita do mês passado
        last_revenue = await self.db.payments.aggregate([
            {
                "$match": {
                    "payment_date": {"$gte": last_month_start.date().isoformat(), "$lt": current_month_start.date().isoformat()},
                    "status": "paid"
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(None)
        
        last_revenue = last_revenue[0]["total"] if last_revenue else 0
        
        # Growth rate
        revenue_growth = 0
        if last_revenue > 0:
            revenue_growth = ((current_revenue - last_revenue) / last_revenue) * 100
        
        # Receita por método de pagamento
        payment_methods = await self.db.payments.aggregate([
            {
                "$match": {
                    "payment_date": {"$gte": current_month_start.date().isoformat()},
                    "status": "paid"
                }
            },
            {
                "$group": {
                    "_id": "$payment_method",
                    "total": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }
            }
        ]).to_list(None)
        
        # Revenue per member
        active_members = await self.db.members.count_documents({"status": "active"})
        revenue_per_member = current_revenue / max(active_members, 1)
        
        return serialize_mongo_data({
            "current_month": round(current_revenue, 2),
            "last_month": round(last_revenue, 2),
            "growth_rate": round(revenue_growth, 2),
            "revenue_per_member": round(revenue_per_member, 2),
            "payment_methods": {item["_id"]: {"total": round(item["total"], 2), "count": item["count"]} 
                             for item in payment_methods}
        })
    
    async def _get_basic_financial_metrics(self) -> Dict[str, Any]:
        """Métricas financeiras básicas (staff)"""
        now = datetime.now(timezone.utc)
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Apenas total do mês (sem detalhes)
        current_revenue = await self.db.payments.aggregate([
            {
                "$match": {
                    "payment_date": {"$gte": current_month_start.date().isoformat()},
                    "status": "paid"
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(None)
        
        current_revenue = current_revenue[0]["total"] if current_revenue else 0
        
        return serialize_mongo_data({
            "current_month": round(current_revenue, 2),
            "access_level": "limited"
        })
    
    async def _get_activity_metrics(self) -> Dict[str, Any]:
        """Métricas de atividades/modalidades"""
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        
        # Atividades mais populares
        popular_activities = await self.db.attendance.aggregate([
            {
                "$match": {
                    "check_in_time": {"$gte": thirty_days_ago},
                    "activity_id": {"$exists": True}
                }
            },
            {
                "$lookup": {
                    "from": "activities",
                    "localField": "activity_id",
                    "foreignField": "id",
                    "as": "activity"
                }
            },
            {"$unwind": "$activity"},
            {
                "$group": {
                    "_id": "$activity.name",
                    "count": {"$sum": 1},
                    "color": {"$first": "$activity.color"}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]).to_list(None)
        
        # Distribuição por atividade
        total_sessions = sum(item["count"] for item in popular_activities)
        
        return serialize_mongo_data({
            "most_popular": popular_activities[:5],
            "total_sessions": total_sessions,
            "distribution": {
                item["_id"]: {
                    "count": item["count"],
                    "percentage": round((item["count"] / max(total_sessions, 1)) * 100, 1),
                    "color": item.get("color", "#6B7280")
                } for item in popular_activities
            }
        })
    
    async def _get_growth_metrics(self) -> Dict[str, Any]:
        """Métricas de crescimento e tendências"""
        now = datetime.now(timezone.utc)
        
        # Crescimento de membros nos últimos 6 meses
        monthly_growth = []
        for i in range(6):
            month_start = (now - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            new_members = await self.db.members.count_documents({
                "join_date": {"$gte": month_start.date(), "$lte": month_end.date()}
            })
            
            monthly_growth.append({
                "month": month_start.strftime("%B %Y"),
                "new_members": new_members
            })
        
        monthly_growth.reverse()  # Ordem cronológica
        
        # Previsão simples para próximo mês (média dos últimos 3 meses)
        recent_avg = sum(item["new_members"] for item in monthly_growth[-3:]) / 3
        
        return serialize_mongo_data({
            "monthly_new_members": monthly_growth,
            "predicted_next_month": round(recent_avg),
            "trend": "growing" if monthly_growth[-1]["new_members"] > monthly_growth[-2]["new_members"] else "stable"
        })
    
    async def get_member_analytics(self, member_id: str) -> MemberAnalytics:
        """Analytics detalhadas de um membro específico"""
        
        # Cache individual
        cache_key = f"member_analytics:{member_id}"
        cached = gym_cache.get(cache_key)
        if cached:
            return MemberAnalytics(**cached)
        
        # Dados do membro
        member = await self.db.members.find_one({"id": member_id})
        if not member:
            raise ValueError(f"Member {member_id} not found")
        
        # Treinos
        workouts = await self.db.attendance.find(
            {"member_id": member_id}
        ).sort("check_in_time", 1).to_list(None)
        
        total_workouts = len(workouts)
        
        if total_workouts == 0:
            return MemberAnalytics(
                member_id=member_id,
                total_workouts=0,
                avg_workouts_per_week=0,
                most_common_activity="Nenhuma",
                streak_current=0,
                streak_longest=0,
                first_workout=None,
                last_workout=None,
                retention_risk="high",
                lifetime_value=0
            )
        
        # Datas
        first_workout = workouts[0]["check_in_time"]
        last_workout = workouts[-1]["check_in_time"]
        
        # Média semanal
        weeks_since_first = max((datetime.now(timezone.utc) - first_workout).days / 7, 1)
        avg_per_week = total_workouts / weeks_since_first
        
        # Atividade mais comum
        activity_counts = {}
        for workout in workouts:
            activity_id = workout.get("activity_id", "unknown")
            activity_counts[activity_id] = activity_counts.get(activity_id, 0) + 1
        
        most_common_activity_id = max(activity_counts, key=activity_counts.get) if activity_counts else "unknown"
        most_common_activity = "Desconhecida"
        
        if most_common_activity_id != "unknown":
            activity = await self.db.activities.find_one({"id": most_common_activity_id})
            if activity:
                most_common_activity = activity["name"]
        
        # Streaks
        streak_current, streak_longest = self._calculate_streaks(workouts)
        
        # Risco de retenção
        days_since_last = (datetime.now(timezone.utc) - last_workout).days
        if days_since_last > 14:
            retention_risk = "high"
        elif days_since_last > 7:
            retention_risk = "medium"
        else:
            retention_risk = "low"
        
        # Lifetime value (estimativa baseada em tempo de membro)
        join_date = member["join_date"]
        if isinstance(join_date, str):
            join_date = datetime.fromisoformat(join_date).date()
        
        months_member = max((datetime.now().date() - join_date).days / 30, 1)
        estimated_monthly_value = 50  # Valor estimado baseado no membership type
        lifetime_value = months_member * estimated_monthly_value
        
        analytics = MemberAnalytics(
            member_id=member_id,
            total_workouts=total_workouts,
            avg_workouts_per_week=round(avg_per_week, 1),
            most_common_activity=most_common_activity,
            streak_current=streak_current,
            streak_longest=streak_longest,
            first_workout=first_workout,
            last_workout=last_workout,
            retention_risk=retention_risk,
            lifetime_value=round(lifetime_value, 2)
        )
        
        # Cache por 1 hora
        gym_cache.set(cache_key, analytics.__dict__, 3600)
        
        return analytics
    
    def _calculate_streaks(self, workouts: List[Dict]) -> Tuple[int, int]:
        """Calcula streak atual e maior streak"""
        if not workouts:
            return 0, 0
        
        # Converter para datas únicas
        workout_dates = list(set(
            workout["check_in_time"].date() for workout in workouts
        ))
        workout_dates.sort()
        
        current_streak = 0
        longest_streak = 0
        temp_streak = 1
        
        today = datetime.now().date()
        
        # Verificar streak atual (deve incluir ontem ou hoje)
        if workout_dates and (workout_dates[-1] == today or 
                            workout_dates[-1] == today - timedelta(days=1)):
            current_streak = 1
            
            # Contar dias consecutivos para trás
            for i in range(len(workout_dates) - 2, -1, -1):
                if (workout_dates[i+1] - workout_dates[i]).days == 1:
                    current_streak += 1
                else:
                    break
        
        # Calcular maior streak
        for i in range(1, len(workout_dates)):
            if (workout_dates[i] - workout_dates[i-1]).days == 1:
                temp_streak += 1
                longest_streak = max(longest_streak, temp_streak)
            else:
                temp_streak = 1
        
        longest_streak = max(longest_streak, temp_streak)
        
        return current_streak, longest_streak
    
    async def get_churn_prediction(self) -> Dict[str, Any]:
        """Análise de previsão de churn"""
        # Membros em risco (sem check-in há mais de 14 dias)
        fourteen_days_ago = datetime.now(timezone.utc) - timedelta(days=14)
        
        at_risk_members = await self.db.members.aggregate([
            {
                "$lookup": {
                    "from": "attendance",
                    "localField": "id",
                    "foreignField": "member_id",
                    "as": "recent_attendance",
                    "pipeline": [
                        {"$match": {"check_in_time": {"$gte": fourteen_days_ago}}},
                        {"$limit": 1}
                    ]
                }
            },
            {
                "$match": {
                    "status": "active",
                    "recent_attendance": {"$size": 0}
                }
            },
            {
                "$project": {
                    "id": 1,
                    "name": 1,
                    "membership_type": 1,
                    "join_date": 1
                }
            }
        ]).to_list(None)
        
        return serialize_mongo_data({
            "at_risk_count": len(at_risk_members),
            "at_risk_members": at_risk_members[:10],  # Top 10
            "churn_risk_percentage": round(len(at_risk_members) / max(1, await self.db.members.count_documents({"status": "active"})) * 100, 1)
        })

# Instância global do analytics engine
async def get_analytics_engine(db):
    """Factory function para o analytics engine"""
    return AnalyticsEngine(db)