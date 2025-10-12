import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Shield } from "lucide-react";
import ForgotPasswordModal from "@/components/modals/forgot-password-modal";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  
  const { login, loginLoading } = useAuth();

  // Enhanced input validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }
    if (password.length < 1) {
      setPasswordError("Password cannot be empty");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs before submission
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    // SECURITY FIX: No role sent - server determines role from user database
    login({ email: email.trim().toLowerCase(), password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 dark:from-primary/10 dark:to-secondary/5 flex items-center justify-center p-4 relative">
      {/* Theme Toggle in Top Right Corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-xl mb-4">
              <i className="fas fa-phone-volume text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">VioConcierge</h1>
            <p className="text-muted-foreground">Intelligent Voice Appointment Management</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={() => validateEmail(email)}
                placeholder="your@email.com"
                required
                data-testid="input-email"
                className={`w-full ${emailError ? 'border-destructive focus:border-destructive' : ''}`}
                autoComplete="email"
                spellCheck="false"
                maxLength={255}
              />
              {emailError && (
                <p className="text-xs text-destructive mt-1" data-testid="error-email">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="Enter your password"
                  required
                  data-testid="input-password"
                  className={`w-full pr-10 ${passwordError ? 'border-destructive focus:border-destructive' : ''}`}
                  autoComplete="current-password"
                  maxLength={128}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordError && (
                <p className="text-xs text-destructive mt-1" data-testid="error-password">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-accent/50 border border-accent rounded-lg p-3 flex items-start space-x-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                Your access level will be automatically determined based on your account. All login attempts are monitored for security.
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginLoading}
              data-testid="button-signin"
            >
              {loginLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Signing In...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={() => setIsForgotPasswordOpen(true)}
              className="text-sm text-primary hover:underline block w-full"
              data-testid="link-forgot-password"
            >
              Forgot your password?
            </button>
            <Link href="/privacy-policy">
              <a className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full" data-testid="link-privacy-policy">
                Privacy Policy
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
}
