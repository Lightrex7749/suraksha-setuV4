import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    user_type: 'citizen'
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleUserTypeChange = (value) => {
    setFormData({
      ...formData,
      user_type: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      login(response.access_token, response.user);
      
      // Redirect based on user type
      const redirectMap = {
        student: '/student',
        scientist: '/scientist',
        admin: '/admin',
        citizen: '/dashboard'
      };
      navigate(redirectMap[response.user.user_type] || '/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join Suraksha Setu to access disaster safety features</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                name="name"
                placeholder="Enter your full name" 
                type="text"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                data-testid="register-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                name="email"
                placeholder="Enter your email" 
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                data-testid="register-email-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                name="password"
                placeholder="Create a password" 
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                data-testid="register-password-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user_type">I am a</Label>
              <Select value={formData.user_type} onValueChange={handleUserTypeChange} disabled={loading}>
                <SelectTrigger data-testid="register-usertype-select">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="scientist">Scientist/Researcher</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md" data-testid="register-error-message">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="hover:text-primary underline underline-offset-4">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
