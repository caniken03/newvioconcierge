import { useState, useMemo, useEffect } from "react";
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
  // DEBUG: Log renders to find infinite loop source
  console.log('[ContactGroupAssignment] RENDER', {
    isOpen,
    selectedContactIdsCount: selectedContactIds.length,
    selectedContactIds: selectedContactIds.slice(0, 3),
    stack: new Error().stack?.split('\n').slice(0, 5).join('\n')
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // DEBUG: React Query subscription to track query updates
  useEffect(() => {
    if (!isOpen) return;
    
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated') {
        console.log('[RQ] Query updated:', event.query.queryKey);
      }
    });
    return unsub;
  }, [isOpen]);

  // Fetch available contact groups
  const { data: contactGroups = [] } = useQuery({
    queryKey: ['/api/contact-groups'],
    enabled: isOpen,
  }) as { data: ContactGroup[] };

  // Fetch current group memberships for selected contacts
  // Use stable string of selected contact IDs to prevent infinite loops
  // IMPORTANT: Clone before sort to avoid mutating the prop array
  const selectedContactIdsKey = useMemo(() => 
    [...selectedContactIds].sort().join(','), 
    [selectedContactIds]
  );

  const { data: currentMemberships = [] } = useQuery({
    queryKey: ['/api/contact-memberships', selectedContactIdsKey],
    queryFn: async () => {
      if (selectedContactIds.length === 0) return [];
      
      // Fetch groups fresh inside the query function
      const groupsResponse = await apiRequest('GET', '/api/contact-groups');
      const groups = await groupsResponse.json() as ContactGroup[];
      
      if (groups.length === 0) return [];
      
      // Get memberships for all selected contacts
      const memberships: GroupMembership[] = [];
      
      for (const group of groups) {
        try {
          const response = await apiRequest('GET', `/api/contact-groups/${group.id}/contacts`);
          const groupContacts = await response.json() as any[];
          
          // Check which of our selected contacts are in this group
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

  // Add contacts to group mutation
  const addToGroupMutation = useMutation({
    mutationFn: async ({ groupId, contactIds }: { groupId: string; contactIds: string[] }) => {
      const results = [];
      for (const contactId of contactIds) {
        try {
          const result = await apiRequest('POST', `/api/contact-groups/${groupId}/contacts`, {
            contactId
          });
          results.push({ contactId, success: true, result });
        } catch (error) {
          results.push({ 
            contactId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      return { results, groupId };
    },
    onSuccess: ({ results, groupId }) => {
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Show success toasts
      if (successful.length > 0) {
        toast({
          title: "Contacts added to group",
          description: `${successful.length} contact${successful.length > 1 ? 's' : ''} added successfully.`,
        });
      }
      
      // Show error toasts
      if (failed.length > 0) {
        const alreadyInGroup = failed.filter(f => f.error?.includes('already in'));
        const otherErrors = failed.filter(f => !f.error?.includes('already in'));
        
        if (alreadyInGroup.length > 0) {
          toast({
            title: "Some contacts already in group",
            description: `${alreadyInGroup.length} contact${alreadyInGroup.length > 1 ? 's were' : ' was'} already in this group.`,
            variant: "destructive",
          });
        }
        
        if (otherErrors.length > 0) {
          toast({
            title: "Some additions failed",
            description: `${otherErrors.length} contact${otherErrors.length > 1 ? 's' : ''} could not be added.`,
            variant: "destructive",
          });
        }
      }
      
      // Close modal FIRST to prevent feedback loops
      if (successful.length > 0) {
        onClose();
      }
      
      // THEN invalidate queries after a tick (let modal unmount first)
      setTimeout(() => {
        // Narrow invalidations to only affected queries
        queryClient.invalidateQueries({ queryKey: ['/api/contact-groups'], exact: true });
        queryClient.invalidateQueries({ queryKey: ['/api/contact-memberships', selectedContactIdsKey], exact: true });
        queryClient.invalidateQueries({ queryKey: [`/api/contact-groups/${groupId}/contacts`], exact: true });
        queryClient.invalidateQueries({ queryKey: ['/api/all-group-memberships'] });
      }, 0);
    },
  });

  // Remove contacts from group mutation
  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, contactIds }: { groupId: string; contactIds: string[] }) => {
      const results = [];
      for (const contactId of contactIds) {
        try {
          await apiRequest('DELETE', `/api/contact-groups/${groupId}/contacts/${contactId}`);
          results.push({ contactId, success: true });
        } catch (error) {
          results.push({ 
            contactId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      return { results, groupId };
    },
    onSuccess: ({ results, groupId }) => {
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Show toasts
      if (successful.length > 0) {
        toast({
          title: "Contacts removed from group",
          description: `${successful.length} contact${successful.length > 1 ? 's' : ''} removed successfully.`,
        });
      }
      
      if (failed.length > 0) {
        toast({
          title: "Some removals failed",
          description: `${failed.length} contact${failed.length > 1 ? 's' : ''} could not be removed.`,
          variant: "destructive",
        });
      }
      
      // Delay invalidations to let UI update first
      setTimeout(() => {
        // Narrow invalidations to only affected queries
        queryClient.invalidateQueries({ queryKey: ['/api/contact-groups'], exact: true });
        queryClient.invalidateQueries({ queryKey: ['/api/contact-memberships', selectedContactIdsKey], exact: true });
        queryClient.invalidateQueries({ queryKey: [`/api/contact-groups/${groupId}/contacts`], exact: true });
        queryClient.invalidateQueries({ queryKey: ['/api/all-group-memberships'] });
      }, 0);
    },
  });

  const handleAddToGroup = () => {
    if (!selectedGroupId) return;
    
    addToGroupMutation.mutate({
      groupId: selectedGroupId,
      contactIds: selectedContactIds
    });
  };

  const handleRemoveFromGroup = (groupId: string) => {
    const contactsInGroup = selectedContactIds.filter(contactId =>
      currentMemberships.some(m => m.contactId === contactId && m.groupId === groupId)
    );
    
    if (contactsInGroup.length === 0) return;
    
    removeFromGroupMutation.mutate({
      groupId,
      contactIds: contactsInGroup
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

  const isLoading = addToGroupMutation.isPending || removeFromGroupMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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