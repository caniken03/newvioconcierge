import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ContactModal from "@/components/modals/contact-modal";
import ContactGroupsModal from "@/components/modals/contact-groups-modal";
import ContactGroupAssignment from "@/components/contact-group-assignment";
import BulkStatusUpdateModal from "@/components/modals/bulk-status-update-modal";
import BulkPriorityUpdateModal from "@/components/modals/bulk-priority-update-modal";
import BulkContactMethodUpdateModal from "@/components/modals/bulk-contact-method-update-modal";
import BulkNotesModal from "@/components/modals/bulk-notes-modal";
import BulkTimezoneModal from "@/components/modals/bulk-timezone-modal";
import BulkDeleteModal from "@/components/modals/bulk-delete-modal";
import { ContactTimeline } from "@/components/contact-timeline";
import CallNowModal from "@/components/call-now-modal";
import { GroupMemberViewer } from "@/components/group-member-viewer";
import { CSVUploadWizard } from "@/components/csv-upload-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { 
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Phone,
  Edit,
  Edit2,
  Trash2,
  Clock,
  X,
  Users,
  Calendar,
  CheckCircle,
  Mail,
  MessageSquare,
  Save,
  RefreshCw,
  Star,
  StarOff,
  Settings,
  ChevronDown,
  User,
  Globe,
  MessageCircle,
  Activity,
  Eye,
  AlertTriangle
} from "lucide-react";
import type { Contact, ContactGroup, Location, ContactStats, GroupMembership } from "@/types";

// Helper functions for date filtering
const getWeekStart = () => {
  const now = new Date();
  const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  firstDayOfWeek.setHours(0, 0, 0, 0);
  return firstDayOfWeek.toISOString().split('T')[0];
};

const getWeekEnd = () => {
  const now = new Date();
  const lastDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  lastDayOfWeek.setHours(23, 59, 59, 999);
  return lastDayOfWeek.toISOString().split('T')[0];
};

// Initial filters constant
const initialFilters: ContactFilters = {
  search: "",
  status: "all",
  groupId: "all",
  priorityLevel: "all",
  locationId: "all",
  bookingSource: "all",
  preferredContactMethod: "all",
  appointmentDateFrom: "",
  appointmentDateTo: "",
  createdDateFrom: "",
  createdDateTo: "",
  searchFields: ['name', 'phone', 'email'],
  searchOperator: 'any',
  hasEmail: "all",
  hasNotes: "all", 
  callAttempts: "all",
  timezone: "all"
};

// Enhanced filter interfaces
interface ContactFilters {
  search: string;
  status: string;
  groupId: string;
  priorityLevel: string;
  locationId: string;
  bookingSource: string;
  preferredContactMethod: string;
  // Advanced date filtering
  appointmentDateFrom: string;
  appointmentDateTo: string;
  createdDateFrom: string;
  createdDateTo: string;
  // Advanced search options
  searchFields: string[]; // Which fields to search in
  searchOperator: 'any' | 'all'; // AND/OR search
  // Additional filters
  hasEmail: 'all' | 'yes' | 'no';
  hasNotes: 'all' | 'yes' | 'no';
  callAttempts: 'all' | '0' | '1-3' | '4+';
  timezone: string;
}

