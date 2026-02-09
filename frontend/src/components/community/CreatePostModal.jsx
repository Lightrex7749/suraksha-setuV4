import React, { useState } from 'react';
import { 
  X, MapPin, Tag, AlertCircle, HelpCircle, 
  Megaphone, MessageSquare, Send
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MediaUploader from './MediaUploader';

const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [postType, setPostType] = useState('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [autoLocation, setAutoLocation] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const postTypes = [
    { value: 'general', label: 'General Post', icon: MessageSquare, color: 'bg-blue-500' },
    { value: 'help', label: 'Help Request', icon: HelpCircle, color: 'bg-red-500' },
    { value: 'offer', label: 'Offering Help', icon: Megaphone, color: 'bg-green-500' },
    { value: 'alert', label: 'Alert/Warning', icon: AlertCircle, color: 'bg-orange-500' },
    { value: 'emergency', label: 'Emergency', icon: AlertCircle, color: 'bg-red-600' },
  ];

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocoding (you can use a real API here)
        // For now, just show coordinates
        const locationStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setAutoLocation({ latitude, longitude });
        setLocation(locationStr);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enter it manually.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      alert('Please enter post content');
      return;
    }

    const post = {
      id: Math.random().toString(36).substr(2, 9),
      type: postType,
      title: title.trim(),
      content: content.trim(),
      location: location.trim() || 'Unknown',
      geolocation: autoLocation,
      tags,
      media: uploadedFiles,
      author: 'Current User', // Will be replaced with actual user
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    onPostCreated?.(post);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setPostType('general');
    setTitle('');
    setContent('');
    setLocation('');
    setAutoLocation(null);
    setTags([]);
    setTagInput('');
    setUploadedFiles([]);
  };

  const selectedPostType = postTypes.find(pt => pt.value === postType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Community Post</DialogTitle>
          <DialogDescription>
            Share updates, ask for help, or report incidents in your area
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Post Type Selector */}
          <div className="space-y-2">
            <Label>Post Type</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {postTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${type.color}`} />
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title (optional) */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Brief headline for your post..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Content <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Describe the situation, ask for help, or share information..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              {content.length} characters
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Enter location or use GPS..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                {isGettingLocation ? 'Getting...' : 'GPS'}
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tags (e.g., flood, emergency)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Tag className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <MediaUploader 
              onFilesChange={setUploadedFiles}
              maxFiles={5}
            />
          </div>

          {/* Post Preview */}
          {content && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs font-semibold mb-2 text-muted-foreground">PREVIEW</p>
              {title && <h4 className="font-semibold mb-1">{title}</h4>}
              <p className="text-sm whitespace-pre-wrap">{content}</p>
              {location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <MapPin className="w-3 h-3" />
                  {location}
                </div>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2">
            {selectedPostType && (
              <Badge variant="outline" className={`${selectedPostType.color} text-white`}>
                {selectedPostType.label}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="w-4 h-4" />
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
