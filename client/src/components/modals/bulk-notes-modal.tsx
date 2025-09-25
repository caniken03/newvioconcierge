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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle,
  Users,
  RefreshCw,
  Plus,
  Edit
} from "lucide-react";

interface BulkNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  onNotesUpdated: () => void;
}

export default function BulkNotesModal({ 
  isOpen, 
  onClose, 
  selectedContactIds, 
  onNotesUpdated 
}: BulkNotesModalProps) {
  const [noteText, setNoteText] = useState('');
  const [notesAction, setNotesAction] = useState<'add' | 'replace'>('add');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkNotesUpdateMutation = useMutation({
    mutationFn: async ({ contactIds, notes, action }: { contactIds: string[]; notes: string; action: 'add' | 'replace' }) => {
      return await apiRequest('PATCH', '/api/contacts/bulk/notes', {
        contactIds,
        notes,
        action
      });
    },
    onSuccess: (data: any) => {
      const updatedCount = data.updatedCount || selectedContactIds.length;
      toast({
        title: "Notes Updated Successfully",
        description: `${notesAction === 'add' ? 'Added' : 'Updated'} notes for ${updatedCount} contacts`,
      });
      onNotesUpdated();
      onClose();
      setNoteText('');
      setNotesAction('add');
    },
    onError: (error) => {
      toast({
        title: "Notes Update Failed",
        description: error instanceof Error ? error.message : "Failed to update contact notes",
        variant: "destructive",
      });
    },
  });

  const handleUpdateNotes = () => {
    if (!noteText.trim()) {
      toast({
        title: "Note Required",
        description: "Please enter a note to apply to the selected contacts",
        variant: "destructive",
      });
      return;
    }

    bulkNotesUpdateMutation.mutate({
      contactIds: selectedContactIds,
      notes: noteText.trim(),
      action: notesAction
    });
  };

  const handleClose = () => {
    setNoteText('');
    setNotesAction('add');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Bulk Notes Update
          </DialogTitle>
          <DialogDescription>
            Add or update notes for all selected contacts.
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

          {/* Action Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Notes Action
            </label>
            <div className="flex gap-2">
              <Button
                variant={notesAction === 'add' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotesAction('add')}
                className="flex items-center gap-2"
                data-testid="button-notes-action-add"
              >
                <Plus className="w-4 h-4" />
                Add to existing notes
              </Button>
              <Button
                variant={notesAction === 'replace' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotesAction('replace')}
                className="flex items-center gap-2"
                data-testid="button-notes-action-replace"
              >
                <Edit className="w-4 h-4" />
                Replace all notes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {notesAction === 'add' 
                ? 'This note will be appended to existing notes for each contact'
                : 'This note will replace all existing notes for each contact'
              }
            </p>
          </div>

          {/* Note Text */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Note Content
            </label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note to apply to selected contacts..."
              className="min-h-[100px] resize-none"
              maxLength={500}
              data-testid="textarea-bulk-notes"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Max 500 characters</span>
              <span>{noteText.length}/500</span>
            </div>
          </div>

          {/* Preview */}
          {noteText.trim() && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{noteText.trim()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {notesAction === 'add' ? 'Will be added to' : 'Will replace notes for'} {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          )}

          {/* Warning for Replace Action */}
          {notesAction === 'replace' && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <Edit className="w-4 h-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Replace All Notes</p>
                <p className="text-orange-700">This will completely replace existing notes for {selectedContactIds.length} contacts.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={bulkNotesUpdateMutation.isPending}
            data-testid="button-cancel-bulk-notes"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateNotes}
            disabled={!noteText.trim() || bulkNotesUpdateMutation.isPending}
            data-testid="button-confirm-bulk-notes"
            className={notesAction === 'replace' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {bulkNotesUpdateMutation.isPending ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Updating...
              </div>
            ) : (
              `${notesAction === 'add' ? 'Add Note to' : 'Replace Notes for'} ${selectedContactIds.length} Contact${selectedContactIds.length > 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}