// Saved filter preset interface
interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: ContactFilters;
  isDefault?: boolean;
  createdAt: string;
}

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
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
  const [isGroupAssignmentOpen, setIsGroupAssignmentOpen] = useState(false);

  // Bulk Operations Modal States
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkPriorityModalOpen, setBulkPriorityModalOpen] = useState(false);
  const [bulkOwnerModalOpen, setBulkOwnerModalOpen] = useState(false);
  const [bulkContactMethodModalOpen, setBulkContactMethodModalOpen] = useState(false);
  const [bulkNotesModalOpen, setBulkNotesModalOpen] = useState(false);
  const [bulkTimezoneModalOpen, setBulkTimezoneModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  
  // Timeline modal state
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineContactId, setTimelineContactId] = useState<string | null>(null);
  
  // Call Now modal state
  const [isCallNowModalOpen, setIsCallNowModalOpen] = useState(false);
  
  // Group Member Viewer state
  const [isGroupViewerOpen, setIsGroupViewerOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<ContactGroup | null>(null);
  const [callNowContact, setCallNowContact] = useState<Contact | null>(null);
  
  // CSV Upload Wizard state
  const [isCSVWizardOpen, setIsCSVWizardOpen] = useState(false);
  
  // Delete Group Confirmation Dialog state
  const [deleteGroupDialog, setDeleteGroupDialog] = useState<{ isOpen: boolean; groupId: string | null; groupName: string | null }>({
    isOpen: false,
    groupId: null,
    groupName: null
  });

  // Bulk Delete Confirmation Dialog state
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState({
    isOpen: false,
    count: 0
  });

  // Enhanced filter state
  const [filters, setFilters] = useState<ContactFilters>(initialFilters);

  // Default presets
  const getDefaultPresets = (): FilterPreset[] => [
    {
      id: 'high-priority-pending',
      name: 'High Priority Pending',
      description: 'High/urgent priority contacts with pending appointments',
      filters: { ...initialFilters, priorityLevel: 'high', status: 'pending' },
      isDefault: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'this-week-appointments',
      name: "This Week's Appointments",
      description: 'Appointments scheduled for this week',
      filters: { ...initialFilters, appointmentDateFrom: getWeekStart(), appointmentDateTo: getWeekEnd() },
      isDefault: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'no-email-contacts',
      name: 'Missing Email Contacts',
      description: 'Contacts without email addresses',
      filters: { ...initialFilters, hasEmail: 'no' },
      isDefault: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Load presets from localStorage with defaults
  const loadPresets = (): FilterPreset[] => {
    try {
      const stored = localStorage.getItem(`vioconcierge-filter-presets-${user?.tenantId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as FilterPreset[];
        // Merge with defaults, keeping defaults if not already present
        const defaultPresets = getDefaultPresets();
        const existingIds = parsed.map(p => p.id);
        const missingDefaults = defaultPresets.filter(def => !existingIds.includes(def.id));
        return [...parsed, ...missingDefaults];
      }
    } catch (error) {
      console.error('Error loading filter presets:', error);
    }
    return getDefaultPresets();
  };

  // Save presets to localStorage
  const savePresets = (presets: FilterPreset[]) => {
    try {
      localStorage.setItem(`vioconcierge-filter-presets-${user?.tenantId}`, JSON.stringify(presets));
    } catch (error) {
      console.error('Error saving filter presets:', error);
    }
  };

  // Load active preset from localStorage
  const loadActivePreset = (): string | null => {
    try {
      return localStorage.getItem(`vioconcierge-active-preset-${user?.tenantId}`);
    } catch (error) {
      console.error('Error loading active preset:', error);
      return null;
    }
  };

  // Save active preset to localStorage
  const saveActivePreset = (presetId: string | null) => {
    try {
      if (presetId) {
        localStorage.setItem(`vioconcierge-active-preset-${user?.tenantId}`, presetId);
      } else {
        localStorage.removeItem(`vioconcierge-active-preset-${user?.tenantId}`);
      }
    } catch (error) {
      console.error('Error saving active preset:', error);
    }
  };

  // Persistent saved filter presets state
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Load presets on component mount and user change
  useEffect(() => {
    if (user) {
      setSavedPresets(loadPresets());
      setActivePreset(loadActivePreset());
    }
  }, [user]);

  // URL filter parameter state
  const [urlFilter, setUrlFilter] = useState<string | null>(null);

  // Handle URL parameters for filtering
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const filterParam = params.get('filter');
    const newParam = params.get('new');
    
    if (filterParam === 'missing-phone') {
      setUrlFilter('missing-phone');
      // Reset other filters to show the specific missing phone filter
      setFilters({ ...initialFilters });
    } else {
      setUrlFilter(null);
    }
    
    // Auto-open contact modal for creating new contact
    if (newParam === 'true' && !isContactModalOpen) {
      setEditingContact(null);
      setIsContactModalOpen(true);
    }
  }, [location, isContactModalOpen]);

  // Legacy compatibility
  const searchQuery = filters.search;
  const statusFilter = filters.status;

  // Fetch contacts with proper cache control (server handles cache-busting)
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
    // Temporarily enable for testing - in production, should be enabled: !!user
    enabled: true,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache (renamed from cacheTime in v5)
  }) as { data: Contact[], isLoading: boolean };

  const { data: contactStats = { total: 0, pending: 0, confirmed: 0 } } = useQuery({
    queryKey: ['/api/contacts/stats'],
    // Temporarily enable for testing - in production, should be enabled: !!user
    enabled: true,
  }) as { data: ContactStats };

  // Fetch contact groups for filtering
  const { data: contactGroups = [] } = useQuery({
    queryKey: ['/api/contact-groups'],
    // Temporarily enable for testing - in production, should be enabled: !!user
    enabled: true,
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

  const handleViewTimeline = (contactId: string) => {
    setTimelineContactId(contactId);
    setIsTimelineModalOpen(true);
  };

  const handleCallNow = (contact: Contact) => {
    setCallNowContact(contact);
    setIsCallNowModalOpen(true);
  };

  // Bulk delete mutation (using POST for reliability)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      const response = await apiRequest('POST', '/api/contacts/bulk-delete', { 
        contactIds,
        preserveHistory: false 
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Contacts deleted",
        description: `Successfully deleted ${data.deletedCount} contact(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      setSelectedContacts([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete contacts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBulkDelete = () => {
    if (selectedContacts.length === 0) return;
    
    setBulkDeleteDialog({
      isOpen: true,
      count: selectedContacts.length
    });
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedContacts);
    setBulkDeleteDialog({ isOpen: false, count: 0 });
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
    setDeleteGroupDialog({
      isOpen: true,
      groupId,
      groupName
    });
  };

  const confirmDeleteGroup = () => {
    if (deleteGroupDialog.groupId) {
      deleteGroupMutation.mutate(deleteGroupDialog.groupId);
      setDeleteGroupDialog({ isOpen: false, groupId: null, groupName: null });
    }
  };

  const handleViewGroupMembers = (group: ContactGroup) => {
    setViewingGroup(group);
    setIsGroupViewerOpen(true);
  };

  const handleCloseGroupsModal = () => {
    setIsGroupsModalOpen(false);
    setEditingGroup(null);
  };

  // Stable handler for closing group assignment modal (prevents infinite loops)
  const handleCloseGroupAssignment = useCallback(() => {
    setIsGroupAssignmentOpen(false);
    // DON'T clear selection here - let the user keep their selection
  }, []);

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, contactId]);
    } else {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts((contacts || []).map((c: Contact) => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  // Handle CSV file import - now opens the wizard
  const handleImportCSV = () => {
    setIsCSVWizardOpen(true);
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
  }) as { data: Contact[] };

  // Memoize group IDs to prevent infinite loop from array recreation
  // IMPORTANT: sort() creates a new array, so no mutation here - this is safe
  const groupIds = useMemo(() => contactGroups.map(g => g.id).sort().join(','), [contactGroups]);

  // DISABLED: This N+1 query was causing infinite loops when adding contacts to groups
  // Get all group memberships for all contacts (we'll filter display later)
  const { data: allGroupMemberships = [] } = useQuery({
    queryKey: ['/api/all-group-memberships', groupIds],
    queryFn: async () => {
      if (!contactGroups.length) return [];
      
      const allMemberships: GroupMembership[] = [];
      
      // Fetch memberships for each group
      for (const group of contactGroups) {
        try {
          const response = await apiRequest('GET', `/api/contact-groups/${group.id}/contacts`);
          const groupContacts = await response.json() as any[];
          
          // Add membership records for all contacts in this group
          groupContacts.forEach(contact => {
            allMemberships.push({
              contactId: contact.id,
              groupId: group.id,
              groupName: group.name,
              groupColor: group.color,
              addedBy: '',
              addedAt: new Date().toISOString()
            });
          });
        } catch (error) {
          // Skip groups we can't access
        }
      }
      
      return allMemberships;
    },
    // DISABLED to prevent infinite loop - was triggering N+1 fetches on every contactGroups change
    enabled: false,
  }) as { data: GroupMembership[] };

  // Enhanced filtering logic
  const filteredContacts = (contacts || []).filter((contact: Contact) => {
    // Handle special URL filters first
    if (urlFilter === 'missing-phone') {
      // Only show contacts without phone numbers
      return !contact.phone || contact.phone.trim() === '';
    }

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = contact.name?.toLowerCase().includes(searchLower) || 
                           contact.phone?.toLowerCase().includes(searchLower) ||
                           (contact as any).email?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== "all" && contact.appointmentStatus !== filters.status) {
      return false;
    }
    
    // Apply appointment date range filtering
    if (filters.appointmentDateFrom && contact.appointmentTime) {
      const appointmentDate = new Date(contact.appointmentTime);
      const fromDate = new Date(filters.appointmentDateFrom);
      if (appointmentDate < fromDate) return false;
    }
    
    if (filters.appointmentDateTo && contact.appointmentTime) {
      const appointmentDate = new Date(contact.appointmentTime);
      const toDate = new Date(filters.appointmentDateTo + 'T23:59:59');
      if (appointmentDate > toDate) return false;
    }
    
    // Apply created date range filtering
    if (filters.createdDateFrom && contact.createdAt) {
      const createdDate = new Date(contact.createdAt);
      const fromDate = new Date(filters.createdDateFrom);
      if (createdDate < fromDate) return false;
    }
    
    if (filters.createdDateTo && contact.createdAt) {
      const createdDate = new Date(contact.createdAt);
      const toDate = new Date(filters.createdDateTo + 'T23:59:59');
      if (createdDate > toDate) return false;
    }

    // Contact group filter - check if contact is in the selected group
    if (filters.groupId !== "all") {
      const isInGroup = groupMemberships.some((c: Contact) => c.id === contact.id);
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

    // Additional Advanced Filters
    
    // Has Email filter
    if (filters.hasEmail === "yes" && !(contact as any).email) return false;
    if (filters.hasEmail === "no" && (contact as any).email) return false;
    
    // Has Notes filter
    if (filters.hasNotes === "yes" && !contact.notes) return false;
    if (filters.hasNotes === "no" && contact.notes) return false;
    
    // Call Attempts filter
    if (filters.callAttempts !== "all") {
      const attempts = contact.callAttempts || 0;
      switch (filters.callAttempts) {
        case "0":
          if (attempts !== 0) return false;
          break;
        case "1-3":
          if (attempts < 1 || attempts > 3) return false;
          break;
        case "4+":
          if (attempts < 4) return false;
          break;
      }
    }
    
    // Timezone filter
    if (filters.timezone !== "all" && contact.timezone !== filters.timezone) {
      return false;
    }

    return true;
  });

  // Filter update functions
  const updateFilter = (key: keyof ContactFilters, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActivePreset(null); // Clear active preset when manually changing filters
    saveActivePreset(null); // Also clear from localStorage
  };

  // Advanced filter management functions with persistence
  const applyPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    setActivePreset(preset.id);
    saveActivePreset(preset.id);
    toast({
      title: "Filter preset applied",
      description: `Applied "${preset.name}" filter preset`,
    });
  };

  const saveCurrentFiltersAsPreset = (name: string, description?: string) => {
    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      description,
      filters: { ...filters },
      isDefault: false,
      createdAt: new Date().toISOString()
    };
    
    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    savePresets(updatedPresets);
    setActivePreset(newPreset.id);
    saveActivePreset(newPreset.id);
    
    toast({
      title: "Filter preset saved",
      description: `Saved "${name}" filter preset successfully`,
    });
  };

  const deletePreset = (presetId: string) => {
    const updatedPresets = savedPresets.filter(preset => preset.id !== presetId);
    setSavedPresets(updatedPresets);
    savePresets(updatedPresets);
    
    if (activePreset === presetId) {
      setActivePreset(null);
      saveActivePreset(null);
    }
    
    toast({
      title: "Filter preset deleted",
      description: "Filter preset has been removed",
    });
  };

  // Quick filter shortcuts
  const applyQuickFilter = (filterType: string) => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    switch (filterType) {
      case 'high-priority':
        setFilters({ ...initialFilters, priorityLevel: 'high' });
        break;
      case 'urgent-pending':
        setFilters({ ...initialFilters, priorityLevel: 'urgent', status: 'pending' });
        break;
      case 'this-week':
        setFilters({ 
          ...initialFilters, 
          appointmentDateFrom: startOfWeek.toISOString().split('T')[0],
          appointmentDateTo: endOfWeek.toISOString().split('T')[0]
        });
        break;
      case 'no-email':
        setFilters({ ...initialFilters, hasEmail: 'no' });
        break;
      case 'never-called':
        setFilters({ ...initialFilters, callAttempts: '0' });
        break;
      case 'multiple-attempts':
        setFilters({ ...initialFilters, callAttempts: '4+' });
        break;
      default:
        break;
    }
    setActivePreset(null);
    saveActivePreset(null); // Clear active preset from localStorage
  };

  // Get active filter count (excluding search and default "all" values)
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.status !== "all") count++;
    if (filters.groupId !== "all") count++;
    if (filters.priorityLevel !== "all") count++;
    if (filters.locationId !== "all") count++;
    if (filters.bookingSource !== "all") count++;
    if (filters.preferredContactMethod !== "all") count++;
    if (filters.appointmentDateFrom) count++;
    if (filters.appointmentDateTo) count++;
    if (filters.createdDateFrom) count++;
    if (filters.createdDateTo) count++;
    if (filters.hasEmail !== "all") count++;
    if (filters.hasNotes !== "all") count++;
    if (filters.callAttempts !== "all") count++;
    if (filters.timezone !== "all") count++;
    return count;
  };

  // Memoize selected contact names to prevent infinite loops
  const selectedContactNames = useMemo(() => 
    selectedContacts.map(id => {
      const contact = contacts.find((c: Contact) => c.id === id);
      return contact?.name || '';
    }), 
    [selectedContacts, contacts]
  );

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
            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-blue-200"
              onClick={() => setFilters(prev => ({ ...prev, status: "all" }))}
              data-testid="stats-card-total-contacts"
            >
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

            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-yellow-200"
              onClick={() => setFilters(prev => ({ ...prev, status: "pending" }))}
              data-testid="stats-card-pending-contacts"
            >
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

            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-green-200"
              onClick={() => setFilters(prev => ({ ...prev, status: "confirmed" }))}
              data-testid="stats-card-confirmed-contacts"
            >
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

          {/* Groups Overview Section - Always Visible */}
          <div className="mb-8">
            <Card>
              <div className="px-6 py-4 border-b border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Contact Groups</h3>
                    <p className="text-sm text-muted-foreground">Quick overview and filtering by groups</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateFilter('groupId', 'all')}
                      data-testid="button-show-all-contacts"
                      className={filters.groupId === 'all' ? 'border-primary text-primary bg-primary/10' : ''}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      All Contacts
                    </Button>
                    <Button
                      onClick={handleCreateGroup}
                      size="sm"
                      data-testid="button-create-group-overview"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Group
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {contactGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-foreground mb-2">No contact groups yet</h4>
                    <p className="text-muted-foreground mb-4">Create your first group to organize contacts</p>
                    <Button onClick={handleCreateGroup} data-testid="button-create-first-group-overview">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Group
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {contactGroups.map((group) => (
                      <div
                        key={group.id}
                        className={`group cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
                          filters.groupId === group.id 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => updateFilter('groupId', group.id)}
                        data-testid={`group-overview-card-${group.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                            style={{ backgroundColor: group.color }}
                          >
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewGroupMembers(group);
                              }}
                              data-testid={`button-view-group-overview-${group.id}`}
                              title="View group members"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditGroup(group);
                              }}
                              data-testid={`button-edit-group-overview-${group.id}`}
                              title="Edit group"
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(group.id, group.name);
                              }}
                              data-testid={`button-delete-group-overview-${group.id}`}
                              title="Delete group"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground text-sm truncate" title={group.name}>
                            {group.name}
                          </h4>
                          {group.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2" title={group.description}>
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Users className="w-3 h-3 mr-1" />
                              <span data-testid={`text-group-overview-count-${group.id}`}>
                                {group.contactCount || 0} contact{(group.contactCount || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {filters.groupId === group.id && (
                              <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewGroupMembers(group)}
                              data-testid={`button-view-group-${group.id}`}
                              title="View group members"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
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
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

                  {/* Advanced Filters Toggle with Active Count */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    data-testid="button-toggle-advanced-filters"
                    className={showAdvancedFilters || getActiveFilterCount() > 0 ? 'border-primary text-primary' : ''}
                  >
                    <Filter className={`w-4 h-4 mr-2 ${showAdvancedFilters || getActiveFilterCount() > 0 ? 'text-primary' : ''}`} />
                    Advanced {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                  </Button>

                  {/* Bulk Actions */}
                  {selectedContacts.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg border">
                      <span className="text-sm text-primary font-medium">
                        {selectedContacts.length} selected
                      </span>
                      
                      {/* Comprehensive Bulk Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid="button-bulk-actions-menu"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Bulk Actions
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel className="font-medium text-foreground">
                            Bulk Operations ({selectedContacts.length} selected)
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Status Updates */}
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                              STATUS & PRIORITY
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setBulkStatusModalOpen(true)}
                              data-testid="bulk-action-update-status"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setBulkPriorityModalOpen(true)}
                              data-testid="bulk-action-update-priority"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Update Priority
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Assignment & Contact */}
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                              ASSIGNMENT & CONTACT
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setBulkOwnerModalOpen(true)}
                              data-testid="bulk-action-assign-owner"
                            >
                              <User className="w-4 h-4 mr-2" />
                              Assign Owner
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setBulkContactMethodModalOpen(true)}
                              data-testid="bulk-action-update-contact-method"
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Update Contact Method
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setIsGroupAssignmentOpen(true)}
                              data-testid="bulk-action-assign-groups"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Assign to Groups
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Notes & Settings */}
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                              NOTES & SETTINGS
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setBulkNotesModalOpen(true)}
                              data-testid="bulk-action-add-notes"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Add Notes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setBulkTimezoneModalOpen(true)}
                              data-testid="bulk-action-update-timezone"
                            >
                              <Globe className="w-4 h-4 mr-2" />
                              Update Timezone
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Dangerous Actions */}
                          <DropdownMenuItem
                            onClick={() => setBulkDeleteModalOpen(true)}
                            data-testid="bulk-action-delete"
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Contacts
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Actions */}
                  <Button 
                    variant="secondary" 
                    onClick={handleImportCSV}
                    data-testid="button-import-csv"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
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

              {/* Comprehensive Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-border space-y-6">
                  
                  {/* Quick Filter Buttons */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Quick Filters</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyQuickFilter('high-priority')}
                        data-testid="quick-filter-high-priority"
                        className="h-8 text-xs"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        High Priority
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyQuickFilter('urgent-pending')}
                        data-testid="quick-filter-urgent-pending"
                        className="h-8 text-xs"
                      >
                        🚨 Urgent Pending
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyQuickFilter('this-week')}
                        data-testid="quick-filter-this-week"
                        className="h-8 text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        This Week
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyQuickFilter('no-email')}
                        data-testid="quick-filter-no-email"
                        className="h-8 text-xs"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Missing Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyQuickFilter('never-called')}
                        data-testid="quick-filter-never-called"
                        className="h-8 text-xs"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Never Called
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyQuickFilter('multiple-attempts')}
                        data-testid="quick-filter-multiple-attempts"
                        className="h-8 text-xs"
                      >
                        📞 4+ Attempts
                      </Button>
                    </div>
                  </div>

                  {/* Saved Presets */}
                  {savedPresets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Saved Presets</h4>
                      <div className="flex flex-wrap gap-2">
                        {savedPresets.map((preset) => (
                          <Button
                            key={preset.id}
                            variant={activePreset === preset.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => applyPreset(preset)}
                            data-testid={`preset-${preset.id}`}
                            className="h-8 text-xs"
                          >
                            {activePreset === preset.id && <Star className="w-3 h-3 mr-1" />}
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Search Configuration */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-foreground mb-3">Advanced Search Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Search In Fields</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'name', label: 'Name' },
                            { id: 'email', label: 'Email' },
                            { id: 'phone', label: 'Phone' },
                            { id: 'company', label: 'Company' },
                            { id: 'owner', label: 'Owner' },
                            { id: 'notes', label: 'Notes' }
                          ].map(field => (
                            <div key={field.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`search-${field.id}`}
                                checked={filters.searchFields.includes(field.id)}
                                onCheckedChange={(checked) => {
                                  const newFields = checked 
                                    ? [...filters.searchFields, field.id]
                                    : filters.searchFields.filter(f => f !== field.id);
                                  updateFilter('searchFields', newFields);
                                }}
                                data-testid={`checkbox-search-${field.id}`}
                              />
                              <label 
                                htmlFor={`search-${field.id}`} 
                                className="text-xs text-muted-foreground cursor-pointer"
                              >
                                {field.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Search Operator</label>
                        <Select value={filters.searchOperator} onValueChange={(value: 'any' | 'all') => updateFilter('searchOperator', value)}>
                          <SelectTrigger data-testid="select-search-operator" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Match ANY word (OR)</SelectItem>
                            <SelectItem value="all">Match ALL words (AND)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Date Range Filters */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Date Filters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Appointment From</label>
                        <Input
                          type="date"
                          value={filters.appointmentDateFrom}
                          onChange={(e) => updateFilter('appointmentDateFrom', e.target.value)}
                          data-testid="input-appointment-date-from"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Appointment To</label>
                        <Input
                          type="date"
                          value={filters.appointmentDateTo}
                          onChange={(e) => updateFilter('appointmentDateTo', e.target.value)}
                          data-testid="input-appointment-date-to"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Created From</label>
                        <Input
                          type="date"
                          value={filters.createdDateFrom}
                          onChange={(e) => updateFilter('createdDateFrom', e.target.value)}
                          data-testid="input-created-date-from"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Created To</label>
                        <Input
                          type="date"
                          value={filters.createdDateTo}
                          onChange={(e) => updateFilter('createdDateTo', e.target.value)}
                          data-testid="input-created-date-to"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Standard Filters - Better organized */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Standard Filters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Contact Groups Filter */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Group</label>
                        <Select value={filters.groupId} onValueChange={(value) => updateFilter('groupId', value)}>
                          <SelectTrigger data-testid="select-group-filter" className="h-9">
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
                          <SelectTrigger data-testid="select-priority-filter" className="h-9">
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
                          <SelectTrigger data-testid="select-location-filter" className="h-9">
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
                          <SelectTrigger data-testid="select-booking-source-filter" className="h-9">
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
                  </div>

                  {/* Additional Advanced Filters */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Additional Filters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* Preferred Contact Method Filter */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Method</label>
                        <Select value={filters.preferredContactMethod} onValueChange={(value) => updateFilter('preferredContactMethod', value)}>
                          <SelectTrigger data-testid="select-contact-method-filter" className="h-9">
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

                      {/* Has Email Filter */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Has Email</label>
                        <Select value={filters.hasEmail} onValueChange={(value) => updateFilter('hasEmail', value)}>
                          <SelectTrigger data-testid="select-has-email-filter" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Contacts</SelectItem>
                            <SelectItem value="yes">With Email</SelectItem>
                            <SelectItem value="no">Without Email</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Has Notes Filter */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Has Notes</label>
                        <Select value={filters.hasNotes} onValueChange={(value) => updateFilter('hasNotes', value)}>
                          <SelectTrigger data-testid="select-has-notes-filter" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Contacts</SelectItem>
                            <SelectItem value="yes">With Notes</SelectItem>
                            <SelectItem value="no">Without Notes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Call Attempts Filter */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Call Attempts</label>
                        <Select value={filters.callAttempts} onValueChange={(value) => updateFilter('callAttempts', value)}>
                          <SelectTrigger data-testid="select-call-attempts-filter" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Attempts</SelectItem>
                            <SelectItem value="0">Never Called (0)</SelectItem>
                            <SelectItem value="1-3">Few Attempts (1-3)</SelectItem>
                            <SelectItem value="4+">Many Attempts (4+)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Timezone Filter */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Timezone</label>
                        <Select value={filters.timezone} onValueChange={(value) => updateFilter('timezone', value)}>
                          <SelectTrigger data-testid="select-timezone-filter" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Timezones</SelectItem>
                            <SelectItem value="Europe/London">Europe/London</SelectItem>
                            <SelectItem value="America/New_York">America/New_York</SelectItem>
                            <SelectItem value="America/Chicago">America/Chicago</SelectItem>
                            <SelectItem value="America/Denver">America/Denver</SelectItem>
                            <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                            <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                            <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Filter Management Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilters(initialFilters);
                          setActivePreset(null);
                        }}
                        data-testid="button-clear-filters"
                        className="h-8"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Clear All
                      </Button>
                      {getActiveFilterCount() > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getActiveFilterCount() > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const presetName = prompt("Enter a name for this filter preset:");
                            if (presetName?.trim()) {
                              saveCurrentFiltersAsPreset(presetName.trim());
                            }
                          }}
                          data-testid="button-save-preset"
                          className="h-8"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save as Preset
                        </Button>
                      )}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    data-testid="button-bulk-delete"
                  >
                    {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
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
                        Contact
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Appointment
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Company/Owner
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Groups
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
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
                              <p className="font-medium text-foreground">{contact.name}</p>
                              <p className="text-sm text-muted-foreground">{contact.phone}</p>
                            </div>
                          </td>

                          {/* Appointment */}
                          <td className="px-4 py-4">
                            <div>
                              {contact.appointmentTime ? (
                                <div>
                                  <p className="font-medium text-foreground">
                                    Appointment:
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {(() => {
                                      const appointmentDate = new Date(contact.appointmentTime);
                                      const day = appointmentDate.toLocaleDateString('en-GB', { weekday: 'short' });
                                      const date = appointmentDate.getDate();
                                      const month = appointmentDate.toLocaleDateString('en-GB', { month: 'short' });
                                      const time = appointmentDate.toLocaleTimeString('en-GB', { 
                                        hour: '2-digit', 
                                        minute: '2-digit', 
                                        hour12: false 
                                      });
                                      return `${day}, ${date} ${month}, ${time}`;
                                    })()}
                                  </p>
                                  <div className="mt-2">
                                    <p className="text-sm text-blue-600">
                                      VioConcierge calls for appointment:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {(() => {
                                        const appointmentDate = new Date(contact.appointmentTime);
                                        const callTime = new Date(appointmentDate.getTime() - 60 * 60 * 1000); // 1 hour before
                                        const day = callTime.toLocaleDateString('en-GB', { weekday: 'short' });
                                        const date = callTime.getDate();
                                        const month = callTime.toLocaleDateString('en-GB', { month: 'short' });
                                        const time = callTime.toLocaleTimeString('en-GB', { 
                                          hour: '2-digit', 
                                          minute: '2-digit', 
                                          hour12: false 
                                        });
                                        return `${day}, ${date} ${month}, ${time}`;
                                      })()}
                                    </p>
                                  </div>
                                  {contact.specialInstructions && (
                                    <p className="text-xs text-blue-500 mt-1">
                                      📞 {contact.specialInstructions}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No appointment scheduled</p>
                              )}
                            </div>
                          </td>

                          {/* Company/Owner */}
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              {contact.companyName || contact.ownerName ? (
                                <div>
                                  {contact.companyName && (
                                    <p className="font-medium text-foreground text-sm">{contact.companyName}</p>
                                  )}
                                  {contact.ownerName && (
                                    <p className="text-xs text-muted-foreground">{contact.ownerName}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Not specified</p>
                              )}
                            </div>
                          </td>

                          {/* Groups */}
                          <td className="px-4 py-4">
                            <div>
                              {allGroupMemberships
                                .filter(membership => membership.contactId === contact.id)
                                .length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {allGroupMemberships
                                    .filter(membership => membership.contactId === contact.id)
                                    .map(membership => (
                                      <Badge
                                        key={membership.groupId}
                                        style={{ backgroundColor: membership.groupColor }}
                                        className="text-white text-xs px-1.5 py-0.5 h-5"
                                        data-testid={`badge-group-${membership.groupId}`}
                                      >
                                        {membership.groupName}
                                      </Badge>
                                    ))
                                  }
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No groups</p>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <div>
                              <Badge 
                                variant={contact.appointmentStatus === 'confirmed' ? 'default' : 'secondary'}
                                className={`capitalize ${
                                  contact.appointmentStatus === 'confirmed' ? 'bg-green-500 text-white' :
                                  contact.appointmentStatus === 'pending' ? 'bg-yellow-500 text-white' :
                                  contact.appointmentStatus === 'cancelled' ? 'bg-red-500 text-white' :
                                  'bg-gray-500 text-white'
                                }`}
                                data-testid={`status-${contact.id}`}
                              >
                                {contact.appointmentStatus || 'Pending'}
                              </Badge>
                            </div>
                          </td>


                          {/* Actions */}
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleCallNow(contact)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-call-contact-${contact.id}`}
                                title="Call now via AI agent"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleViewTimeline(contact.id)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-timeline-contact-${contact.id}`}
                                title="View timeline"
                              >
                                <Activity className="w-4 h-4" />
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

          {/* Timeline Modal */}
          {timelineContactId && (
            <Dialog 
              open={isTimelineModalOpen} 
              onOpenChange={(open) => {
                setIsTimelineModalOpen(open);
                if (!open) {
                  setTimelineContactId(null);
                }
              }}
            >
              <DialogContent className="max-w-4xl h-[80vh]" data-testid="timeline-modal">
                <DialogHeader>
                  <DialogTitle>Contact Timeline</DialogTitle>
                  <DialogDescription>
                    Complete interaction history and activity timeline for this contact.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                  <ContactTimeline contactId={timelineContactId} />
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Call Now Modal */}
          <CallNowModal
            isOpen={isCallNowModalOpen}
            onClose={() => {
              setIsCallNowModalOpen(false);
              setCallNowContact(null);
            }}
            contact={callNowContact}
          />

          {/* Contact Groups Modal */}
          <ContactGroupsModal
            isOpen={isGroupsModalOpen}
            onClose={handleCloseGroupsModal}
            editingGroup={editingGroup}
          />
          
          {/* Group Assignment Modal */}
          <ContactGroupAssignment
            isOpen={isGroupAssignmentOpen}
            onClose={handleCloseGroupAssignment}
            selectedContactIds={selectedContacts}
            selectedContactNames={selectedContactNames}
          />

          {/* Bulk Status Update Modal */}
          <BulkStatusUpdateModal
            isOpen={bulkStatusModalOpen}
            onClose={() => setBulkStatusModalOpen(false)}
            selectedContactIds={selectedContacts}
            onStatusUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
              setSelectedContacts([]);
            }}
          />

          {/* Bulk Priority Update Modal */}
          <BulkPriorityUpdateModal
            isOpen={bulkPriorityModalOpen}
            onClose={() => setBulkPriorityModalOpen(false)}
            selectedContactIds={selectedContacts}
            onPriorityUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
              setSelectedContacts([]);
            }}
          />

          {/* Bulk Contact Method Update Modal */}
          <BulkContactMethodUpdateModal
            isOpen={bulkContactMethodModalOpen}
            onClose={() => setBulkContactMethodModalOpen(false)}
            selectedContactIds={selectedContacts}
            onContactMethodUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
              setSelectedContacts([]);
            }}
          />

          {/* Bulk Notes Modal */}
          <BulkNotesModal
            isOpen={bulkNotesModalOpen}
            onClose={() => setBulkNotesModalOpen(false)}
            selectedContactIds={selectedContacts}
            onNotesUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
              setSelectedContacts([]);
            }}
          />

          {/* Bulk Timezone Modal */}
          <BulkTimezoneModal
            isOpen={bulkTimezoneModalOpen}
            onClose={() => setBulkTimezoneModalOpen(false)}
            selectedContactIds={selectedContacts}
            onTimezoneUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
              setSelectedContacts([]);
            }}
          />

          {/* Bulk Delete Modal */}
          <BulkDeleteModal
            isOpen={bulkDeleteModalOpen}
            onClose={() => setBulkDeleteModalOpen(false)}
            selectedContactIds={selectedContacts}
            onContactsDeleted={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
              setSelectedContacts([]);
            }}
          />

          {/* Group Member Viewer Modal */}
          {viewingGroup && (
            <GroupMemberViewer
              group={viewingGroup}
              isOpen={isGroupViewerOpen}
              onClose={() => {
                setIsGroupViewerOpen(false);
                setViewingGroup(null);
              }}
            />
          )}

          {/* CSV Upload Wizard */}
          <CSVUploadWizard
            isOpen={isCSVWizardOpen}
            onClose={() => setIsCSVWizardOpen(false)}
          />

          {/* Delete Group Confirmation Dialog */}
          <AlertDialog 
            open={deleteGroupDialog.isOpen} 
            onOpenChange={(open) => !open && setDeleteGroupDialog({ isOpen: false, groupId: null, groupName: null })}
          >
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-xl">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete Group
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base pt-2">
                  Are you sure you want to delete the group <strong className="text-foreground">"{deleteGroupDialog.groupName}"</strong>?
                  <br /><br />
                  This will remove all contacts from this group, but the contacts themselves will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-2">
                <AlertDialogCancel 
                  className="mt-0"
                  data-testid="button-cancel-delete-group"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteGroup}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete-group"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Delete Contacts Confirmation Dialog */}
          <AlertDialog 
            open={bulkDeleteDialog.isOpen} 
            onOpenChange={(open) => !open && setBulkDeleteDialog({ isOpen: false, count: 0 })}
          >
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-xl">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete Multiple Contacts
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base pt-2">
                  Are you sure you want to delete <strong className="text-destructive text-lg">{bulkDeleteDialog.count}</strong> contact{bulkDeleteDialog.count !== 1 ? 's' : ''}?
                  <br /><br />
                  <span className="text-destructive font-semibold">This action cannot be undone.</span> All contact information, appointments, and call history will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-2">
                <AlertDialogCancel 
                  className="mt-0"
                  data-testid="button-cancel-bulk-delete"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {bulkDeleteDialog.count} Contact{bulkDeleteDialog.count !== 1 ? 's' : ''}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}
