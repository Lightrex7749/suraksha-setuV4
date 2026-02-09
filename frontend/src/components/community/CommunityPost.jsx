import React, { useState } from 'react';
import { 
  ThumbsUp, MessageSquare, Share2, Bookmark, MapPin, 
  MoreVertical, Trash2, Edit2, Flag, ExternalLink,
  Play, Volume2, VolumeX, Maximize2, Heart, Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CommentSection from './CommentSection';
import { cn } from "@/lib/utils";

const CommunityPost = ({ 
  post, 
  onLike, 
  onDelete, 
  onShare, 
  onSave,
  currentUserId = 'current-user'
}) => {
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.likedByUser || false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [saved, setSaved] = useState(post.savedByUser || false);
  const [comments, setComments] = useState(post.comments || []);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const isOwnPost = post.userId === currentUserId || post.author === 'You';

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    onLike?.(post.id, !liked);
  };

  const handleSave = () => {
    setSaved(!saved);
    onSave?.(post.id, !saved);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title || 'Community Post',
        text: post.content,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
    onShare?.(post.id);
  };

  const getPostTypeColor = () => {
    switch (post.type) {
      case 'emergency': return 'bg-red-600 text-white';
      case 'help': return 'bg-red-500 text-white';
      case 'offer': return 'bg-green-500 text-white';
      case 'alert': return 'bg-orange-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getPostTypeLabel = () => {
    switch (post.type) {
      case 'emergency': return 'Emergency';
      case 'help': return 'Help Needed';
      case 'offer': return 'Offering Help';
      case 'alert': return 'Alert';
      default: return 'General';
    }
  };

  const timeAgo = getTimeAgo(post.timestamp);
  const mediaFiles = post.media || [];
  const hasMedia = mediaFiles.length > 0;

  return (
    <>
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          {/* Post Header */}
          <div className="p-4 pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 flex-1">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`} />
                  <AvatarFallback>{post.author[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{post.author}</h4>
                    <Badge className={cn("text-xs", getPostTypeColor())}>
                      {getPostTypeLabel()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{timeAgo}</span>
                    {post.location && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {post.location}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Post Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwnPost ? (
                    <>
                      <DropdownMenuItem>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Post
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete?.(post.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={handleSave}>
                        <Bookmark className="w-4 h-4 mr-2" />
                        {saved ? 'Unsave' : 'Save Post'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-2" />
                        Report Post
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleShare}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Share Externally
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Post Content */}
          <div className="px-4 pb-3">
            {post.title && (
              <h3 className="font-semibold text-base mb-2">{post.title}</h3>
            )}
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Media Gallery */}
          {hasMedia && (
            <div className={cn(
              "grid gap-1 px-4 pb-3",
              mediaFiles.length === 1 && "grid-cols-1",
              mediaFiles.length === 2 && "grid-cols-2",
              mediaFiles.length >= 3 && "grid-cols-2"
            )}>
              {mediaFiles.slice(0, 4).map((media, index) => (
                <div
                  key={media.id}
                  className={cn(
                    "relative rounded-lg overflow-hidden bg-muted cursor-pointer",
                    mediaFiles.length === 1 && "h-96",
                    mediaFiles.length >= 2 && "h-48",
                    index === 3 && mediaFiles.length > 4 && "relative"
                  )}
                  onClick={() => {
                    setSelectedMediaIndex(index);
                    setShowMediaModal(true);
                  }}
                >
                  {/* Image */}
                  {media.type.startsWith('image/') && (
                    <>
                      <img
                        src={media.preview}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                      {media.geotag && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 left-2 text-xs gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          GPS
                        </Badge>
                      )}
                    </>
                  )}

                  {/* Video */}
                  {media.type.startsWith('video/') && (
                    <>
                      <video
                        src={media.preview}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                      {media.geotag && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 left-2 text-xs gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          GPS
                        </Badge>
                      )}
                    </>
                  )}

                  {/* Audio */}
                  {media.type.startsWith('audio/') && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                      <Volume2 className="w-12 h-12 text-white" />
                    </div>
                  )}

                  {/* Other files */}
                  {!media.type.startsWith('image/') && 
                   !media.type.startsWith('video/') && 
                   !media.type.startsWith('audio/') && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground text-center px-2 truncate w-full">
                        {media.name}
                      </p>
                    </div>
                  )}

                  {/* More media indicator */}
                  {index === 3 && mediaFiles.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        +{mediaFiles.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Post Stats */}
          <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {likeCount > 0 && (
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                  {likeCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {comments.length > 0 && (
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              )}
            </div>
          </div>

          {/* Post Actions */}
          <div className="px-4 py-2 border-t flex items-center justify-around">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                "gap-2 flex-1",
                liked && "text-red-500 hover:text-red-600"
              )}
            >
              <Heart className={cn("w-4 h-4", liked && "fill-current")} />
              <span className="font-medium">{liked ? 'Liked' : 'Like'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="gap-2 flex-1"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">Comment</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="gap-2 flex-1"
            >
              <Share2 className="w-4 h-4" />
              <span className="font-medium">Share</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={cn(
                "gap-2 flex-1",
                saved && "text-blue-500"
              )}
            >
              <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
              <span className="font-medium">{saved ? 'Saved' : 'Save'}</span>
            </Button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="px-4 py-4 border-t bg-muted/50">
              <CommentSection
                postId={post.id}
                comments={comments}
                onCommentsChange={setComments}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Modal */}
      <Dialog open={showMediaModal} onOpenChange={setShowMediaModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Media Viewer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mediaFiles[selectedMediaIndex] && (
              <>
                {/* Current Media */}
                <div className="relative rounded-lg overflow-hidden bg-black">
                  {mediaFiles[selectedMediaIndex].type.startsWith('image/') && (
                    <img
                      src={mediaFiles[selectedMediaIndex].preview}
                      alt={mediaFiles[selectedMediaIndex].name}
                      className="w-full max-h-[70vh] object-contain"
                    />
                  )}
                  {mediaFiles[selectedMediaIndex].type.startsWith('video/') && (
                    <video
                      src={mediaFiles[selectedMediaIndex].preview}
                      controls
                      className="w-full max-h-[70vh]"
                    />
                  )}
                  {mediaFiles[selectedMediaIndex].type.startsWith('audio/') && (
                    <div className="p-12 flex items-center justify-center">
                      <audio
                        src={mediaFiles[selectedMediaIndex].preview}
                        controls
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Geotag info */}
                  {mediaFiles[selectedMediaIndex].geotag && (
                    <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="font-semibold">Location Data</span>
                      </div>
                      <p className="text-xs">
                        Lat: {mediaFiles[selectedMediaIndex].geotag.latitude.toFixed(6)}
                      </p>
                      <p className="text-xs">
                        Lng: {mediaFiles[selectedMediaIndex].geotag.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs">
                        Accuracy: ±{mediaFiles[selectedMediaIndex].geotag.accuracy.toFixed(0)}m
                      </p>
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {mediaFiles.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {mediaFiles.map((media, index) => (
                      <button
                        key={media.id}
                        onClick={() => setSelectedMediaIndex(index)}
                        className={cn(
                          "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                          index === selectedMediaIndex 
                            ? "border-primary scale-105" 
                            : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        {media.type.startsWith('image/') && (
                          <img
                            src={media.preview}
                            alt={media.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {media.type.startsWith('video/') && (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {media.type.startsWith('audio/') && (
                          <div className="w-full h-full bg-purple-500 flex items-center justify-center">
                            <Volume2 className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper function
function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return past.toLocaleDateString();
}

export default CommunityPost;
