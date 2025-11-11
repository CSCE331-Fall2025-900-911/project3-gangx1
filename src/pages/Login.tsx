import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // In production, this would use Google OAuth2
      // For demo purposes, we'll simulate authentication
      const user = await api.getCurrentUser();
      setUser(user);
      
      toast({
        title: 'Login successful',
        description: `Welcome ${user.role}!`,
      });

      // Route based on role
      if (user.role === 'manager') {
        navigate('/manager');
      } else {
        navigate('/cashier');
      }
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Sharetea</h1>
          <p className="text-xl text-muted-foreground">Employee Sign In</p>
        </div>

        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full touch-target"
          size="lg"
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </Button>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Customer? Visit the{' '}
            <button
              onClick={() => navigate('/kiosk')}
              className="text-primary hover:underline font-medium"
            >
              self-service kiosk
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
