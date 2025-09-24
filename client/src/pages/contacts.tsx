import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ContactModal from "@/components/modals/contact-modal";
import ContactGroupsModal from "@/components/modals/contact-groups-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Phone,
  Edit,
  Trash2,
  Clock,
  X,
  Users,
  Calendar,
  CheckCircle,
  Mail,
  MessageSquare
} from "lucide-react";
import type { Contact, ContactGroup, Location, ContactStats, GroupMembership } from "@/types";

// Enhanced filter interfaces
interface ContactFilters {
  search: string;
  status: string;
  groupId: string;
  priorityLevel: string;
  locationId: string;
  bookingSource: string;
  preferredContactMethod: string;
}

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Enhanced filter state
  const [filters, setFilters] = useState<ContactFilters>({
    search: "",
    status: "all",
    groupId: "all",
    priorityLevel: "all",
    locationId: "all",
    bookingSource: "all",
    preferredContactMethod: "all"
  });

  // Legacy compatibility
  const searchQuery = filters.search;
  const statusFilter = filters.status;

  // Fetch contacts with enhanced filtering
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts', filters, currentPage],
    enabled: !!user,
  }) as { data: Contact[], isLoading: boolean };

  const { data: contactStats = { total: 0, pending: 0, confirmed: 0 } } = useQuery({
    queryKey: ['/api/contacts/stats'],
    enabled: !!user,
  }) as { data: ContactStats };

  // Fetch contact groups for filtering
  const { data: contactGroups = [] } = useQuery({
    queryKey: ['/api/contact-groups'],
    enabled: !!user,
  }) as { data: ContactGroup[] };

  // Fetch locations for filtering
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
    enabled: !!user,
  }) as { data: Location[] };

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest('DELETE', `/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      toast({
        title: "Contact deleted",
        description: "Contact has been successfully removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CSV import mutation
  const importContactsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      setIsImporting(false);
      toast({
        title: "Import Successful",
        description: `${data.created} contacts imported successfully`,
      });
      if (data.errors.length > 0) {
        toast({
          title: "Import Warnings",
          description: `${data.errors.length} contacts had errors`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setIsImporting(false);
      toast({
        title: "Import Failed",
        description: "Failed to import contacts from CSV",
        variant: "destructive",
      });
    },
  });

  // Trigger call mutation
  const triggerCallMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest('POST', '/api/call-sessions', {
        contactId,
        triggerTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Call triggered",
        description: "Appointment reminder call has been scheduled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to trigger call",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsContactModalOpen(true);
  };

  const handleDelete = (contactId: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      deleteContactMutation.mutate(contactId);
    }
  };

  const handleTriggerCall = (contactId: string) => {
    triggerCallMutation.mutate(contactId);
  };

  // Delete contact group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return await apiRequest('DELETE', `/api/contact-groups/${groupId}`);
    },
    onSuccess: (_, deletedGroupId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/contact-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      
      // Reset group filter if deleted group was selected
      if (filters.groupId === deletedGroupId) {
        setFilters(prev => ({ ...prev, groupId: "all" }));
      }
      
      toast({
        title: "Group deleted",
        description: "Contact group has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group management handlers
  const handleCreateGroup = () => {
    setEditingGroup(null);
    setIsGroupsModalOpen(true);
  };

  const handleEditGroup = (group: ContactGroup) => {
    setEditingGroup(group);
    setIsGroupsModalOpen(true);
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to delete the group "${groupName}"? This will remove all contacts from this group but not delete the contacts themselves.`)) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  const handleCloseGroupsModal = () => {
    setIsGroupsModalOpen(false);
    setEditingGroup(null);
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, contactId]);
    } else {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map((c: Contact) => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  // Handle CSV file import
  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsImporting(true);
        importContactsMutation.mutate(file);
      }
    };
    input.click();
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      // Use the queryClient's base URL and authentication
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/contacts/export', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts_export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Contacts exported successfully",
      });
    } catch (error) {
      console.error('CSV Export Error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export contacts",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch contact group memberships for filtering
  const { data: groupMemberships = [] } = useQuery({
    queryKey: [`/api/contact-groups/${filters.groupId}/contacts`],
    enabled: !!user && filters.groupId !== "all" && typeof filters.groupId === 'string' && filters.groupId.length > 0,
  }) as { data: GroupMembership[] };

  // Enhanced filtering logic
  const filteredContacts = contacts.filter((contact: Contact) => {
    // Search filter - search across multiple fields
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = [
        contact.name,
        contact.email,
        contact.phone, 
        contact.companyName,
        contact.ownerName,
        contact.notes,
        contact.appointmentType
      ].some(field => field?.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== "all" && contact.appointmentStatus !== filters.status) {
      return false;
    }

    // Contact group filter - check if contact is in the selected group
    if (filters.groupId !== "all") {
      const isInGroup = groupMemberships.some((member: any) => member.contactId === contact.id);
      if (!isInGroup) return false;
    }

    // Priority level filter
    if (filters.priorityLevel !== "all" && contact.priorityLevel !== filters.priorityLevel) {
      return false;
    }

    // Location filter
    if (filters.locationId !== "all" && contact.locationId !== filters.locationId) {
      return false;
    }

    // Booking source filter
    if (filters.bookingSource !== "all" && contact.bookingSource !== filters.bookingSource) {
      return false;
    }

    // Preferred contact method filter
    if (filters.preferredContactMethod !== "all" && contact.preferredContactMethod !== filters.preferredContactMethod) {
      return false;
    }

    return true;
  });

  // Filter update functions
  const updateFilter = (key: keyof ContactFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Contact Management</h1>
            <p className="text-muted-foreground">Manage your contacts and appointments</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-total-contacts">
                      {contactStats.total}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Appointments</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-pending-appointments">
                      {contactStats.pending}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-confirmed-appointments">
                      {contactStats.confirmed}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-border">
              <nav className="-mb-px flex space-x-8">
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'contacts'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('contacts')}
                  data-testid="tab-contacts"
                >
                  Contacts ({filteredContacts.length})
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'groups'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('groups')}
                  data-testid="tab-groups"
                >
                  Groups ({contactGroups.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Contact Groups Management */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              {/* Groups Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Contact Groups</h2>
                  <p className="text-muted-foreground text-sm">Organize your contacts into groups for better management</p>
                </div>
                <Button
                  onClick={handleCreateGroup}
                  data-testid="button-create-group"
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Group</span>
                </Button>
              </div>

              {/* Groups Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contactGroups.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="border-2 border-dashed border-muted-foreground/25">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No contact groups</h3>
                        <p className="text-muted-foreground mb-4 max-w-md">
                          Create your first contact group to organize your contacts by category, priority, or any criteria that makes sense for your business.
                        </p>
                        <Button onClick={handleCreateGroup} data-testid="button-create-first-group">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Group
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  contactGroups.map((group) => (
                    <Card key={group.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                            style={{ backgroundColor: group.color }}
                          >
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGroup(group)}
                              data-testid={`button-edit-group-${group.id}`}
                              title="Edit group"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                              data-testid={`button-delete-group-${group.id}`}
                              title="Delete group"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-foreground mb-2" data-testid={`text-group-name-${group.id}`}>
                          {group.name}
                        </h3>
                        
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-group-description-${group.id}`}>
                            {group.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span data-testid={`text-group-count-${group.id}`}>
                              {group.contactCount} {group.contactCount === 1 ? 'contact' : 'contacts'}
                            </span>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: group.color, 
                              color: group.color,
                              backgroundColor: `${group.color}10`
                            }}
                          >
                            {group.name}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Contacts Table */}
          {activeTab === 'contacts' && (
          <Card>
            <div className="px-6 py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-foreground">Contacts</h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search contacts..."
                      value={filters.search}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm w-64"
                      data-testid="input-search-contacts"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Advanced Filters Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    data-testid="button-toggle-advanced-filters"
                  >
                    <Filter className={`w-4 h-4 mr-2 ${showAdvancedFilters ? 'text-primary' : ''}`} />
                    Advanced
                  </Button>

                  {/* Actions */}
                  <Button 
                    variant="secondary" 
                    onClick={handleImportCSV}
                    disabled={isImporting}
                    data-testid="button-import-csv"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    data-testid="button-export-csv"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setEditingContact(null);
                      setIsContactModalOpen(true);
                    }}
                    data-testid="button-add-contact"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Contact Groups Filter */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Group</label>
                      <Select value={filters.groupId} onValueChange={(value) => updateFilter('groupId', value)}>
                        <SelectTrigger data-testid="select-group-filter">
                          <SelectValue placeholder="All Groups" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Groups</SelectItem>
                          {contactGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name} ({group.contactCount || 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Level Filter */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority Level</label>
                      <Select value={filters.priorityLevel} onValueChange={(value) => updateFilter('priorityLevel', value)}>
                        <SelectTrigger data-testid="select-priority-filter">
                          <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location Filter */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                      <Select value={filters.locationId} onValueChange={(value) => updateFilter('locationId', value)}>
                        <SelectTrigger data-testid="select-location-filter">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Booking Source Filter */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Booking Source</label>
                      <Select value={filters.bookingSource} onValueChange={(value) => updateFilter('bookingSource', value)}>
                        <SelectTrigger data-testid="select-booking-source-filter">
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="calcom">Cal.com</SelectItem>
                          <SelectItem value="calendly">Calendly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Preferred Contact Method Filter */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Preferred Contact Method</label>
                      <Select value={filters.preferredContactMethod} onValueChange={(value) => updateFilter('preferredContactMethod', value)}>
                        <SelectTrigger data-testid="select-contact-method-filter">
                          <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="voice">Voice</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({
                          search: "",
                          status: "all",
                          groupId: "all",
                          priorityLevel: "all",
                          locationId: "all",
                          bookingSource: "all",
                          preferredContactMethod: "all"
                        })}
                        data-testid="button-clear-filters"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear All Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Actions */}
              {selectedContacts.length > 0 && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    {selectedContacts.length} selected
                  </span>
                  <Button variant="outline" size="sm">
                    Bulk Call
                  </Button>
                  <Button variant="outline" size="sm">
                    Export Selected
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive">
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              {contactsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading contacts...</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Checkbox
                          checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contact Info
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Company/Owner
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Appointment
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status & Priority
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contact Method
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Call History
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="text-muted-foreground">
                            <Users className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">No contacts found</p>
                            <p className="text-sm">
                              {filters.search || Object.values(filters).some(f => f !== "all" && f !== "") 
                                ? "Try adjusting your search or filters"
                                : "Add your first contact to get started"
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map((contact: any) => (
                        <tr 
                          key={contact.id} 
                          className="hover:bg-muted/30 transition-colors"
                          data-testid={`row-contact-${contact.id}`}
                        >
                          <td className="px-4 py-4">
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                              data-testid={`checkbox-contact-${contact.id}`}
                            />
                          </td>
                          
                          {/* Contact Info */}
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-foreground text-sm">{contact.name}</p>
                              <p className="text-xs text-muted-foreground">{contact.phone}</p>
                              {contact.email && (
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              )}
                              {contact.timezone && (
                                <p className="text-xs text-blue-600 mt-1">
                                  <Clock className="w-3 h-3 mr-1 inline" />
                                  {contact.timezone}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Company/Owner */}
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              {contact.companyName && (
                                <p className="font-medium text-foreground text-sm">{contact.companyName}</p>
                              )}
                              {contact.ownerName && (
                                <p className="text-xs text-muted-foreground">{contact.ownerName}</p>
                              )}
                              {contact.bookingSource && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {contact.bookingSource}
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Appointment */}
                          <td className="px-4 py-4">
                            <div>
                              {contact.appointmentType && (
                                <p className="text-sm font-medium text-foreground">{contact.appointmentType}</p>
                              )}
                              {contact.appointmentTime ? (
                                <p className="text-xs text-muted-foreground">
                                  {new Date(contact.appointmentTime).toLocaleString()}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">No appointment scheduled</p>
                              )}
                              {contact.appointmentDuration && (
                                <p className="text-xs text-muted-foreground">{contact.appointmentDuration} min</p>
                              )}
                            </div>
                          </td>

                          {/* Status & Priority */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={contact.appointmentStatus === 'confirmed' ? 'default' : 'secondary'}
                                className={
                                  contact.appointmentStatus === 'confirmed'
                                    ? 'bg-green-100 text-green-800 text-xs'
                                    : contact.appointmentStatus === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800 text-xs'
                                    : contact.appointmentStatus === 'cancelled'
                                    ? 'bg-red-100 text-red-800 text-xs'
                                    : 'bg-blue-100 text-blue-800 text-xs'
                                }
                              >
                                {contact.appointmentStatus}
                              </Badge>
                              {contact.priorityLevel && (
                                <Badge 
                                  variant="outline"
                                  className={`text-xs ${
                                    contact.priorityLevel === 'urgent' ? 'border-red-300 text-red-700' :
                                    contact.priorityLevel === 'high' ? 'border-orange-300 text-orange-700' :
                                    contact.priorityLevel === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                    'border-green-300 text-green-700'
                                  }`}
                                >
                                  {contact.priorityLevel}
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Contact Method */}
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              {contact.preferredContactMethod && (
                                <Badge variant="outline" className="text-xs">
                                  {contact.preferredContactMethod === 'voice' ? (
                                    <Phone className="w-3 h-3 mr-1" />
                                  ) : contact.preferredContactMethod === 'sms' ? (
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Mail className="w-3 h-3 mr-1" />
                                  )}
                                  {contact.preferredContactMethod}
                                </Badge>
                              )}
                              {contact.callBeforeHours && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Call before: {contact.callBeforeHours}h
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Call History */}
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <p className="text-foreground text-xs">
                                Attempts: {contact.callAttempts || 0}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contact.lastCallOutcome || 'Never called'}
                              </p>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleTriggerCall(contact.id)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-call-contact-${contact.id}`}
                                title="Trigger call"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(contact)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-edit-contact-${contact.id}`}
                                title="Edit contact"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(contact.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                data-testid={`button-delete-contact-${contact.id}`}
                                title="Delete contact"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {filteredContacts.length > 0 && (
              <div className="px-6 py-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredContacts.length} of {contactStats.total} contacts
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button variant="default" size="sm">
                      {currentPage}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
          )}

          {/* Contact Modal */}
          <ContactModal
            isOpen={isContactModalOpen}
            onClose={() => {
              setIsContactModalOpen(false);
              setEditingContact(null);
            }}
            contact={editingContact}
          />

          {/* Contact Groups Modal */}
          <ContactGroupsModal
            isOpen={isGroupsModalOpen}
            onClose={handleCloseGroupsModal}
            editingGroup={editingGroup}
          />
        </main>
      </div>
    </div>
  );
}
