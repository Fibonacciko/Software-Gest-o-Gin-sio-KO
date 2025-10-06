import aioredis
import json
import os
from typing import Any, Optional, Union
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class CacheManager:
    """Advanced Redis Cache Manager for high-performance data caching"""
    
    def __init__(self):
        self.redis = None
        self.connected = False
        
    async def connect(self):
        """Initialize Redis connection"""
        try:
            # Use Redis if available, fallback to in-memory cache
            redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
            self.redis = await aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5
            )
            # Test connection
            await self.redis.ping()
            self.connected = True
            logger.info("✅ Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"⚠️ Redis not available, using fallback: {e}")
            # In-memory fallback cache
            self.redis = {}
            self.connected = False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value with intelligent deserialization"""
        try:
            if self.connected:
                value = await self.redis.get(key)
                if value:
                    return json.loads(value)
            else:
                # Fallback to in-memory
                return self.redis.get(key)
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """Set cached value with TTL (Time To Live)"""
        try:
            if self.connected:
                serialized = json.dumps(value, default=str)
                await self.redis.setex(key, ttl, serialized)
            else:
                # Fallback to in-memory (no TTL in simple dict)
                self.redis[key] = value
            logger.debug(f"✅ Cached {key} for {ttl}s")
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
    
    async def delete(self, key: str):
        """Delete cached value"""
        try:
            if self.connected:
                await self.redis.delete(key)
            else:
                self.redis.pop(key, None)
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            if self.connected:
                return await self.redis.exists(key) > 0
            else:
                return key in self.redis
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
        return False
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Atomic counter increment"""
        try:
            if self.connected:
                return await self.redis.incrby(key, amount)
            else:
                current = self.redis.get(key, 0)
                new_value = current + amount
                self.redis[key] = new_value
                return new_value
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
        return 0
    
    async def set_hash(self, key: str, field: str, value: Any):
        """Set hash field value"""
        try:
            if self.connected:
                await self.redis.hset(key, field, json.dumps(value, default=str))
            else:
                if key not in self.redis:
                    self.redis[key] = {}
                self.redis[key][field] = value
        except Exception as e:
            logger.error(f"Cache hash set error for key {key}, field {field}: {e}")
    
    async def get_hash(self, key: str, field: str) -> Optional[Any]:
        """Get hash field value"""
        try:
            if self.connected:
                value = await self.redis.hget(key, field)
                if value:
                    return json.loads(value)
            else:
                hash_data = self.redis.get(key, {})
                return hash_data.get(field)
        except Exception as e:
            logger.error(f"Cache hash get error for key {key}, field {field}: {e}")
        return None
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern"""
        try:
            if self.connected:
                keys = await self.redis.keys(pattern)
                if keys:
                    await self.redis.delete(*keys)
                    logger.info(f"🗑️ Invalidated {len(keys)} keys matching {pattern}")
            else:
                # Simple pattern matching for fallback
                keys_to_delete = [k for k in self.redis.keys() if pattern.replace('*', '') in k]
                for key in keys_to_delete:
                    del self.redis[key]
        except Exception as e:
            logger.error(f"Cache pattern invalidation error for {pattern}: {e}")

# Global cache instance
cache = CacheManager()

def cache_key(prefix: str, *args) -> str:
    """Generate standardized cache key"""
    return f"gym:{prefix}:" + ":".join(str(arg) for arg in args)

# Decorators for automatic caching
def cached(ttl: int = 300, key_prefix: str = "auto"):
    """Decorator for automatic function result caching"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and args
            key = cache_key(key_prefix, func.__name__, *args, *sorted(kwargs.items()))
            
            # Try to get from cache first
            cached_result = await cache.get(key)
            if cached_result is not None:
                logger.debug(f"🎯 Cache hit: {key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(key, result, ttl)
            logger.debug(f"💾 Cache miss, stored: {key}")
            return result
        
        return wrapper
    return decorator

# Cache warming functions
async def warm_dashboard_cache():
    """Pre-warm frequently accessed dashboard data"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from datetime import date
        
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        # Warm member stats
        total_members = await db.members.count_documents({"status": "active"})
        await cache.set(cache_key("stats", "total_members"), total_members, 600)
        
        # Warm today's attendance
        today = date.today().isoformat()
        attendance_count = await db.attendance.count_documents({"check_in_date": today})
        await cache.set(cache_key("stats", "attendance_today"), attendance_count, 300)
        
        logger.info("🔥 Dashboard cache warmed successfully")
        
    except Exception as e:
        logger.error(f"Cache warming error: {e}")

# Rate limiting with Redis
class RateLimiter:
    """Redis-based rate limiter for API endpoints"""
    
    @staticmethod
    async def check_rate_limit(identifier: str, max_requests: int = 60, window: int = 60) -> bool:
        """Check if request is within rate limit"""
        try:
            key = cache_key("rate_limit", identifier)
            current = await cache.increment(key)
            
            if current == 1:
                # Set expiration on first request
                if cache.connected:
                    await cache.redis.expire(key, window)
            
            return current <= max_requests
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return True  # Allow on error

    @staticmethod
    async def get_remaining_requests(identifier: str, max_requests: int = 60) -> int:
        """Get remaining requests in current window"""
        try:
            key = cache_key("rate_limit", identifier)
            current = await cache.get(key) or 0
            return max(0, max_requests - current)
        except Exception as e:
            logger.error(f"Rate limit remaining error: {e}")
            return max_requests