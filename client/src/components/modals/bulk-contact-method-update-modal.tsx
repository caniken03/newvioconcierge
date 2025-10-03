import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Mail,
  MessageSquare,
  Users,
  RefreshCw
} from "lucide-react";

interface BulkContactMethodUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  onContactMethodUpdated: () => void;
}

type ContactMethod = 'phone' | 'sms' | 'any';

const contactMethodOptions: { value: ContactMethod; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: 'phone', 
    label: 'Phone Call', 
    icon: <Phone className="w-4 h-4" />, 
    color: 'bg-blue-100 text-blue-800 border-blue-300' 
  },
  { 
    value: 'sms', 
    label: 'SMS/Text', 
    icon: <MessageSquare className="w-4 h-4" />, 
    color: 'bg-purple-100 text-purple-800 border-purple-300' 
  },
  { 
    value: 'any', 
    label: 'Any Method', 
    icon: <Phone className="w-4 h-4" />, 
    color: 'bg-gray-100 text-gray-800 border-gray-300' 
  },
];

export default function BulkContactMethodUpdateModal({ 
  isOpen, 
  onClose, 
  selectedContactIds, 
  onContactMethodUpdated 
}: BulkContactMethodUpdateModalProps) {
  const [selectedContactMethod, setSelectedContactMethod] = useState<ContactMethod | ''>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkContactMethodUpdateMutation = useMutation({
    mutationFn: async ({ contactIds, contactMethod }: { contactIds: string[]; contactMethod: ContactMethod }) => {
      return await apiRequest('PATCH', '/api/contacts/bulk/contact-method', {
        contactIds,
        preferredContactMethod: contactMethod
      });
    },
    onSuccess: (data: any) => {
      const updatedCount = data.updatedCount || selectedContactIds.length;
      toast({
        title: "Contact Method Updated Successfully",
        description: `Updated preferred contact method for ${updatedCount} contacts`,
      });
      onContactMethodUpdated();
      onClose();
      setSelectedContactMethod('');
    },
    onError: (error) => {
      toast({
        title: "Contact Method Update Failed",
        description: error instanceof Error ? error.message : "Failed to update contact method",
        variant: "destructive",
      });
    },
  });

  const handleUpdateContactMethod = () => {
    if (!selectedContactMethod) {
      toast({
        title: "Contact Method Required",
        description: "Please select a contact method to apply to the selected contacts",
        variant: "destructive",
      });
      return;
    }

    bulkContactMethodUpdateMutation.mutate({
      contactIds: selectedContactIds,
      contactMethod: selectedContactMethod
    });
  };

  const handleClose = () => {
    setSelectedContactMethod('');
    onClose();
  };

  const selectedContactMethodOption = contactMethodOptions.find(option => option.value === selectedContactMethod);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Bulk Contact Method Update
          </DialogTitle>
          <DialogDescription>
            Update the preferred contact method for all selected contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Contacts Info */}
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Contact Method Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Preferred Contact Method
            </label>
            <Select 
              value={selectedContactMethod} 
              onValueChange={(value: ContactMethod) => setSelectedContactMethod(value)}
            >
              <SelectTrigger data-testid="select-bulk-contact-method">
                <SelectValue placeholder="Choose contact method" />
              </SelectTrigger>
              <SelectContent>
                {contactMethodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Selected Contact Method */}
          {selectedContactMethod && selectedContactMethodOption && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${selectedContactMethodOption.color} font-medium`}
                >
                  <span className="flex items-center gap-1">
                    {selectedContactMethodOption.icon}
                    {selectedContactMethodOption.label}
                  </span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Will be applied to {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Info about SMS requirements */}
          {selectedContactMethod === 'sms' && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Contact Method Requirements</p>
                <p className="text-blue-700">
                  Contacts will need valid phone numbers for SMS delivery
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={bulkContactMethodUpdateMutation.isPending}
            data-testid="button-cancel-bulk-contact-method"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateContactMethod}
            disabled={!selectedContactMethod || bulkContactMethodUpdateMutation.isPending}
            data-testid="button-confirm-bulk-contact-method"
          >
            {bulkContactMethodUpdateMutation.isPending ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Updating...
              </div>
            ) : (
              `Update ${selectedContactIds.length} Contact${selectedContactIds.length > 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}