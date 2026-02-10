"""
PostgreSQL Database Configuration and Models
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import String, DateTime, JSON, Boolean, Integer, Float, Text, ForeignKey
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

# Auto-detect database type and configure appropriately
if DATABASE_URL:
    if DATABASE_URL.startswith('sqlite'):
        # SQLite for local development
        print("🔧 Using SQLite for local development")
        engine = create_async_engine(
            DATABASE_URL,
            echo=False,
            connect_args={"check_same_thread": False}
        )
    elif DATABASE_URL.startswith('postgresql://'):
        # PostgreSQL for production (Render)
        print("🔧 Using PostgreSQL for production")
        DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://', 1)
        engine = create_async_engine(
            DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={
                "ssl": "require",  # Render PostgreSQL requires SSL
                "server_settings": {"application_name": "suraksha_setu_backend"}
            }
        )
    elif DATABASE_URL.startswith('postgresql+asyncpg://'):
        # Already converted PostgreSQL URL
        print("🔧 Using PostgreSQL for production")
        engine = create_async_engine(
            DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={
                "ssl": "require",
                "server_settings": {"application_name": "suraksha_setu_backend"}
            }
        )
    else:
        raise ValueError(f"Unsupported database URL format: {DATABASE_URL[:20]}...")
else:
    raise ValueError("DATABASE_URL not set in environment variables")

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()

# ==================== DATABASE MODELS ====================

class User(Base):
    """User table for authentication and preferences"""
    __tablename__ = 'users'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    user_type: Mapped[str] = mapped_column(String(50))  # student, scientist, admin, citizen
    location: Mapped[Optional[Dict]] = mapped_column(JSON)
    preferences: Mapped[Optional[Dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ChatMessage(Base):
    """Chat message history"""
    __tablename__ = 'chat_messages'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(255), ForeignKey('users.id', ondelete='CASCADE'))
    session_id: Mapped[str] = mapped_column(String(255), index=True)
    message: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    language: Mapped[Optional[str]] = mapped_column(String(10))
    context: Mapped[Optional[Dict]] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class Alert(Base):
    """Disaster and weather alerts"""
    __tablename__ = 'alerts'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    alert_type: Mapped[str] = mapped_column(String(50), index=True)  # weather, disaster, aqi, etc.
    severity: Mapped[str] = mapped_column(String(20))  # low, medium, high, critical
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[Dict] = mapped_column(JSON)  # {lat, lon, city, state, pin_codes}
    alert_metadata: Mapped[Optional[Dict]] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(100))  # IMD, ISRO, CPCB, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class CommunityReport(Base):
    """User-generated disaster reports"""
    __tablename__ = 'community_reports'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    report_type: Mapped[str] = mapped_column(String(50))  # flood, fire, earthquake, etc.
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[Dict] = mapped_column(JSON)
    media_urls: Mapped[Optional[list]] = mapped_column(JSON)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class StatusCheck(Base):
    """User welfare status checks"""
    __tablename__ = 'status_checks'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    status: Mapped[str] = mapped_column(String(20))  # safe, help_needed, emergency
    message: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[Dict] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class PushSubscription(Base):
    """Web push notification subscriptions"""
    __tablename__ = 'push_subscriptions'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(255), ForeignKey('users.id', ondelete='CASCADE'))
    subscription_json: Mapped[Dict] = mapped_column(JSON)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CommunityPost(Base):
    """Community social media posts"""
    __tablename__ = 'community_posts'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    content: Mapped[str] = mapped_column(Text)
    post_type: Mapped[str] = mapped_column(String(50))  # text, image, video, poll, etc.
    media: Mapped[Optional[list]] = mapped_column(JSON)
    location: Mapped[Optional[Dict]] = mapped_column(JSON)
    tags: Mapped[Optional[list]] = mapped_column(JSON)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)


class Comment(Base):
    """Comments on community posts and reports"""
    __tablename__ = 'comments'
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), ForeignKey('users.id', ondelete='CASCADE'))
    post_id: Mapped[Optional[str]] = mapped_column(String(255), ForeignKey('community_posts.id', ondelete='CASCADE'), index=True)
    report_id: Mapped[Optional[str]] = mapped_column(String(255), ForeignKey('community_reports.id', ondelete='CASCADE'), index=True)
    parent_id: Mapped[Optional[str]] = mapped_column(String(255), ForeignKey('comments.id', ondelete='CASCADE'))  # For nested comments
    content: Mapped[str] = mapped_column(Text)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# ==================== DATABASE SESSION DEPENDENCY ====================

async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ==================== DATABASE INITIALIZATION ====================

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")


async def close_db():
    """Close database connections"""
    await engine.dispose()
    print("✅ Database connections closed")
