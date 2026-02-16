"""
Community API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import AsyncSessionLocal, CommunityPost
from sqlalchemy import select, func
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

community_router = APIRouter(prefix="/api/community", tags=["Community"])


class CreatePostRequest(BaseModel):
    content: str
    title: Optional[str] = None
    type: str = "text"
    location: Optional[str] = ""
    tags: Optional[List[str]] = []
    media: Optional[List[str]] = []
    author: Optional[str] = "Anonymous"


@community_router.get("/posts")
async def get_posts(type: Optional[str] = None, limit: int = Query(default=50, le=100)):
    """Get community posts."""
    try:
        async with AsyncSessionLocal() as db:
            query = select(CommunityPost).where(CommunityPost.is_public == True)
            if type:
                query = query.where(CommunityPost.post_type == type)
            query = query.order_by(CommunityPost.created_at.desc()).limit(limit)
            result = await db.execute(query)
            posts = result.scalars().all()

            return {
                "posts": [
                    {
                        "id": p.id,
                        "content": p.content,
                        "title": p.content[:50] if not hasattr(p, 'title') else p.content[:50],
                        "type": p.post_type,
                        "author": "Community Member",
                        "location": (p.location or {}).get("name", "India"),
                        "tags": p.tags or [],
                        "media": p.media or [],
                        "likes": p.likes,
                        "shares": p.shares,
                        "comments": [],
                        "likedByUser": False,
                        "savedByUser": False,
                        "timestamp": p.created_at.isoformat(),
                    }
                    for p in posts
                ]
            }
    except Exception as e:
        logger.error(f"Error fetching posts: {e}")
        return {"posts": []}


@community_router.post("/posts")
async def create_post(request: CreatePostRequest):
    """Create a community post."""
    try:
        async with AsyncSessionLocal() as db:
            post = CommunityPost(
                id=str(uuid.uuid4()),
                user_id="anonymous",
                content=request.content,
                post_type=request.type,
                media=request.media,
                location={"name": request.location} if request.location else None,
                tags=request.tags,
                likes=0,
                shares=0,
                comments_count=0,
                is_public=True,
            )
            db.add(post)
            await db.commit()

            return {
                "success": True,
                "post": {
                    "id": post.id,
                    "content": post.content,
                    "title": request.title or post.content[:50],
                    "type": post.post_type,
                    "author": request.author,
                    "location": request.location or "India",
                    "tags": request.tags or [],
                    "media": request.media or [],
                    "likes": 0,
                    "shares": 0,
                    "comments": [],
                    "likedByUser": False,
                    "savedByUser": False,
                    "timestamp": post.created_at.isoformat(),
                },
            }
    except Exception as e:
        logger.error(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@community_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, unlike: bool = False):
    """Like or unlike a post."""
    try:
        async with AsyncSessionLocal() as db:
            post = await db.get(CommunityPost, post_id)
            if not post:
                raise HTTPException(status_code=404, detail="Post not found")
            if unlike:
                post.likes = max(0, post.likes - 1)
                liked = False
            else:
                post.likes += 1
                liked = True
            await db.commit()
            return {"success": True, "liked": liked, "likes": post.likes}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error liking post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@community_router.post("/posts/{post_id}/save")
async def save_post(post_id: str, unsave: bool = False):
    """Save or unsave a post."""
    return {"success": True, "saved": not unsave}


@community_router.delete("/posts/{post_id}")
async def delete_post(post_id: str):
    """Delete a post."""
    try:
        async with AsyncSessionLocal() as db:
            post = await db.get(CommunityPost, post_id)
            if not post:
                raise HTTPException(status_code=404, detail="Post not found")
            await db.delete(post)
            await db.commit()
            return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting post: {e}")
        raise HTTPException(status_code=500, detail=str(e))
