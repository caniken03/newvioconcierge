import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, User, Mail, Lock, Shield } from "lucide-react";

const adminSetupSchema = z.object({
  email: z.string().email("Valid email address is required"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain lowercase, uppercase, and number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface AdminSetupStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function AdminSetupStep({ data, onUpdate, onNext, onPrevious }: AdminSetupStepProps) {
  const [isValidating, setIsValidating] = useState(false);

  const form = useForm({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: {
      email: data.adminUser?.email || "",
      fullName: data.adminUser?.fullName || "",
      password: data.adminUser?.password || "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (formData: any) => {
    setIsValidating(true);
    
    // Simulate email validation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const { confirmPassword, ...adminData } = formData;
    onUpdate({ adminUser: adminData });
    onNext();
    setIsValidating(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <User className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Administrator Account Setup</h3>
        <p className="text-muted-foreground">
          Create a secure administrator account for this tenant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Admin User Account</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Administrator Full Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="John Smith"
                        data-testid="input-admin-fullname"
                      />
                    </FormControl>
                    <FormDescription>
                      The person who will manage this tenant's account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Administrator Email *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email"
                        placeholder="admin@business.com"
                        data-testid="input-admin-email"
                      />
                    </FormControl>
                    <FormDescription>
                      This email will be used to log into the admin dashboard
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password"
                          placeholder="Secure password"
                          data-testid="input-admin-password"
                        />
                      </FormControl>
                      <FormDescription>
                        Must include uppercase, lowercase, and number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password"
                          placeholder="Confirm password"
                          data-testid="input-admin-confirm-password"
                        />
                      </FormControl>
                      <FormDescription>
                        Re-enter the password to confirm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Security Information</h4>
                      <p className="text-xs text-blue-700 mt-1">
                        This administrator will have full access to manage the tenant's contacts, appointments, 
                        and system settings. They can also create additional users for their organization.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onPrevious} data-testid="button-previous-admin">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button 
                  type="submit" 
                  disabled={isValidating}
                  data-testid="button-next-admin"
                >
                  {isValidating ? "Validating Email..." : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}