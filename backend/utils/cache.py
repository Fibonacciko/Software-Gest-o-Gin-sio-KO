"""
KO Gym - Sistema de Cache Premium
Cache inteligente para performance otimizada
"""
import redis
import json
import pickle
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Dict, Union
from functools import wraps
import hashlib
import os
from .logger import gym_logger

class GymCache:
    """Sistema de cache premium para o KO Gym"""
    
    def __init__(self):
        # Configuração Redis (local para desenvolvimento)
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=False)
            # Testar conexão
            self.redis_client.ping()
            self.available = True
            gym_logger.info("Redis cache initialized successfully")
        except Exception as e:
            # Fallback para cache em memória se Redis não disponível
            self.memory_cache = {}
            self.cache_timestamps = {}
            self.available = False
            gym_logger.warning("Redis not available, using memory cache fallback", error=e)
    
    def _generate_key(self, key: str, prefix: str = "ko_gym") -> str:
        """Gera chave única para o cache"""
        return f"{prefix}:{key}"
    
    def _serialize_value(self, value: Any) -> bytes:
        """Serializa valor para armazenamento"""
        if isinstance(value, (str, int, float, bool)):
            return json.dumps({"type": "json", "data": value}).encode()
        else:
            return pickle.dumps({"type": "pickle", "data": value})
    
    def _deserialize_value(self, data: bytes) -> Any:
        """Deserializa valor do armazenamento"""
        try:
            # Tentar JSON primeiro (mais rápido)
            obj = json.loads(data.decode())
            if obj.get("type") == "json":
                return obj["data"]
        except:
            pass
        
        # Fallback para pickle
        try:
            obj = pickle.loads(data)
            if obj.get("type") == "pickle":
                return obj["data"]
        except:
            pass
        
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> bool:
        """Armazena valor no cache"""
        try:
            cache_key = self._generate_key(key)
            
            if self.available:
                # Redis
                serialized = self._serialize_value(value)
                self.redis_client.setex(cache_key, ttl_seconds, serialized)
                gym_logger.debug(f"Cache set: {key}", ttl_seconds=ttl_seconds)
                return True
            else:
                # Memory fallback
                self.memory_cache[cache_key] = value
                self.cache_timestamps[cache_key] = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
                return True
                
        except Exception as e:
            gym_logger.error(f"Cache set failed: {key}", error=e)
            return False
    
    def get(self, key: str) -> Any:
        """Recupera valor do cache"""
        try:
            cache_key = self._generate_key(key)
            
            if self.available:
                # Redis
                data = self.redis_client.get(cache_key)
                if data:
                    value = self._deserialize_value(data)
                    gym_logger.debug(f"Cache hit: {key}")
                    return value
                else:
                    gym_logger.debug(f"Cache miss: {key}")
                    return None
            else:
                # Memory fallback
                if cache_key in self.memory_cache:
                    # Verificar TTL
                    if datetime.now(timezone.utc) < self.cache_timestamps.get(cache_key, datetime.min.replace(tzinfo=timezone.utc)):
                        gym_logger.debug(f"Memory cache hit: {key}")
                        return self.memory_cache[cache_key]
                    else:
                        # Expirado, remover
                        del self.memory_cache[cache_key]
                        del self.cache_timestamps[cache_key]
                
                gym_logger.debug(f"Memory cache miss: {key}")
                return None
                
        except Exception as e:
            gym_logger.error(f"Cache get failed: {key}", error=e)
            return None
    
    def delete(self, key: str) -> bool:
        """Remove valor do cache"""
        try:
            cache_key = self._generate_key(key)
            
            if self.available:
                result = self.redis_client.delete(cache_key)
                gym_logger.debug(f"Cache delete: {key}", deleted=bool(result))
                return bool(result)
            else:
                if cache_key in self.memory_cache:
                    del self.memory_cache[cache_key]
                    del self.cache_timestamps[cache_key]
                    gym_logger.debug(f"Memory cache delete: {key}")
                    return True
                return False
                
        except Exception as e:
            gym_logger.error(f"Cache delete failed: {key}", error=e)
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Remove todas as chaves que correspondem ao padrão"""
        try:
            if self.available:
                keys = self.redis_client.keys(self._generate_key(f"*{pattern}*"))
                if keys:
                    deleted = self.redis_client.delete(*keys)
                    gym_logger.info(f"Cache pattern cleared: {pattern}", keys_deleted=deleted)
                    return deleted
                return 0
            else:
                # Memory fallback
                keys_to_delete = [k for k in self.memory_cache.keys() if pattern in k]
                for key in keys_to_delete:
                    del self.memory_cache[key]
                    if key in self.cache_timestamps:
                        del self.cache_timestamps[key]
                
                gym_logger.info(f"Memory cache pattern cleared: {pattern}", keys_deleted=len(keys_to_delete))
                return len(keys_to_delete)
                
        except Exception as e:
            gym_logger.error(f"Cache pattern clear failed: {pattern}", error=e)
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Estatísticas do cache"""
        if self.available:
            try:
                info = self.redis_client.info()
                return {
                    "type": "redis",
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory": info.get("used_memory_human", "0B"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0)
                }
            except:
                pass
        
        return {
            "type": "memory",
            "keys_count": len(self.memory_cache),
            "memory_usage": "N/A"
        }

