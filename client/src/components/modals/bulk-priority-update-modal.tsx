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
  Star, 
  StarOff,
  AlertTriangle,
  Users,
  RefreshCw
} from "lucide-react";

interface BulkPriorityUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  onPriorityUpdated: () => void;
}

type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

const priorityOptions: { value: PriorityLevel; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: 'low', 
    label: 'Low Priority', 
    icon: <StarOff className="w-4 h-4" />, 
    color: 'bg-gray-100 text-gray-800 border-gray-300' 
  },
  { 
    value: 'normal', 
    label: 'Normal Priority', 
    icon: <Star className="w-4 h-4" />, 
    color: 'bg-blue-100 text-blue-800 border-blue-300' 
  },
  { 
    value: 'high', 
    label: 'High Priority', 
    icon: <Star className="w-4 h-4" />, 
    color: 'bg-orange-100 text-orange-800 border-orange-300' 
  },
  { 
    value: 'urgent', 
    label: 'Urgent Priority', 
    icon: <AlertTriangle className="w-4 h-4" />, 
    color: 'bg-red-100 text-red-800 border-red-300' 
  },
];

export default function BulkPriorityUpdateModal({ 
  isOpen, 
  onClose, 
  selectedContactIds, 
  onPriorityUpdated 
}: BulkPriorityUpdateModalProps) {
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | ''>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkPriorityUpdateMutation = useMutation({
    mutationFn: async ({ contactIds, priority }: { contactIds: string[]; priority: PriorityLevel }) => {
      return await apiRequest('PATCH', '/api/contacts/bulk/priority', {
        contactIds,
        priorityLevel: priority
      });
    },
    onSuccess: (data: any) => {
      const updatedCount = data.updatedCount || selectedContactIds.length;
      toast({
        title: "Priority Updated Successfully",
        description: `Updated priority level for ${updatedCount} contacts`,
      });
      onPriorityUpdated();
      onClose();
      setSelectedPriority('');
    },
    onError: (error) => {
      toast({
        title: "Priority Update Failed",
        description: error instanceof Error ? error.message : "Failed to update contact priority",
        variant: "destructive",
      });
    },
  });

  const handleUpdatePriority = () => {
    if (!selectedPriority) {
      toast({
        title: "Priority Required",
        description: "Please select a priority level to apply to the selected contacts",
        variant: "destructive",
      });
      return;
    }

    bulkPriorityUpdateMutation.mutate({
      contactIds: selectedContactIds,
      priority: selectedPriority
    });
  };

  const handleClose = () => {
    setSelectedPriority('');
    onClose();
  };

  const selectedPriorityOption = priorityOptions.find(option => option.value === selectedPriority);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Bulk Priority Update
          </DialogTitle>
          <DialogDescription>
            Update the priority level for all selected contacts.
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

          {/* Priority Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              New Priority Level
            </label>
            <Select 
              value={selectedPriority} 
              onValueChange={(value: PriorityLevel) => setSelectedPriority(value)}
            >
              <SelectTrigger data-testid="select-bulk-priority">
                <SelectValue placeholder="Choose priority level" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
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

          {/* Preview Selected Priority */}
          {selectedPriority && selectedPriorityOption && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${selectedPriorityOption.color} font-medium`}
                >
                  <span className="flex items-center gap-1">
                    {selectedPriorityOption.icon}
                    {selectedPriorityOption.label}
                  </span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Will be applied to {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Warning for Urgent Priority */}
          {selectedPriority === 'urgent' && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Urgent Priority Alert</p>
                <p className="text-orange-700">This will mark {selectedContactIds.length} contacts as urgent priority.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={bulkPriorityUpdateMutation.isPending}
            data-testid="button-cancel-bulk-priority"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdatePriority}
            disabled={!selectedPriority || bulkPriorityUpdateMutation.isPending}
            data-testid="button-confirm-bulk-priority"
            className={selectedPriority === 'urgent' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {bulkPriorityUpdateMutation.isPending ? (
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