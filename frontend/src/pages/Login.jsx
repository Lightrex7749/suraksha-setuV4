import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access the command center</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input placeholder="Email" type="email" />
          </div>
          <div className="space-y-2">
            <Input placeholder="Password" type="password" />
          </div>
          <Button className="w-full" asChild>
            <Link to="/dashboard">Sign In</Link>
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary underline underline-offset-4">Forgot password?</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
