import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract token from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      if (!token) {
        throw new Error('Invalid reset token');
      }
      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: data.message,
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation('/login');
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message || "Unable to reset password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ResetPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  // If no token, show error
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
                <p className="text-muted-foreground mb-4">
                  This password reset link is invalid or has expired.
                </p>
                <Button onClick={() => setLocation('/login')} data-testid="button-back-to-login">
                  Back to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-xl mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Reset Password</h1>
            <p className="text-muted-foreground">
              {isSuccess ? "Password reset successful!" : "Enter your new password below"}
            </p>
          </div>

          {!isSuccess ? (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    {...form.register("newPassword")}
                    placeholder="Enter new password"
                    disabled={resetPasswordMutation.isPending}
                    className="pr-10"
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-new-password"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.newPassword && (
                  <p className="text-xs text-destructive" data-testid="error-new-password">
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...form.register("confirmPassword")}
                    placeholder="Confirm new password"
                    disabled={resetPasswordMutation.isPending}
                    className="pr-10"
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-password"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive" data-testid="error-confirm-password">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetPasswordMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Resetting...
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Password Reset Complete</p>
                  <p className="mt-1">Redirecting to login page...</p>
                </div>
              </div>
              
              <Button
                onClick={() => setLocation('/login')}
                className="w-full"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
