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
  Globe,
  Users,
  RefreshCw,
  Clock
} from "lucide-react";

interface BulkTimezoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  onTimezoneUpdated: () => void;
}

// Common timezones with their display names
const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7/-6' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)', offset: 'UTC-7' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)', offset: 'UTC-9/-8' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10' },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: 'UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Central European Time', offset: 'UTC+1/+2' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'UTC+9' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: 'UTC+8' },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: 'UTC+5:30' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: 'UTC+10/+11' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'UTC+0' },
];

export default function BulkTimezoneModal({ 
  isOpen, 
  onClose, 
  selectedContactIds, 
  onTimezoneUpdated 
}: BulkTimezoneModalProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkTimezoneUpdateMutation = useMutation({
    mutationFn: async ({ contactIds, timezone }: { contactIds: string[]; timezone: string }) => {
      return await apiRequest('PATCH', '/api/contacts/bulk/timezone', {
        contactIds,
        timezone
      });
    },
    onSuccess: (data: any) => {
      const updatedCount = data.updatedCount || selectedContactIds.length;
      toast({
        title: "Timezone Updated Successfully",
        description: `Updated timezone for ${updatedCount} contacts`,
      });
      onTimezoneUpdated();
      onClose();
      setSelectedTimezone('');
    },
    onError: (error) => {
      toast({
        title: "Timezone Update Failed",
        description: error instanceof Error ? error.message : "Failed to update contact timezone",
        variant: "destructive",
      });
    },
  });

  const handleUpdateTimezone = () => {
    if (!selectedTimezone) {
      toast({
        title: "Timezone Required",
        description: "Please select a timezone to apply to the selected contacts",
        variant: "destructive",
      });
      return;
    }

    bulkTimezoneUpdateMutation.mutate({
      contactIds: selectedContactIds,
      timezone: selectedTimezone
    });
  };

  const handleClose = () => {
    setSelectedTimezone('');
    onClose();
  };

  const selectedTimezoneOption = timezoneOptions.find(option => option.value === selectedTimezone);

  // Get current time in selected timezone for preview
  const getCurrentTimeInTimezone = (timezone: string) => {
    try {
      return new Date().toLocaleString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid timezone';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Bulk Timezone Update
          </DialogTitle>
          <DialogDescription>
            Update the timezone for all selected contacts to ensure accurate appointment scheduling.
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

          {/* Timezone Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              New Timezone
            </label>
            <Select 
              value={selectedTimezone} 
              onValueChange={(value: string) => setSelectedTimezone(value)}
            >
              <SelectTrigger data-testid="select-bulk-timezone">
                <SelectValue placeholder="Choose timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.offset}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Selected Timezone */}
          {selectedTimezone && selectedTimezoneOption && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="bg-blue-100 text-blue-800 border-blue-300 font-medium"
                  >
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectedTimezoneOption.label}
                    </span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selectedTimezoneOption.offset}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Current time: {getCurrentTimeInTimezone(selectedTimezone)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Will be applied to {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Important Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Appointment Scheduling Impact</p>
              <p className="text-blue-700">
                Updating timezones will affect future appointment reminders and scheduling calculations for these contacts.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={bulkTimezoneUpdateMutation.isPending}
            data-testid="button-cancel-bulk-timezone"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateTimezone}
            disabled={!selectedTimezone || bulkTimezoneUpdateMutation.isPending}
            data-testid="button-confirm-bulk-timezone"
          >
            {bulkTimezoneUpdateMutation.isPending ? (
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