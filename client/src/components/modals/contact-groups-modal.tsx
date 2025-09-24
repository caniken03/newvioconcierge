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
import type { ContactGroup } from "@/types";

interface ContactGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup?: ContactGroup | null;
}

const DEFAULT_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red  
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#6B7280", // Gray
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
    color: DEFAULT_COLORS[0],
  });
  
  // Update form data when editing group changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editingGroup?.name || "",
        description: editingGroup?.description || "",
        color: editingGroup?.color || DEFAULT_COLORS[0],
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
        description: "Contact group created successfully",
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
    setFormData({ name: "", description: "", color: DEFAULT_COLORS[0] });
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Contact Group" : "Create Contact Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Update the contact group details." 
                : "Create a new group to organize your contacts."
              }
            </DialogDescription>
          </DialogHeader>
          
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
            
            {/* Color Selection */}
            <div className="space-y-3">
              <Label>Group Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {DEFAULT_COLORS.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                      formData.color === color 
                        ? "border-gray-900 dark:border-gray-100 shadow-lg" 
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    data-testid={`color-option-${index}`}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center space-x-3 mt-3">
                <Label htmlFor="custom-color" className="text-sm">Custom Color:</Label>
                <input
                  id="custom-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-8 border rounded cursor-pointer"
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
              <div 
                className="px-4 py-2 rounded-lg text-white font-medium text-center shadow-sm"
                style={{ backgroundColor: formData.color }}
              >
                {formData.name || "Group Name"}
                {editingGroup?.contactCount !== undefined && (
                  <span className="ml-2 opacity-90">
                    ({editingGroup.contactCount} contacts)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
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
            >
              {isLoading 
                ? (editingGroup ? "Updating..." : "Creating...") 
                : (editingGroup ? "Update Group" : "Create Group")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}