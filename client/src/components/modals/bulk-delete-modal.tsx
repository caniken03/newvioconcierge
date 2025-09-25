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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2,
  Users,
  RefreshCw,
  AlertTriangle,
  Shield
} from "lucide-react";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  onContactsDeleted: () => void;
}

export default function BulkDeleteModal({ 
  isOpen, 
  onClose, 
  selectedContactIds, 
  onContactsDeleted 
}: BulkDeleteModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [acknowledgeWarning, setAcknowledgeWarning] = useState(false);
  const [preserveHistory, setPreserveHistory] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const expectedConfirmationText = `DELETE ${selectedContactIds.length} CONTACTS`;

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ contactIds, preserveHistory }: { contactIds: string[]; preserveHistory: boolean }) => {
      return await apiRequest('DELETE', '/api/contacts/bulk', {
        contactIds,
        preserveHistory
      });
    },
    onSuccess: (data: any) => {
      const deletedCount = data.deletedCount || selectedContactIds.length;
      toast({
        title: "Contacts Deleted Successfully",
        description: `Deleted ${deletedCount} contacts${preserveHistory ? ' (call history preserved)' : ' (completely removed)'}`,
      });
      onContactsDeleted();
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete contacts",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setConfirmationText('');
    setAcknowledgeWarning(false);
    setPreserveHistory(true);
  };

  const handleDeleteContacts = () => {
    if (confirmationText !== expectedConfirmationText) {
      toast({
        title: "Confirmation Required",
        description: "Please type the exact confirmation text to proceed",
        variant: "destructive",
      });
      return;
    }

    if (!acknowledgeWarning) {
      toast({
        title: "Acknowledgment Required",
        description: "Please acknowledge the warning before proceeding",
        variant: "destructive",
      });
      return;
    }

    bulkDeleteMutation.mutate({
      contactIds: selectedContactIds,
      preserveHistory
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isConfirmationValid = confirmationText === expectedConfirmationText;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Bulk Delete Contacts
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete the selected contacts. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Contacts Info */}
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <Users className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''} selected for deletion
            </span>
          </div>

          {/* Critical Warning */}
          <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-red-800">Critical Warning</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• This will permanently delete {selectedContactIds.length} contacts</li>
                  <li>• All contact information will be lost</li>
                  <li>• Future appointments may be affected</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Preservation Option */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Data Preservation</label>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="preserve-history"
                checked={preserveHistory}
                onCheckedChange={(checked) => setPreserveHistory(checked as boolean)}
                data-testid="checkbox-preserve-history"
              />
              <div className="space-y-1">
                <label 
                  htmlFor="preserve-history" 
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-blue-600" />
                  Preserve call history and analytics
                </label>
                <p className="text-xs text-muted-foreground">
                  Keep call logs and session data for reporting, but remove personal contact information
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Text */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Type to confirm: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{expectedConfirmationText}</code>
            </label>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type the confirmation text exactly"
              className={`font-mono ${isConfirmationValid ? 'border-green-500 bg-green-50' : 'border-red-300'}`}
              data-testid="input-delete-confirmation"
            />
          </div>

          {/* Final Acknowledgment */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="acknowledge-warning"
              checked={acknowledgeWarning}
              onCheckedChange={(checked) => setAcknowledgeWarning(checked as boolean)}
              data-testid="checkbox-acknowledge-warning"
            />
            <label 
              htmlFor="acknowledge-warning" 
              className="text-sm cursor-pointer text-gray-700"
            >
              I understand this action is permanent and cannot be undone
            </label>
          </div>

          {/* Preview */}
          {isConfirmationValid && acknowledgeWarning && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Action Preview</label>
              <Badge variant="destructive" className="font-medium">
                Will delete {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''}
                {preserveHistory ? ' (preserving call history)' : ' (complete removal)'}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={bulkDeleteMutation.isPending}
            data-testid="button-cancel-bulk-delete"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDeleteContacts}
            disabled={!isConfirmationValid || !acknowledgeWarning || bulkDeleteMutation.isPending}
            data-testid="button-confirm-bulk-delete"
          >
            {bulkDeleteMutation.isPending ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Deleting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete {selectedContactIds.length} Contact{selectedContactIds.length > 1 ? 's' : ''}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}