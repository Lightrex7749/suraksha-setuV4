import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  ThumbsUp, 
  MapPin, 
  Camera, 
  AlertTriangle,
  Award,
  Heart,
  Share2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const CommunityPost = ({ author, time, content, type, likes, location, image }) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${author}`} />
            <AvatarFallback>{author[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-sm">{author}</h4>
            <p className="text-xs text-muted-foreground">{time}</p>
          </div>
        </div>
        <Badge variant={type === 'Emergency' ? 'destructive' : 'secondary'}>
          {type}
        </Badge>
      </div>
      
      <p className="text-sm text-foreground mb-3">{content}</p>
      
      {image && (
        <div className="mb-3 rounded-lg overflow-hidden h-48 bg-muted">
          <img src={image} alt="Report" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
        <button className="flex items-center gap-1 hover:text-primary transition-colors">
          <ThumbsUp className="w-4 h-4" /> {likes}
        </button>
        <button className="flex items-center gap-1 hover:text-primary transition-colors">
          <MessageSquare className="w-4 h-4" /> Comment
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <MapPin className="w-3 h-3" /> {location}
        </div>
      </div>
    </CardContent>
  </Card>
);

const Community = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community Hub</h1>
          <p className="text-muted-foreground">Connect, report, and help your neighbors.</p>
        </div>
        <Button className="gap-2">
          <Heart className="w-4 h-4" /> I Can Help
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Post */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar>
                  <AvatarFallback>ME</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea placeholder="Report an issue or ask for help..." className="min-h-[80px]" />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Camera className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button size="sm">Post Report</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feed Items */}
          <CommunityPost 
            author="Rahul Sharma"
            time="10 mins ago"
            content="Water logging near Sector 5 main road. Avoid this route if possible. Water level is above knee height."
            type="Alert"
            likes={24}
            location="Sector 5, Bhubaneswar"
            image="https://images.unsplash.com/photo-1549888983-47e363b482bc?auto=format&fit=crop&q=80&w=800"
          />
          <CommunityPost 
            author="Priya Das"
            time="1 hour ago"
            content="Fallen tree blocking the entrance to the colony. Electricity wires are also down. Please send help!"
            type="Emergency"
            likes={56}
            location="Unit 4, Cuttack"
          />
          <CommunityPost 
            author="Volunteer Group A"
            time="2 hours ago"
            content="We are distributing food packets and water bottles at the Community Center. Anyone in need please come."
            type="Help"
            likes={142}
            location="Community Center"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Local Heroes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="font-bold text-muted-foreground w-4">{i}</div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>H{i}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Hero User {i}</p>
                    <p className="text-xs text-muted-foreground">50+ verified reports</p>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                    Top 1%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Needs & Offers */}
          <Card>
            <CardHeader>
              <CardTitle>Needs & Offers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-red-600">NEED</span>
                  <span className="text-[10px] text-muted-foreground">5m ago</span>
                </div>
                <p className="text-sm font-medium">Urgent: Insulin for diabetic patient</p>
                <Button size="sm" variant="link" className="h-auto p-0 text-red-600">Contact</Button>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-green-600">OFFER</span>
                  <span className="text-[10px] text-muted-foreground">20m ago</span>
                </div>
                <p className="text-sm font-medium">Shelter available for 2 families</p>
                <Button size="sm" variant="link" className="h-auto p-0 text-green-600">Contact</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Community;
