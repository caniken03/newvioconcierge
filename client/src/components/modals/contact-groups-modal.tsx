import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, Plus } from "lucide-react";
import type { ContactGroup, Contact } from "@/types";

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
    initialContactIds: [] as string[],
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  
  // Fetch contacts for initial member selection
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
    enabled: isOpen && !editingGroup, // Only fetch when creating new group
  }) as { data: Contact[] };
  
  // Update form data when editing group changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editingGroup?.name || "",
        description: editingGroup?.description || "",
        color: editingGroup?.color || DEFAULT_COLORS[0].value,
        initialContactIds: [],
      });
      setSelectedContactIds([]);
      setSearchTerm("");
    }
  }, [isOpen, editingGroup]);
  
  const [errors, setErrors] = useState({
    name: "",
  });

  // Create contact group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string; initialContactIds?: string[] }) => {
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
    setFormData({ name: "", description: "", color: DEFAULT_COLORS[0].value, initialContactIds: [] });
    setErrors({ name: "" });
    setSelectedContactIds([]);
    setSearchTerm("");
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
      initialContactIds: selectedContactIds.length > 0 ? selectedContactIds : undefined,
    };
    
    if (editingGroup) {
      updateGroupMutation.mutate(submitData);
    } else {
      createGroupMutation.mutate(submitData);
    }
  };

  const isLoading = createGroupMutation.isPending || updateGroupMutation.isPending;

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.appointmentType?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };
  
  const selectAllContacts = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(c => c.id));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
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
          
          <Tabs defaultValue="basic" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="members" disabled={!!editingGroup}>Initial Members</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-6 py-4">
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
              <div className="grid grid-cols-1 gap-3">
                {DEFAULT_COLORS.map((colorOption, index) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                      formData.color === colorOption.value 
                        ? "border-gray-900 dark:border-gray-100 shadow-lg bg-gray-50 dark:bg-gray-800" 
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, color: colorOption.value }))}
                    data-testid={`color-option-${index}`}
                  >
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: colorOption.value }}
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{colorOption.label}</p>
                      <p className="text-xs text-muted-foreground">{colorOption.description}</p>
                    </div>
                    {formData.color === colorOption.value && (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
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
                      : `${selectedContactIds.length} contacts`
                    }
                  </Badge>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="members" className="space-y-4 py-4">
              {/* Initial Member Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Add Initial Members</Label>
                    <p className="text-sm text-muted-foreground">Select contacts to add to this group immediately</p>
                  </div>
                  <Badge variant="secondary">
                    {selectedContactIds.length} selected
                  </Badge>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts by name, phone, or appointment type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-contact-search"
                  />
                </div>
                
                {/* Bulk Selection */}
                {filteredContacts.length > 0 && (
                  <div className="flex items-center space-x-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <Checkbox
                      checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                      onCheckedChange={selectAllContacts}
                      data-testid="checkbox-select-all"
                    />
                    <Label className="text-sm">
                      Select all {filteredContacts.length} contacts
                      {searchTerm && " (filtered)"}
                    </Label>
                  </div>
                )}
                
                {/* Contact List */}
                <ScrollArea className="h-64 border rounded-lg">
                  <div className="p-2 space-y-2">
                    {filteredContacts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No contacts match your search" : "No contacts available"}
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border"
                          onClick={() => toggleContactSelection(contact.id)}
                        >
                          <Checkbox
                            checked={selectedContactIds.includes(contact.id)}
                            onCheckedChange={() => toggleContactSelection(contact.id)}
                            data-testid={`checkbox-contact-${contact.id}`}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.phone} • {contact.appointmentType || 'No appointment type'}
                            </p>
                            {contact.appointmentTime && (
                              <p className="text-xs text-muted-foreground">
                                Next: {new Date(contact.appointmentTime).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={contact.appointmentStatus === 'confirmed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {contact.appointmentStatus || 'pending'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between items-center">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {!editingGroup && selectedContactIds.length > 0 && (
                <span>
                  Ready to create group with {selectedContactIds.length} member{selectedContactIds.length === 1 ? '' : 's'}
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