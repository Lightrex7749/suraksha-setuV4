import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Loader2, Mail, Zap, GraduationCap, Microscope, Users, UserCog } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const Login = () => {
  const navigate = useNavigate();
  const { login, signInWithGoogle, quickJoin, devMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. ';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage += 'No account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage += 'Incorrect password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage += 'Invalid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage += 'Too many failed attempts. Please try again later.';
      } else {
        errorMessage += err.message || 'Please check your credentials.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error('Google sign-in error:', err);
      let errorMessage = 'Google sign-in failed. ';
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage += 'Sign-in popup was closed.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMessage += 'Sign-in was cancelled.';
      } else {
        errorMessage += err.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  // 🔧 DEVELOPMENT: Quick join handler
  const handleQuickJoin = (role) => {
    if (!devMode) return;
    
    try {
      quickJoin(role);
      navigate('/app/dashboard');
    } catch (err) {
      console.error('Quick join error:', err);
      setError('Quick join failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl bg-card/95 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-24 w-24 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center shadow-lg p-4">
              <img src="/main_logo.png" alt="Suraksha Setu" className="h-full w-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">Sign in to access Suraksha Setu</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                name="email"
                placeholder="your.email@example.com" 
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading || googleLoading}
                className="h-11"
                data-testid="login-email-input"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs text-primary hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password"
                name="password"
                placeholder="Enter your password" 
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading || googleLoading}
                className="h-11"
                data-testid="login-password-input"
              />
            </div>

            {error && (
              <Alert variant="destructive" data-testid="login-error-message">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
              disabled={loading || googleLoading}
              data-testid="login-submit-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Sign in with Email
                </>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button"
              variant="outline"
              className="w-full h-11 border-2"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground pt-4">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create one
              </Link>
            </div>
          </form>

          {/* 🔧 DEVELOPMENT MODE: Quick Join Section */}
          {devMode && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <Zap className="w-3 h-3 mr-1" />
                  DEV MODE
                </Badge>
              </div>
              <h3 className="text-sm font-semibold text-center mb-3 text-muted-foreground">
                Quick Join (Testing)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickJoin('developer')}
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-purple-500/10 hover:border-purple-500/50"
                >
                  <UserCog className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-medium">Developer</span>
                  <span className="text-[10px] text-muted-foreground">All Access</span>
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickJoin('admin')}
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-red-500/10 hover:border-red-500/50"
                >
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-medium">Admin</span>
                  <span className="text-[10px] text-muted-foreground">Full Control</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickJoin('scientist')}
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-blue-500/10 hover:border-blue-500/50"
                >
                  <Microscope className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium">Scientist</span>
                  <span className="text-[10px] text-muted-foreground">Data & Analysis</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickJoin('student')}
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-green-500/10 hover:border-green-500/50"
                >
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-medium">Student</span>
                  <span className="text-[10px] text-muted-foreground">Learning Portal</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickJoin('citizen')}
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-gray-500/10 hover:border-gray-500/50 col-span-2"
                >
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium">Citizen</span>
                  <span className="text-[10px] text-muted-foreground">Basic Access</span>
                </Button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-3">
                Click any role to instantly access the app
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
