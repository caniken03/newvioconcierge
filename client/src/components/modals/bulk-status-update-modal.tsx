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
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw,
  Users,
  AlertTriangle
} from "lucide-react";

interface BulkStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  onStatusUpdated: () => void;
}

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';

const statusOptions: { value: AppointmentStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: 'pending', 
    label: 'Pending', 
    icon: <Clock className="w-4 h-4" />, 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300' 
  },
  { 
    value: 'confirmed', 
    label: 'Confirmed', 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'bg-green-100 text-green-800 border-green-300' 
  },
  { 
    value: 'cancelled', 
    label: 'Cancelled', 
    icon: <XCircle className="w-4 h-4" />, 
    color: 'bg-red-100 text-red-800 border-red-300' 
  },
  { 
    value: 'rescheduled', 
    label: 'Rescheduled', 
    icon: <RefreshCw className="w-4 h-4" />, 
    color: 'bg-blue-100 text-blue-800 border-blue-300' 
  },
];

export default function BulkStatusUpdateModal({ 
  isOpen, 
  onClose, 
  selectedContactIds, 
  onStatusUpdated 
}: BulkStatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | ''>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkStatusUpdateMutation = useMutation({
    mutationFn: async ({ contactIds, status }: { contactIds: string[]; status: AppointmentStatus }) => {
      return await apiRequest('PATCH', '/api/contacts/bulk/status', {
        contactIds,
        appointmentStatus: status
      });
    },
    onSuccess: (data: any) => {
      const updatedCount = data.updatedCount || selectedContactIds.length;
      toast({
        title: "Status Updated Successfully",
        description: `Updated appointment status for ${updatedCount} contacts`,
      });
      onStatusUpdated();
      onClose();
      setSelectedStatus('');
    },
    onError: (error) => {
      toast({
        title: "Status Update Failed",
        description: error instanceof Error ? error.message : "Failed to update contact status",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = () => {
    if (!selectedStatus) {
      toast({
        title: "Status Required",
        description: "Please select a status to apply to the selected contacts",
        variant: "destructive",
      });
      return;
    }

    bulkStatusUpdateMutation.mutate({
      contactIds: selectedContactIds,
      status: selectedStatus
    });
  };

  const handleClose = () => {
    setSelectedStatus('');
    onClose();
  };

  const selectedStatusOption = statusOptions.find(option => option.value === selectedStatus);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Bulk Status Update
          </DialogTitle>
          <DialogDescription>
            Update the appointment status for all selected contacts.
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

          {/* Status Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              New Appointment Status
            </label>
            <Select 
              value={selectedStatus} 
              onValueChange={(value: AppointmentStatus) => setSelectedStatus(value)}
            >
              <SelectTrigger data-testid="select-bulk-status">
                <SelectValue placeholder="Choose appointment status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
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

          {/* Preview Selected Status */}
          {selectedStatus && selectedStatusOption && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${selectedStatusOption.color} font-medium`}
                >
                  <span className="flex items-center gap-1">
                    {selectedStatusOption.icon}
                    {selectedStatusOption.label}
                  </span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Will be applied to {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Warning for Dangerous Actions */}
          {selectedStatus === 'cancelled' && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Cancelling Appointments</p>
                <p className="text-destructive/80">This will mark {selectedContactIds.length} appointments as cancelled.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={bulkStatusUpdateMutation.isPending}
            data-testid="button-cancel-bulk-status"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateStatus}
            disabled={!selectedStatus || bulkStatusUpdateMutation.isPending}
            data-testid="button-confirm-bulk-status"
            className={selectedStatus === 'cancelled' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {bulkStatusUpdateMutation.isPending ? (
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