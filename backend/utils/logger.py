"""
KO Gym - Sistema de Logging Premium
Logs estruturados com níveis, métricas e rastreamento
"""
import structlog
import logging
import sys
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import os

# Configuração do structlog para logs estruturados
def configure_logging():
    """Configura o sistema de logging premium"""
    
    # Processadores de log
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.dev.set_exc_info,
        structlog.processors.dict_tracebacks,
    ]
    
    # Em produção, usar JSON; em desenvolvimento, formato colorido
    if os.getenv("ENVIRONMENT") == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Logger global da aplicação
logger = structlog.get_logger("ko_gym")

class GymLogger:
    """Logger premium para o sistema KO Gym"""
    
    def __init__(self):
        configure_logging()
        self.logger = structlog.get_logger("ko_gym")
    
    def info(self, message: str, **kwargs):
        """Log de informação"""
        self.logger.info(message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log de aviso"""
        self.logger.warning(message, **kwargs)
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log de erro"""
        if error:
            kwargs["error_type"] = type(error).__name__
            kwargs["error_message"] = str(error)
        self.logger.error(message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log de debug"""
        self.logger.debug(message, **kwargs)
    
    def security_event(self, event_type: str, user_id: Optional[str] = None, ip_address: Optional[str] = None, **kwargs):
        """Log de eventos de segurança"""
        self.logger.warning(
            "Security Event",
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            timestamp=datetime.now(timezone.utc).isoformat(),
            **kwargs
        )
    
    def business_metric(self, metric_name: str, value: Any, user_id: Optional[str] = None, **kwargs):
        """Log de métricas de negócio"""
        self.logger.info(
            "Business Metric",
            metric_name=metric_name,
            value=value,
            user_id=user_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            **kwargs
        )
    
    def api_request(self, method: str, endpoint: str, user_id: Optional[str] = None, 
                   ip_address: Optional[str] = None, duration_ms: Optional[float] = None, **kwargs):
        """Log de requests da API"""
        self.logger.info(
            "API Request",
            method=method,
            endpoint=endpoint,
            user_id=user_id,
            ip_address=ip_address,
            duration_ms=duration_ms,
            timestamp=datetime.now(timezone.utc).isoformat(),
            **kwargs
        )
    
    def member_activity(self, activity_type: str, member_id: str, **kwargs):
        """Log de atividades de membros"""
        self.logger.info(
            "Member Activity",
            activity_type=activity_type,
            member_id=member_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            **kwargs
        )

# Instância global do logger
gym_logger = GymLogger()

# Decorador para logar automaticamente funções
def log_function_call(func_name: str = None):
    """Decorador para logar chamadas de função"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            function_name = func_name or func.__name__
            start_time = datetime.now(timezone.utc)
            
            try:
                gym_logger.debug(f"Function started: {function_name}")
                result = func(*args, **kwargs)
                
                duration = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
                gym_logger.debug(
                    f"Function completed: {function_name}",
                    duration_ms=duration,
                    success=True
                )
                return result
                
            except Exception as e:
                duration = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
                gym_logger.error(
                    f"Function failed: {function_name}",
                    error=e,
                    duration_ms=duration,
                    success=False
                )
                raise
        
        return wrapper
    return decorator

# Middleware para logging automático de requests
class LoggingMiddleware:
    """Middleware para logging automático de todas as requests"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = datetime.now(timezone.utc)
            
            # Capturar informações da request
            method = scope.get("method", "UNKNOWN")
            path = scope.get("path", "")
            client = scope.get("client", ("unknown", 0))
            ip_address = client[0] if client else "unknown"
            
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    status_code = message["status"]
                    duration = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
                    
                    # Log da request
                    gym_logger.api_request(
                        method=method,
                        endpoint=path,
                        ip_address=ip_address,
                        duration_ms=round(duration, 2),
                        status_code=status_code
                    )
                
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)