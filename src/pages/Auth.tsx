import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mountain, Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      toast({
        title: isSignUp ? 'Sign up failed' : 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } else if (isSignUp) {
      toast({
        title: 'Check your email',
        description: 'We sent you a verification link. Please check your inbox.',
      });
    }
  };

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-xl bg-secondary/15 mb-4">
            <Mountain className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
            Homestead Hill
          </h1>
          <p className="text-[11px] text-muted-foreground font-body uppercase tracking-widest mt-1">
            Vincennes, Indiana
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold text-center mb-5">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-body text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10 font-body text-sm bg-muted/40 border-border/60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-body text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 font-body text-sm bg-muted/40 border-border/60"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gold-gradient border-0 text-background font-body font-semibold hover:opacity-90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-muted-foreground font-body hover:text-secondary transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
