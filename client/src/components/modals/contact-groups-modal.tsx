import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import type { ContactGroup } from "@/types";

interface ContactGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup?: ContactGroup | null;
}

const DEFAULT_COLORS = [
  { value: "#EF4444", label: "Red - High Priority", description: "For urgent or high-priority contacts" },
  { value: "#F59E0B", label: "Orange - Medium Priority", description: "For moderate priority contacts" },
  { value: "#10B981", label: "Green - Standard", description: "For regular contacts and services" },
  { value: "#3B82F6", label: "Blue - Information", description: "For informational or general categories" },
  { value: "#8B5CF6", label: "Purple - Special", description: "For special services or unique categories" },
  { value: "#6B7280", label: "Gray - Archive", description: "For inactive or archived contacts" },
  { value: "#EC4899", label: "Pink - VIP", description: "For VIP clients or premium services" },
  { value: "#14B8A6", label: "Teal - New", description: "For new contacts or first-time clients" },
];

export default function ContactGroupsModal({
  isOpen,
  onClose,
  editingGroup,
}: ContactGroupsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: DEFAULT_COLORS[0].value,
  });
  
  // Update form data when editing group changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editingGroup?.name || "",
        description: editingGroup?.description || "",
        color: editingGroup?.color || DEFAULT_COLORS[0].value,
      });
    }
  }, [isOpen, editingGroup]);
  
  const [errors, setErrors] = useState({
    name: "",
  });

  // Create contact group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string }) => {
      return await apiRequest('POST', '/api/contact-groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-groups'] });
      toast({
        title: "Success",
        description: "Contact group created successfully. Add members using the UserPlus button in the contacts table.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update contact group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string }) => {
      return await apiRequest('PATCH', `/api/contact-groups/${editingGroup!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-groups'] });
      toast({
        title: "Success",
        description: "Contact group updated successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFormData({ name: "", description: "", color: DEFAULT_COLORS[0].value });
    setErrors({ name: "" });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors = { name: "" };
    if (!formData.name.trim()) {
      newErrors.name = "Group name is required";
    } else if (formData.name.length > 50) {
      newErrors.name = "Group name must be 50 characters or less";
    }
    
    setErrors(newErrors);
    
    if (newErrors.name) return;
    
    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
    };
    
    if (editingGroup) {
      updateGroupMutation.mutate(submitData);
    } else {
      createGroupMutation.mutate(submitData);
    }
  };

  const isLoading = createGroupMutation.isPending || updateGroupMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {editingGroup ? "Edit Contact Group" : "Create Contact Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Update the contact group details." 
                : "Create a new group to organize your contacts and streamline communication."
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name*</Label>
              <Input
                id="group-name"
                type="text"
                placeholder="e.g., VIP Clients, First Time Visitors"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-group-name"
                className={errors.name ? "border-red-500" : ""}
                maxLength={50}
              />
              {errors.name && (
                <p className="text-sm text-red-600" data-testid="error-group-name">
                  {errors.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/50 characters
              </p>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                placeholder="Describe the purpose and criteria for this group..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                data-testid="textarea-group-description"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>
            
            {/* Enhanced Color Selection */}
            <div className="space-y-3">
              <Label>Group Color & Category</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Choose a color that represents the purpose or priority of this group
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_COLORS.map((colorOption, index) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg border-2 transition-all ${
                      formData.color === colorOption.value 
                        ? "border-gray-900 dark:border-gray-100 shadow-md bg-gray-50 dark:bg-gray-800" 
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, color: colorOption.value }))}
                    data-testid={`color-option-${index}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full border border-gray-300"
                      style={{ backgroundColor: colorOption.value }}
                    />
                    <p className="font-medium text-xs text-center">{colorOption.label}</p>
                    {formData.color === colorOption.value && (
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-3 mt-4 p-3 border border-dashed border-gray-300 rounded-lg">
                <Label htmlFor="custom-color" className="text-sm font-medium">Custom Color:</Label>
                <input
                  id="custom-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-8 border rounded cursor-pointer"
                  data-testid="input-custom-color"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {formData.color.toUpperCase()}
                </span>
              </div>
            </div>
            
              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: formData.color }}
                    />
                    <div>
                      <p className="font-medium">{formData.name || "Group Name"}</p>
                      {formData.description && (
                        <p className="text-xs text-muted-foreground">{formData.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    style={{ 
                      backgroundColor: formData.color,
                      color: 'white'
                    }}
                  >
                    {editingGroup?.contactCount !== undefined 
                      ? `${editingGroup.contactCount} contacts`
                      : "0 contacts"
                    }
                  </Badge>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex justify-between items-center">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {!editingGroup && (
                <span>
                  Add members after creating the group using the UserPlus button
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                data-testid="button-cancel-group"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
                data-testid="button-save-group"
                className="min-w-[120px]"
              >
                {isLoading 
                  ? (editingGroup ? "Updating..." : "Creating...") 
                  : (editingGroup ? "Update Group" : "Create Group")
                }
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}