# Instância global do cache
gym_cache = GymCache()

def cache_result(ttl_seconds: int = 3600, key_prefix: str = ""):
    """Decorador para cache automático de resultados de função"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Gerar chave baseada na função e argumentos
            func_name = f"{key_prefix}{func.__name__}" if key_prefix else func.__name__
            
            # Hash dos argumentos para chave única
            args_str = str(args) + str(sorted(kwargs.items()))
            args_hash = hashlib.md5(args_str.encode()).hexdigest()[:8]
            cache_key = f"func:{func_name}:{args_hash}"
            
            # Tentar obter do cache
            cached_result = gym_cache.get(cache_key)
            if cached_result is not None:
                gym_logger.debug(f"Function cache hit: {func.__name__}")
                return cached_result
            
            # Executar função e cachear resultado
            result = await func(*args, **kwargs)
            gym_cache.set(cache_key, result, ttl_seconds)
            gym_logger.debug(f"Function result cached: {func.__name__}", ttl_seconds=ttl_seconds)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Para funções síncronas
            func_name = f"{key_prefix}{func.__name__}" if key_prefix else func.__name__
            
            args_str = str(args) + str(sorted(kwargs.items()))
            args_hash = hashlib.md5(args_str.encode()).hexdigest()[:8]
            cache_key = f"func:{func_name}:{args_hash}"
            
            cached_result = gym_cache.get(cache_key)
            if cached_result is not None:
                gym_logger.debug(f"Function cache hit: {func.__name__}")
                return cached_result
            
            result = func(*args, **kwargs)
            gym_cache.set(cache_key, result, ttl_seconds)
            gym_logger.debug(f"Function result cached: {func.__name__}", ttl_seconds=ttl_seconds)
            
            return result
        
        # Detectar se é função async
        if hasattr(func, '__code__') and func.__code__.co_flags & 0x80:
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# Funções de cache específicas para o negócio
class BusinessCache:
    """Cache específico para dados de negócio"""
    
    @staticmethod
    def cache_dashboard_stats(user_id: str, stats: Dict[str, Any]):
        """Cache das estatísticas do dashboard"""
        gym_cache.set(f"dashboard_stats:{user_id}", stats, ttl_seconds=300)  # 5 minutos
    
    @staticmethod
    def get_dashboard_stats(user_id: str) -> Optional[Dict[str, Any]]:
        """Recupera estatísticas do dashboard do cache"""
        return gym_cache.get(f"dashboard_stats:{user_id}")
    
    @staticmethod
    def cache_member_list(filters_hash: str, members: list):
        """Cache da lista de membros com filtros"""
        gym_cache.set(f"members_list:{filters_hash}", members, ttl_seconds=180)  # 3 minutos
    
    @staticmethod
    def get_member_list(filters_hash: str) -> Optional[list]:
        """Recupera lista de membros do cache"""
        return gym_cache.get(f"members_list:{filters_hash}")
    
    @staticmethod
    def invalidate_member_cache():
        """Invalida todo o cache relacionado a membros"""
        gym_cache.clear_pattern("members_")
        gym_cache.clear_pattern("dashboard_stats")
        gym_logger.info("Member-related cache invalidated")
    
    @staticmethod
    def cache_analytics_data(metric: str, data: Any, ttl_seconds: int = 3600):
        """Cache de dados de analytics"""
        gym_cache.set(f"analytics:{metric}", data, ttl_seconds)
    
    @staticmethod
    def get_analytics_data(metric: str) -> Any:
        """Recupera dados de analytics do cache"""
        return gym_cache.get(f"analytics:{metric}")