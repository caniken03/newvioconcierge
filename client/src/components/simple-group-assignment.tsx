import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ContactGroup } from "@/types";
import { UserPlus } from "lucide-react";

interface SimpleGroupAssignmentProps {
  contactId: string;
  contactName: string;
  groups: ContactGroup[];
  onSuccess?: () => void;
}

export function SimpleGroupAssignment({
  contactId,
  contactName,
  groups,
  onSuccess
}: SimpleGroupAssignmentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToGroup = async (groupId: string, groupName: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Use the bulk endpoint for consistency
      const response = await apiRequest('POST', '/api/contact-group-memberships', {
        groupId,
        addContactIds: [contactId],
        removeContactIds: []
      });
      
      const result = await response.json();
      
      if (result.added && result.added.length > 0) {
        toast({
          title: "Success",
          description: `Added ${contactName} to ${groupName}`,
        });
        
        // Simple callback - no complex state management
        if (onSuccess) {
          onSuccess();
        }
      } else if (result.errors && result.errors.length > 0) {
        const error = result.errors[0];
        if (error.error.includes('already in')) {
          toast({
            title: "Already in group",
            description: `${contactName} is already in ${groupName}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.error,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Failed to add to group:', error);
      toast({
        title: "Failed to add to group",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isLoading}
          data-testid={`button-add-to-group-${contactId}`}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Add to Group</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groups.map((group) => (
          <DropdownMenuItem
            key={group.id}
            onClick={() => handleAddToGroup(group.id, group.name)}
            disabled={isLoading}
            data-testid={`add-to-group-${group.id}`}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: group.color }}
              />
              <span>{group.name}</span>
              <span className="text-muted-foreground text-xs ml-auto">
                ({group.contactCount})
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SimpleGroupAssignment;