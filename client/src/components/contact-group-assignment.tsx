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
import { Users, Plus, X } from "lucide-react";

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

  // Fetch current group memberships for selected contacts
  // Use stable string of selected contact IDs to prevent infinite loops
  const selectedContactIdsKey = useMemo(() => 
    [...selectedContactIds].sort().join(','), 
    [selectedContactIds]
  );

  const { data: currentMemberships = [] } = useQuery({
    queryKey: ['/api/contact-memberships', selectedContactIdsKey],
    queryFn: async () => {
      if (selectedContactIds.length === 0) return [];
      
      const groupsResponse = await apiRequest('GET', '/api/contact-groups');
      const groups = await groupsResponse.json() as ContactGroup[];
      
      if (groups.length === 0) return [];
      
      const memberships: GroupMembership[] = [];
      
      for (const group of groups) {
        try {
          const response = await apiRequest('GET', `/api/contact-groups/${group.id}/contacts`);
          const groupContacts = await response.json() as any[];
          
          const matchingContacts = groupContacts.filter((contact: any) => 
            selectedContactIds.includes(contact.id)
          );
          
          if (matchingContacts.length > 0) {
            matchingContacts.forEach((contact: any) => {
              memberships.push({
                contactId: contact.id,
                groupId: group.id,
                groupName: group.name,
                groupColor: group.color
              });
            });
          }
        } catch (error) {
          // Skip groups we can't access
        }
      }
      
      return memberships;
    },
    enabled: isOpen && selectedContactIds.length > 0,
  });

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
      
      // Manually update query cache to avoid invalidation loops
      // Update the specific group's contact list
      const groupCacheKey = [`/api/contact-groups/${groupId}/contacts`];
      const currentGroupContacts = queryClient.getQueryData(groupCacheKey) as any[] || [];
      
      if (added.length > 0) {
        // We don't have full contact data, so just invalidate this specific query
        queryClient.invalidateQueries({ queryKey: groupCacheKey, exact: true });
      }
      if (removed.length > 0) {
        queryClient.invalidateQueries({ queryKey: groupCacheKey, exact: true });
      }
      
      // Update the groups list to reflect new contact counts
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
      
      // Update memberships cache
      queryClient.invalidateQueries({ 
        queryKey: ['/api/contact-memberships', selectedContactIdsKey], 
        exact: true 
      });
      
      // Close modal only after successful operations
      if (added.length > 0 || removed.length > 0) {
        onClose();
      }
    },
  });

  const handleAddToGroup = () => {
    if (!selectedGroupId) return;
    
    bulkMembershipMutation.mutate({
      groupId: selectedGroupId,
      addContactIds: selectedContactIds
    });
  };

  const handleRemoveFromGroup = (groupId: string) => {
    const contactsInGroup = selectedContactIds.filter(contactId =>
      currentMemberships.some(m => m.contactId === contactId && m.groupId === groupId)
    );
    
    if (contactsInGroup.length === 0) return;
    
    bulkMembershipMutation.mutate({
      groupId,
      removeContactIds: contactsInGroup
    });
  };

  const selectedContactsText = selectedContactIds.length === 1 && selectedContactNames.length > 0
    ? selectedContactNames[0]
    : `${selectedContactIds.length} contact${selectedContactIds.length > 1 ? 's' : ''}`;

  // Get unique groups that contain any of the selected contacts
  const groupsWithSelectedContacts = currentMemberships.reduce((acc, membership) => {
    const existing = acc.find(g => g.groupId === membership.groupId);
    if (!existing) {
      const contactCount = currentMemberships.filter(m => m.groupId === membership.groupId).length;
      acc.push({
        groupId: membership.groupId,
        groupName: membership.groupName,
        groupColor: membership.groupColor,
        contactCount
      });
    }
    return acc;
  }, [] as Array<{ groupId: string; groupName: string; groupColor: string; contactCount: number }>);

  const isLoading = bulkMembershipMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Group Assignments</DialogTitle>
          <DialogDescription>
            Add or remove {selectedContactsText} from contact groups
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Group Memberships */}
          {groupsWithSelectedContacts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Current Groups</h4>
              <div className="flex flex-wrap gap-2">
                {groupsWithSelectedContacts.map(group => (
                  <Badge
                    key={group.groupId}
                    style={{ backgroundColor: group.groupColor }}
                    className="text-white flex items-center gap-1 pr-1"
                  >
                    {group.groupName}
                    {group.contactCount < selectedContactIds.length && (
                      <span className="text-xs opacity-75">
                        ({group.contactCount}/{selectedContactIds.length})
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-black/20"
                      onClick={() => handleRemoveFromGroup(group.groupId)}
                      disabled={isLoading}
                      data-testid={`button-remove-group-${group.groupId}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add to New Group */}
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
