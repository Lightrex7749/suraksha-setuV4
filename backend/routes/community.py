"""
Community API Routes — with in-memory fallback for instant feedback
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

community_router = APIRouter(prefix="/api/community", tags=["Community"])

# ── In-memory stores (instant, survives until server restart) ──
_posts: dict = {}          # id -> post dict
_comments: dict = {}       # post_id -> [comment dicts]


class CreatePostRequest(BaseModel):
    content: str
    title: Optional[str] = None
    type: str = "general"
    location: Optional[str] = ""
    tags: Optional[List[str]] = []
    media: Optional[list] = []
    author: Optional[str] = "Anonymous"


class CreateCommentRequest(BaseModel):
    content: str
    parent_id: Optional[str] = None
    author: Optional[str] = "You"


def _try_db():
    """Return DB helpers if available, else None."""
    try:
        from database import AsyncSessionLocal, CommunityPost
        return AsyncSessionLocal, CommunityPost
    except Exception:
        return None, None


# ── helpers to persist + keep in-memory in sync ──

async def _persist_post(post_dict):
    """Try to persist to DB; swallow errors so in-memory always works."""
    SessionLocal, CommunityPost = _try_db()
    if not SessionLocal:
        return
    try:
        async with SessionLocal() as db:
            db_post = CommunityPost(
                id=post_dict["id"],
                user_id="anonymous",
                content=post_dict["content"],
                post_type=post_dict["type"],
                media=post_dict.get("media") or [],
                location={"name": post_dict.get("location", "")},
                tags=post_dict.get("tags") or [],
                likes=0, shares=0, comments_count=0, is_public=True,
            )
            db.add(db_post)
            await db.commit()
    except Exception as e:
        logger.warning(f"DB persist failed (in-memory still valid): {e}")


async def _load_db_posts_once():
    """On first GET, seed in-memory cache from DB if empty."""
    if _posts:
        return
    SessionLocal, CommunityPost = _try_db()
    if not SessionLocal:
        return
    try:
        from sqlalchemy import select
        async with SessionLocal() as db:
            result = await db.execute(
                select(CommunityPost)
                .where(CommunityPost.is_public == True)
                .order_by(CommunityPost.created_at.desc())
                .limit(100)
            )
            for p in result.scalars().all():
                _posts[p.id] = {
                    "id": p.id,
                    "content": p.content,
                    "title": p.content[:80],
                    "type": p.post_type or "general",
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
    except Exception as e:
        logger.warning(f"DB seed failed: {e}")


# ─────────── ENDPOINTS ───────────

@community_router.get("/posts")
async def get_posts(type: Optional[str] = None, limit: int = Query(default=50, le=100)):
    """Get community posts (in-memory + DB seeded)."""
    await _load_db_posts_once()

    posts = list(_posts.values())

    if type:
        posts = [p for p in posts if p["type"] == type]

    # sort newest first
    posts.sort(key=lambda p: p["timestamp"], reverse=True)

    # attach comments
    for p in posts:
        p["comments"] = _comments.get(p["id"], [])

    return {"posts": posts[:limit]}


@community_router.post("/posts")
async def create_post(request: CreatePostRequest):
    """Create a community post (in-memory + DB)."""
    post_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    post = {
        "id": post_id,
        "content": request.content,
        "title": request.title or request.content[:80],
        "type": request.type,
        "author": request.author or "Anonymous",
        "location": request.location or "India",
        "tags": request.tags or [],
        "media": [],  # media stored as previews on client side only
        "likes": 0,
        "shares": 0,
        "comments": [],
        "likedByUser": False,
        "savedByUser": False,
        "timestamp": now,
    }

    _posts[post_id] = post
    await _persist_post(post)

    return {"success": True, "post": post}


@community_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, unlike: bool = False):
    """Like or unlike a post."""
    post = _posts.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if unlike:
        post["likes"] = max(0, post["likes"] - 1)
        post["likedByUser"] = False
    else:
        post["likes"] += 1
        post["likedByUser"] = True

    return {"success": True, "liked": post["likedByUser"], "likes": post["likes"]}


@community_router.post("/posts/{post_id}/save")
async def save_post(post_id: str, unsave: bool = False):
    """Save or unsave a post."""
    post = _posts.get(post_id)
    if post:
        post["savedByUser"] = not unsave
    return {"success": True, "saved": not unsave}


@community_router.delete("/posts/{post_id}")
async def delete_post(post_id: str):
    """Delete a post."""
    if post_id in _posts:
        del _posts[post_id]
        _comments.pop(post_id, None)

    # Also try DB delete
    SessionLocal, CommunityPost = _try_db()
    if SessionLocal:
        try:
            async with SessionLocal() as db:
                obj = await db.get(CommunityPost, post_id)
                if obj:
                    await db.delete(obj)
                    await db.commit()
        except Exception:
            pass

    return {"success": True}


@community_router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, request: CreateCommentRequest):
    """Add a comment (or reply) to a post. Stored in-memory."""
    if post_id not in _posts:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = {
        "id": str(uuid.uuid4()),
        "author": request.author or "You",
        "content": request.content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "likes": 0,
        "likedByUser": False,
        "replies": [],
        "edited": False,
    }

    if post_id not in _comments:
        _comments[post_id] = []

    if request.parent_id:
        # nested reply — find parent and append
        def _attach(lst):
            for c in lst:
                if c["id"] == request.parent_id:
                    c.setdefault("replies", []).append(comment)
                    return True
                if _attach(c.get("replies", [])):
                    return True
            return False

        if not _attach(_comments[post_id]):
            # parent not found, just append top-level
            _comments[post_id].insert(0, comment)
    else:
        _comments[post_id].insert(0, comment)

    return {"success": True, "comment": comment}


@community_router.get("/stats")
async def community_stats():
    """Return aggregate stats for the community sidebar."""
    posts = list(_posts.values())
    return {
        "total_posts": len(posts),
        "total_helps": sum(1 for p in posts if p["type"] == "help"),
        "total_offers": sum(1 for p in posts if p["type"] == "offer"),
        "total_alerts": sum(1 for p in posts if p["type"] in ("alert", "emergency")),
    }
