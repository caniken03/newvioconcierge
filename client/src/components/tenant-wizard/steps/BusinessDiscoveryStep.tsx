import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Building2, Mail, User } from "lucide-react";

const businessDiscoverySchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  companyName: z.string().optional(),
  contactEmail: z.string().email("Valid email address is required"),
});

interface BusinessDiscoveryStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

export default function BusinessDiscoveryStep({ data, onUpdate, onNext }: BusinessDiscoveryStepProps) {
  const [isValidating, setIsValidating] = useState(false);

  const form = useForm({
    resolver: zodResolver(businessDiscoverySchema),
    defaultValues: {
      businessName: data.businessName || "",
      companyName: data.companyName || "",
      contactEmail: data.contactEmail || "",
    },
  });

  const onSubmit = async (formData: any) => {
    setIsValidating(true);
    
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onUpdate(formData);
    onNext();
    setIsValidating(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Business Discovery</h3>
        <p className="text-muted-foreground">
          Let's start by gathering basic information about the business we're setting up
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Downtown Medical Center, Elite Hair Studio"
                        data-testid="input-business-name"
                      />
                    </FormControl>
                    <FormDescription>
                      This name will be used in voice calls to identify the business
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Company Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="If different from business name (optional)"
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Legal company name for billing and administrative purposes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Contact Email *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email"
                        placeholder="admin@business.com"
                        data-testid="input-contact-email"
                      />
                    </FormControl>
                    <FormDescription>
                      Primary business email for system notifications and support
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isValidating}
                  data-testid="button-next-business-discovery"
                >
                  {isValidating ? "Validating..." : "Continue"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}