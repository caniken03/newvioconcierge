import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'super_admin' | 'client_admin' | 'client_user'>('super_admin');
  
  const { login, loginLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password, role });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 flex items-center justify-center p-4">
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                data-testid="input-email"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="input-password"
                className="w-full"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Login As</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as any)} className="space-y-2">
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <RadioGroupItem value="super_admin" id="super_admin" data-testid="role-super-admin" />
                  <Label htmlFor="super_admin" className="flex-1 cursor-pointer">
                    <span className="font-medium text-sm">Super Administrator</span>
                    <p className="text-xs text-muted-foreground">Full platform access</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <RadioGroupItem value="client_admin" id="client_admin" data-testid="role-client-admin" />
                  <Label htmlFor="client_admin" className="flex-1 cursor-pointer">
                    <span className="font-medium text-sm">Client Administrator</span>
                    <p className="text-xs text-muted-foreground">Business account management</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <RadioGroupItem value="client_user" id="client_user" data-testid="role-client-user" />
                  <Label htmlFor="client_user" className="flex-1 cursor-pointer">
                    <span className="font-medium text-sm">Client User</span>
                    <p className="text-xs text-muted-foreground">Staff member access</p>
                  </Label>
                </div>
              </RadioGroup>
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

          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-primary hover:underline">
              Forgot your password?
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
