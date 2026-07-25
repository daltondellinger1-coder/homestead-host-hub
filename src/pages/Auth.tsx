import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mountain, Wrench, Building2, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { setStoredLoginLane, type LoginLane } from '@/lib/roleRouting';

function getLaneFromPath(pathname: string): LoginLane | null {
  if (pathname.includes('/maintenance')) return 'maintenance';
  if (pathname.includes('/cleaner')) return 'cleaner';
  if (pathname.includes('/property-manager')) return 'property-manager';
  return null;
}

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const lane = getLaneFromPath(location.pathname);
  const isRecovery = new URLSearchParams(location.search).get('recovery') === '1';
  const [isLogin, setIsLogin] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!lane) {
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-xl bg-secondary/15 mb-3">
              <Mountain className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">Homestead Hill</h1>
            <p className="text-xs text-muted-foreground font-body uppercase tracking-widest mt-1">Choose your portal</p>
          </div>

          <div className="grid gap-3">
            <Link to="/auth/property-manager" onClick={() => setStoredLoginLane('property-manager')}>
              <Button className="w-full h-auto justify-start gap-3 p-4 gold-gradient border-0 text-background font-semibold font-body hover:opacity-90">
                <Building2 className="h-5 w-5" />
                <span className="text-left">
                  <span className="block">Property Manager Login</span>
                  <span className="block text-xs opacity-80 font-normal">Full Host Hub dashboard, units, money, requests</span>
                </span>
              </Button>
            </Link>
            <Link to="/auth/maintenance" onClick={() => setStoredLoginLane('maintenance')}>
              <Button variant="outline" className="w-full h-auto justify-start gap-3 p-4 bg-card/60">
                <Wrench className="h-5 w-5 text-secondary" />
                <span className="text-left">
                  <span className="block">Maintenance Login</span>
                  <span className="block text-xs text-muted-foreground font-normal">Work orders only — no financial/property dashboard</span>
                </span>
              </Button>
            </Link>
            <Link to="/auth/cleaner" onClick={() => setStoredLoginLane('cleaner')}>
              <Button variant="outline" className="w-full h-auto justify-start gap-3 p-4 bg-card/60">
                <Sparkles className="h-5 w-5 text-secondary" />
                <span className="text-left">
                  <span className="block">Cleaner Login</span>
                  <span className="block text-xs text-muted-foreground font-normal">Assigned cleanings, deadlines, photos, and issue reports</span>
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStoredLoginLane(lane);

    try {
      if (isRecovery) {
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('This password-reset link is invalid or has expired.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success('Password updated. You are signed in.');
        navigate('/', { replace: true });
      } else if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${location.pathname}?recovery=1`,
        });
        if (error) throw error;
        toast.success('Check your email for a password-reset link.');
        setForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created. Your assigned portal will open now.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const isMaintenance = lane === 'maintenance';
  const isCleaner = lane === 'cleaner';
  const formTitle = isRecovery
    ? 'Set a new password'
    : forgotPassword
      ? 'Reset your password'
      : isLogin
        ? 'Sign In'
        : 'Create Invited Account';

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Change portal
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-xl bg-secondary/15 mb-3">
            {isMaintenance ? <Wrench className="h-8 w-8 text-secondary" /> : isCleaner ? <Sparkles className="h-8 w-8 text-secondary" /> : <Mountain className="h-8 w-8 text-secondary" />}
          </div>
          <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">Homestead Hill</h1>
          <p className="text-xs text-muted-foreground font-body uppercase tracking-widest mt-1">
            {isMaintenance ? 'Maintenance Portal' : isCleaner ? 'Cleaner Portal' : 'Property Manager'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-heading font-semibold text-center">{formTitle}</h2>

          {!isRecovery && (
            <div className="space-y-2">
              <Label htmlFor="email" className="font-body text-sm">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="font-body" />
            </div>
          )}

          {!forgotPassword && (
            <div className="space-y-2">
              <Label htmlFor="password" className="font-body text-sm">
                {isRecovery ? 'New password' : 'Password'}
              </Label>
              <Input id="password" type="password" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={10} className="font-body" />
            </div>
          )}

          {isRecovery && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-body text-sm">Confirm new password</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={10} className="font-body" />
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full gold-gradient border-0 text-background font-semibold font-body hover:opacity-90">
            {loading
              ? 'Please wait...'
              : isRecovery
                ? 'Save new password'
                : forgotPassword
                  ? 'Email reset link'
                  : isLogin
                    ? 'Sign In'
                    : 'Create Account'}
          </Button>

          {!isRecovery && (
            <>
              <p className="text-center text-xs text-muted-foreground font-body">
                {forgotPassword ? 'Remembered your password?' : isLogin ? 'Have a team invitation?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  className="text-secondary hover:underline"
                  onClick={() => {
                    if (forgotPassword) setForgotPassword(false);
                    else setIsLogin(!isLogin);
                  }}
                >
                  {forgotPassword ? 'Sign In' : isLogin ? 'Create account' : 'Sign In'}
                </button>
              </p>
              {isLogin && !forgotPassword && (
                <button type="button" className="block w-full text-center text-xs text-secondary hover:underline" onClick={() => setForgotPassword(true)}>
                  Forgot password?
                </button>
              )}
              <p className="text-center text-[11px] text-muted-foreground font-body">
                Portal access is assigned by Dalton or Briana.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
