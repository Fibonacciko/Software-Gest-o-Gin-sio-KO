"""
KO Gym - Sistema de Rate Limiting Premium
Proteção contra ataques e controle de tráfego
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
from typing import Dict, Any
import time
from datetime import datetime, timezone
from .logger import gym_logger

class GymRateLimiter:
    """Sistema de Rate Limiting inteligente para o KO Gym"""
    
    def __init__(self):
        # Limiter principal usando IP
        self.limiter = Limiter(key_func=get_remote_address)
        
        # Cache para tracking de usuários suspeitos
        self.suspicious_ips = {}
        self.blocked_ips = {}
        
        # Configurações
        self.max_failed_attempts = 5
        self.block_duration = 900  # 15 minutos
        
    def get_client_ip(self, request: Request) -> str:
        """Extrai IP do cliente considerando proxies"""
        # Headers comuns de proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback para IP direto
        return request.client.host if request.client else "unknown"
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Verifica se IP está bloqueado"""
        if ip in self.blocked_ips:
            block_time = self.blocked_ips[ip]
            if time.time() - block_time < self.block_duration:
                return True
            else:
                # Remover bloqueio expirado
                del self.blocked_ips[ip]
                if ip in self.suspicious_ips:
                    del self.suspicious_ips[ip]
        return False
    
    def record_failed_attempt(self, ip: str, endpoint: str = ""):
        """Registra tentativa de acesso falhada"""
        current_time = time.time()
        
        if ip not in self.suspicious_ips:
            self.suspicious_ips[ip] = []
        
        # Adicionar tentativa falhada
        self.suspicious_ips[ip].append({
            "timestamp": current_time,
            "endpoint": endpoint
        })
        
        # Remover tentativas antigas (últimas 24h)
        day_ago = current_time - 86400
        self.suspicious_ips[ip] = [
            attempt for attempt in self.suspicious_ips[ip] 
            if attempt["timestamp"] > day_ago
        ]
        
        # Verificar se deve bloquear
        if len(self.suspicious_ips[ip]) >= self.max_failed_attempts:
            self.blocked_ips[ip] = current_time
            
            gym_logger.security_event(
                event_type="ip_blocked",
                ip_address=ip,
                failed_attempts=len(self.suspicious_ips[ip]),
                endpoints_attempted=[a["endpoint"] for a in self.suspicious_ips[ip]]
            )
    
    def record_successful_attempt(self, ip: str):
        """Registra tentativa bem-sucedida (limpa suspeitas)"""
        if ip in self.suspicious_ips:
            del self.suspicious_ips[ip]
    
    async def check_request_limits(self, request: Request) -> bool:
        """Verifica limites de request"""
        ip = self.get_client_ip(request)
        
        # Verificar se IP está bloqueado
        if self.is_ip_blocked(ip):
            gym_logger.security_event(
                event_type="blocked_ip_attempt",
                ip_address=ip,
                endpoint=str(request.url.path)
            )
            raise HTTPException(
                status_code=429,
                detail="IP temporariamente bloqueado devido a atividade suspeita"
            )
        
        return True

# Instância global do rate limiter
gym_rate_limiter = GymRateLimiter()

# Configurações de limite por endpoint
RATE_LIMITS = {
    # Autenticação - mais restritivo
    "auth": "10/minute",
    
    # APIs gerais
    "api": "100/minute", 
    
    # Dashboard (queries pesadas)
    "dashboard": "30/minute",
    
    # Operações de escrita
    "write": "50/minute",
    
    # Uploads
    "upload": "20/minute"
}

def create_rate_limit_handler():
    """Cria handler personalizado para rate limit exceeded"""
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        ip = gym_rate_limiter.get_client_ip(request)
        endpoint = str(request.url.path)
        
        # Log do evento
        gym_logger.security_event(
            event_type="rate_limit_exceeded",
            ip_address=ip,
            endpoint=endpoint,
            limit=str(exc.detail)
        )
        
        # Registrar como tentativa suspeita se muitas rate limits
        gym_rate_limiter.record_failed_attempt(ip, endpoint)
        
        return HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": "Muitas requests. Tente novamente em alguns minutos.",
                "retry_after": 60
            }
        )
    
    return rate_limit_handler

# Middleware para checking automático
class RateLimitMiddleware:
    """Middleware para rate limiting automático"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Criar request fake para verificar IP
            from fastapi import Request
            request = Request(scope, receive)
            
            try:
                await gym_rate_limiter.check_request_limits(request)
            except HTTPException as e:
                # Enviar resposta de erro
                response = {
                    "type": "http.response.start",
                    "status": e.status_code,
                    "headers": [[b"content-type", b"application/json"]]
                }
                await send(response)
                
                body = {
                    "type": "http.response.body",
                    "body": f'{{"detail": "{e.detail}"}}'.encode()
                }
                await send(body)
                return
        
        await self.app(scope, receive, send)

# Decoradores para diferentes tipos de limite
def auth_rate_limit():
    """Rate limit para endpoints de autenticação"""
    def decorator(func):
        return gym_rate_limiter.limiter.limit(RATE_LIMITS["auth"])(func)
    return decorator

def api_rate_limit():
    """Rate limit para APIs gerais"""
    def decorator(func):
        return gym_rate_limiter.limiter.limit(RATE_LIMITS["api"])(func)
    return decorator

def dashboard_rate_limit():
    """Rate limit para dashboard (queries pesadas)"""
    def decorator(func):
        return gym_rate_limiter.limiter.limit(RATE_LIMITS["dashboard"])(func)
    return decorator

def write_rate_limit():
    """Rate limit para operações de escrita"""
    def decorator(func):
        return gym_rate_limiter.limiter.limit(RATE_LIMITS["write"])(func)
    return decorator

# Função para análise de segurança
class SecurityAnalyzer:
    """Analisador de segurança para detectar padrões suspeitos"""
    
    @staticmethod
    def analyze_request_pattern(ip: str, endpoint: str, user_agent: str = "") -> Dict[str, Any]:
        """Analisa padrões de request para detectar bots/ataques"""
        analysis = {
            "risk_level": "low",
            "flags": [],
            "score": 0
        }
        
        # Verificar user agent suspeito
        suspicious_agents = ["bot", "crawler", "spider", "scraper", "hack", "attack"]
        if any(agent in user_agent.lower() for agent in suspicious_agents):
            analysis["flags"].append("suspicious_user_agent")
            analysis["score"] += 30
        
        # Verificar endpoints sensíveis
        sensitive_endpoints = ["/api/users", "/api/members", "/api/payments", "/admin"]
        if any(sens in endpoint for sens in sensitive_endpoints):
            analysis["flags"].append("sensitive_endpoint_access")
            analysis["score"] += 20
        
        # Verificar padrões de IP
        if ip.startswith(("10.", "192.168.", "172.")):
            analysis["flags"].append("internal_ip")
            analysis["score"] -= 10  # IPs internos são menos suspeitos
        
        # Calcular nível de risco
        if analysis["score"] >= 50:
            analysis["risk_level"] = "high"
        elif analysis["score"] >= 25:
            analysis["risk_level"] = "medium"
        
        return analysis

# Instância global do analisador
security_analyzer = SecurityAnalyzer()