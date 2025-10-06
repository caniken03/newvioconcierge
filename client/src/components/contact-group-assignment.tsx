import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ContactGroup } from "@/types";
import { Users, Plus } from "lucide-react";

interface ContactGroupAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  selectedContactNames?: string[];
}

interface GroupMembership {
  contactId: string;
  groupId: string;
  groupName: string;
  groupColor: string;
}

export function ContactGroupAssignment({
  isOpen,
  onClose,
  selectedContactIds,
  selectedContactNames = []
}: ContactGroupAssignmentProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Stable handler for dialog close (prevents infinite loop from recreating function)
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);

  // Fetch available contact groups
  const { data: contactGroups = [] } = useQuery({
    queryKey: ['/api/contact-groups'],
    enabled: isOpen,
  }) as { data: ContactGroup[] };

  // Bulk membership mutation using the new endpoint
  const bulkMembershipMutation = useMutation({
    mutationFn: async ({ 
      groupId, 
      addContactIds = [], 
      removeContactIds = [] 
    }: { 
      groupId: string; 
      addContactIds?: string[]; 
      removeContactIds?: string[] 
    }) => {
      const response = await apiRequest('POST', '/api/contact-group-memberships', {
        groupId,
        addContactIds,
        removeContactIds
      });
      return response.json();
    },
    onSuccess: (results, variables) => {
      const { added, removed, errors } = results;
      const { groupId } = variables;
      
      // Show success toasts
      if (added.length > 0) {
        toast({
          title: "Contacts added to group",
          description: `${added.length} contact${added.length > 1 ? 's' : ''} added successfully.`,
        });
      }
      
      if (removed.length > 0) {
        toast({
          title: "Contacts removed from group",
          description: `${removed.length} contact${removed.length > 1 ? 's' : ''} removed successfully.`,
        });
      }
      
      // Show error toasts
      if (errors.length > 0) {
        toast({
          title: "Some operations failed",
          description: `${errors.length} operation${errors.length > 1 ? 's' : ''} could not be completed.`,
          variant: "destructive",
        });
      }
      
      // CRITICAL: Close modal FIRST before any cache operations
      if (added.length > 0 || removed.length > 0) {
        onClose();
      }
      
      // Schedule cache updates AFTER modal closes (prevent invalidation loops)
      setTimeout(() => {
        // Update the groups list contact counts manually
        const groupsKey = ['/api/contact-groups'];
        const currentGroups = queryClient.getQueryData(groupsKey) as ContactGroup[] || [];
        const updatedGroups = currentGroups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              contactCount: g.contactCount + added.length - removed.length
            };
          }
          return g;
        });
        queryClient.setQueryData(groupsKey, updatedGroups);
        
        // Invalidate only the specific queries that need fresh data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/contact-groups/${groupId}/contacts`], 
          exact: true 
        });
      }, 100);
    },
  });

  const handleAddToGroup = () => {
    if (!selectedGroupId) return;
    
    bulkMembershipMutation.mutate({
      groupId: selectedGroupId,
      addContactIds: selectedContactIds
    });
  };

  const selectedContactsText = selectedContactIds.length === 1 && selectedContactNames.length > 0
    ? selectedContactNames[0]
    : `${selectedContactIds.length} contact${selectedContactIds.length > 1 ? 's' : ''}`;

  const isLoading = bulkMembershipMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Group</DialogTitle>
          <DialogDescription>
            Add {selectedContactsText} to a contact group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add to Group */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Add to Group</h4>
            <div className="flex gap-2">
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="flex-1" data-testid="select-group">
                  <SelectValue placeholder="Select a group..." />
                </SelectTrigger>
                <SelectContent>
                  {contactGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                        <span className="text-muted-foreground text-xs">
                          ({group.contactCount})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={handleAddToGroup}
                disabled={!selectedGroupId || isLoading}
                data-testid="button-add-to-group"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {selectedContactIds.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No contacts selected</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContactGroupAssignment;
