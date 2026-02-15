import React, { useState, useEffect } from 'react';
import { 
  Plus, Filter, Search, TrendingUp, 
  Award, Heart, Users, MapPin, 
  AlertCircle, HelpCircle, Megaphone,
  Clock, ThumbsUp as ThumbsUpIcon, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import CommunityPost from '@/components/community/CommunityPost';
import CreatePostModal from '@/components/community/CreatePostModal';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const Community = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [activeTab, setActiveTab] = useState('feed');
  const [loading, setLoading] = useState(true);

  // Fetch posts from backend
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/community/posts`, {
        params: {
          type: filterType !== 'all' ? filterType : undefined,
          limit: 50
        }
      });
      setPosts(response.data.posts || []);
      setFilteredPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
      setFilteredPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [filterType]);

  // Filter and search posts
  useEffect(() => {
    let filtered = [...posts];

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(post => post.type === filterType);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.content.toLowerCase().includes(query) ||
        post.title?.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query) ||
        post.location.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case 'popular':
        filtered.sort((a, b) => b.likes - a.likes);
        break;
      case 'commented':
        filtered.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
        break;
      default:
        break;
    }

    setFilteredPosts(filtered);
  }, [posts, filterType, searchQuery, sortBy]);

  const handlePostCreated = async (newPost) => {
    try {
      const response = await axios.post(`${API_URL}/community/posts`, newPost);
      if (response.data.success && response.data.post) {
        setPosts([response.data.post, ...posts]);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handlePostLike = async (postId, liked) => {
    try {
      const response = await axios.post(`${API_URL}/community/posts/${postId}/like`, null, {
        params: { unlike: !liked }
      });
      if (response.data.success) {
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, likedByUser: response.data.liked, likes: response.data.likes }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handlePostSave = async (postId, saved) => {
    try {
      const response = await axios.post(`${API_URL}/community/posts/${postId}/save`, null, {
        params: { unsave: !saved }
      });
      if (response.data.success) {
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, savedByUser: response.data.saved }
            : post
        ));
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handlePostDelete = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const response = await axios.delete(`${API_URL}/community/posts/${postId}`);
        if (response.data.success) {
          setPosts(posts.filter(post => post.id !== postId));
        }
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handlePostShare = (postId) => {
    console.log('Shared post:', postId);
  };

  const savedPosts = posts.filter(post => post.savedByUser);
  const myPosts = posts.filter(post => post.author === 'You');

  const getStatsData = () => {
    return {
      totalPosts: posts.length,
      totalHelps: posts.filter(p => p.type === 'help').length,
      totalOffers: posts.filter(p => p.type === 'offer').length,
      totalAlerts: posts.filter(p => p.type === 'alert' || p.type === 'emergency').length,
    };
  };

  const stats = getStatsData();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community Hub</h1>
          <p className="text-muted-foreground">Connect, report, and help your neighbors</p>
        </div>
        <Button 
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4" /> Create Post
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalPosts}</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <HelpCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalHelps}</p>
              <p className="text-xs text-muted-foreground">Help Needed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Megaphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalOffers}</p>
              <p className="text-xs text-muted-foreground">Help Offered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAlerts}</p>
              <p className="text-xs text-muted-foreground">Active Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts, tags, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Posts</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="help">Help Requests</SelectItem>
                    <SelectItem value="offer">Offerings</SelectItem>
                    <SelectItem value="alert">Alerts</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="commented">Most Commented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="saved">Saved ({savedPosts.length})</TabsTrigger>
              <TabsTrigger value="my-posts">My Posts ({myPosts.length})</TabsTrigger>
            </TabsList>

            {/* Feed Tab */}
            <TabsContent value="feed" className="space-y-4 mt-6">
              {loading ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                    <p className="text-muted-foreground">Loading community posts...</p>
                  </CardContent>
                </Card>
              ) : filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <CommunityPost
                    key={post.id}
                    post={post}
                    onLike={handlePostLike}
                    onDelete={handlePostDelete}
                    onShare={handlePostShare}
                    onSave={handlePostSave}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No posts found matching your search' : 'No posts to display'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Saved Tab */}
            <TabsContent value="saved" className="space-y-4 mt-6">
              {savedPosts.length > 0 ? (
                savedPosts.map((post) => (
                  <CommunityPost
                    key={post.id}
                    post={post}
                    onLike={handlePostLike}
                    onDelete={handlePostDelete}
                    onShare={handlePostShare}
                    onSave={handlePostSave}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No saved posts yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* My Posts Tab */}
            <TabsContent value="my-posts" className="space-y-4 mt-6">
              {myPosts.length > 0 ? (
                myPosts.map((post) => (
                  <CommunityPost
                    key={post.id}
                    post={post}
                    onLike={handlePostLike}
                    onDelete={handlePostDelete}
                    onShare={handlePostShare}
                    onSave={handlePostSave}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">You haven't created any posts yet</p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      Create Your First Post
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start gap-2 bg-red-500 hover:bg-red-600"
                onClick={() => {
                  setIsCreateModalOpen(true);
                  // Could auto-select emergency type
                }}
              >
                <AlertCircle className="w-4 h-4" />
                Report Emergency
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <HelpCircle className="w-4 h-4" />
                Request Help
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Heart className="w-4 h-4" />
                Offer Help
              </Button>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="w-5 h-5 text-yellow-500" />
                Local Heroes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Rahul Sharma', posts: 87, rank: 1 },
                { name: 'Priya Das', posts: 65, rank: 2 },
                { name: 'Volunteer Group A', posts: 52, rank: 3 }
              ].map((hero, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    "font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs",
                    i === 0 && "bg-yellow-100 text-yellow-700",
                    i === 1 && "bg-gray-100 text-gray-700",
                    i === 2 && "bg-orange-100 text-orange-700"
                  )}>
                    {hero.rank}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${hero.name}`} />
                    <AvatarFallback>{hero.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{hero.name}</p>
                    <p className="text-xs text-muted-foreground">{hero.posts} helpful posts</p>
                  </div>
                  {i === 0 && (
                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200 text-[10px]">
                      Top Hero
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Trending Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5" />
                Trending Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { tag: 'flood', count: 45 },
                { tag: 'shelter', count: 32 },
                { tag: 'emergency', count: 28 },
                { tag: 'food', count: 21 },
                { tag: 'electricity', count: 18 }
              ].map((topic, i) => (
                <button
                  key={i}
                  onClick={() => setSearchQuery(topic.tag)}
                  className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <span className="text-sm font-medium">#{topic.tag}</span>
                  <Badge variant="secondary" className="text-xs">
                    {topic.count}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Urgent Needs & Offers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Urgent Needs & Offers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Help Needed */}
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <Badge className="text-xs bg-red-600">NEED</Badge>
                  <span className="text-[10px] text-muted-foreground">5m ago</span>
                </div>
                <p className="text-sm font-medium mb-1">Urgent: Insulin for diabetic patient</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>Saheed Nagar</span>
                </div>
                <Button size="sm" variant="link" className="h-auto p-0 text-red-600 text-xs">
                  Respond to Help Request →
                </Button>
              </div>

              {/* Medical Supplies */}
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <Badge className="text-xs bg-red-600">NEED</Badge>
                  <span className="text-[10px] text-muted-foreground">12m ago</span>
                </div>
                <p className="text-sm font-medium mb-1">Medical supplies needed</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>Unit 4, Cuttack</span>
                </div>
                <Button size="sm" variant="link" className="h-auto p-0 text-red-600 text-xs">
                  Respond to Help Request →
                </Button>
              </div>

              {/* Shelter Offered */}
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <Badge className="text-xs bg-green-600">OFFER</Badge>
                  <span className="text-[10px] text-muted-foreground">20m ago</span>
                </div>
                <p className="text-sm font-medium mb-1">Shelter available for 2 families</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>Khandagiri</span>
                </div>
                <Button size="sm" variant="link" className="h-auto p-0 text-green-600 text-xs">
                  Contact Helper →
                </Button>
              </div>

              {/* Food Distribution */}
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <Badge className="text-xs bg-green-600">OFFER</Badge>
                  <span className="text-[10px] text-muted-foreground">35m ago</span>
                </div>
                <p className="text-sm font-medium mb-1">Free food distribution at community center</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>Bhubaneswar</span>
                </div>
                <Button size="sm" variant="link" className="h-auto p-0 text-green-600 text-xs">
                  Get Details →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Community Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Community Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Be respectful and helpful</p>
              <p>• Verify information before posting</p>
              <p>• Use appropriate post types</p>
              <p>• Add location for local help</p>
              <p>• Report false information</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};

export default Community;
