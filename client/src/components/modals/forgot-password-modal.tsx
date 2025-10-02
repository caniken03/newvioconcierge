import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, CheckCircle2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address").trim().toLowerCase(),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { toast } = useToast();
  const [resetUrl, setResetUrl] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const response = await apiRequest('POST', '/api/auth/forgot-password', data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      // In development, show the reset URL
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
      toast({
        title: "Reset link sent",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message || "Unable to process password reset request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ForgotPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setResetUrl("");
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Forgot Password
          </DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>

        {!isSuccess ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your@email.com"
                        disabled={resetPasswordMutation.isPending}
                        data-testid="input-reset-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-cancel-reset"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-send-reset-link"
                  className="flex-1"
                >
                  {resetPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Reset link sent!</p>
                <p className="mt-1">Check your email for instructions to reset your password.</p>
              </div>
            </div>

            {resetUrl && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-medium text-amber-800 mb-2">Development Only - Reset Link:</p>
                <a
                  href={resetUrl}
                  className="text-xs text-primary hover:underline break-all"
                  data-testid="link-reset-url"
                >
                  {resetUrl}
                </a>
              </div>
            )}

            <Button
              onClick={handleClose}
              className="w-full"
              data-testid="button-close-success"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
