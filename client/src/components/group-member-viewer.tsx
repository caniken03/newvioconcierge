import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  Phone,
  Grid3X3,
  List,
  ScanEye,
  PhoneCall,
  UserMinus,
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Filter,
  ArrowUpDown,
  PhoneIcon,
} from "lucide-react";
import { BulkCallConfigModal, type BulkCallConfig } from "@/components/modals/bulk-call-config-modal";
import type { ContactGroup, Contact } from "@/types";

interface GroupMemberViewerProps {
  group: ContactGroup;
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'grid' | 'list' | 'detailed';
type SortOption = 'name' | 'appointment_time' | 'appointment_status' | 'last_contact' | 'call_attempts' | 'added_to_group';
type FilterOption = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';

export function GroupMemberViewer({ group, isOpen, onClose }: GroupMemberViewerProps) {
  const { toast } = useToast();
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [showBulkCallConfig, setShowBulkCallConfig] = useState(false);
  const [bulkCallContactIds, setBulkCallContactIds] = useState<string[]>([]);

  // Fetch group members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['/api/contact-groups', group?.id, 'contacts'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contact-groups/${group.id}/contacts`);
      return await response.json() as Contact[];
    },
    enabled: isOpen && !!group?.id,
  });

  // Bulk call mutation with configuration support
  const bulkCallMutation = useMutation({
    mutationFn: async ({ contactIds, config }: { contactIds: string[], config: BulkCallConfig }) => {
      return await apiRequest('POST', '/api/call-sessions/bulk', {
        contactIds,
        groupId: group.id,
        callTiming: config.callTiming,
        scheduledDateTime: config.scheduledDateTime,
        staggerDurationMinutes: config.staggerDurationMinutes,
        overrideCallTiming: config.overrideCallTiming,
        customHoursBefore: config.customHoursBefore,
        customMessage: config.customMessage,
        priorityLevel: config.priorityLevel,
      });
    },
    onSuccess: (response, variables) => {
      toast({
        title: "Bulk call campaign initiated",
        description: `Started calling ${variables.contactIds.length} contacts from ${group.name}`,
      });
      setSelectedContactIds([]);
      setBulkCallContactIds([]);
      setShowBulkCallConfig(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start calls",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove contact from group mutation
  const removeContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      return await apiRequest('DELETE', `/api/contact-groups/${group.id}/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-groups', group.id, 'contacts'] });
      toast({
        title: "Contact removed",
        description: "Contact removed from group successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedContactIds([]);
      setSortBy('name');
      setSortDirection('asc');
      setStatusFilter('all');
    }
  }, [isOpen]);

  // Filter and sort members
  const filteredAndSortedMembers = members
    .filter(member => {
      // Search filter
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.appointmentType?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || member.appointmentStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'appointment_time':
          aValue = a.appointmentTime ? new Date(a.appointmentTime).getTime() : 0;
          bValue = b.appointmentTime ? new Date(b.appointmentTime).getTime() : 0;
          break;
        case 'appointment_status':
          aValue = a.appointmentStatus;
          bValue = b.appointmentStatus;
          break;
        case 'call_attempts':
          aValue = a.callAttempts || 0;
          bValue = b.callAttempts || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    if (selectedContactIds.length === filteredAndSortedMembers.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredAndSortedMembers.map(c => c.id));
    }
  };

  const handleBulkCall = () => {
    if (selectedContactIds.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select contacts to call",
        variant: "destructive",
      });
      return;
    }
    setBulkCallContactIds(selectedContactIds);
    setShowBulkCallConfig(true);
  };

  const handleBulkCallConfig = (config: any) => {
    bulkCallMutation.mutate({ contactIds: bulkCallContactIds, config });
  };

  const handleCallEntireGroup = () => {
    const allContactIds = members.map(m => m.id);
    setBulkCallContactIds(allContactIds);
    setShowBulkCallConfig(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'rescheduled': return <Calendar className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderContactCard = (contact: Contact) => {
    const isSelected = selectedContactIds.includes(contact.id);
    
    if (viewMode === 'grid') {
      return (
        <Card 
          key={contact.id}
          className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => toggleContactSelection(contact.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={isSelected}
                  onChange={() => toggleContactSelection(contact.id)}
                  data-testid={`checkbox-contact-${contact.id}`}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Phone className="w-3 h-3 mr-2" />
                    Call Now
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="w-3 h-3 mr-2" />
                    Edit Contact
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => removeContactMutation.mutate(contact.id)}
                    className="text-red-600"
                  >
                    <UserMinus className="w-3 h-3 mr-2" />
                    Remove from Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {contact.appointmentTime && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(contact.appointmentStatus)}
                  <span className="text-xs">
                    {new Date(contact.appointmentTime).toLocaleDateString()}
                  </span>
                </div>
                <Badge variant={contact.appointmentStatus === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                  {contact.appointmentStatus}
                </Badge>
              </div>
            )}
            
            {contact.appointmentType && (
              <p className="text-xs text-muted-foreground mt-2">{contact.appointmentType}</p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (viewMode === 'list') {
      return (
        <div 
          key={contact.id}
          className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => toggleContactSelection(contact.id)}
        >
          <Checkbox
            checked={isSelected}
            onChange={() => toggleContactSelection(contact.id)}
            data-testid={`checkbox-contact-${contact.id}`}
          />
          <div className="flex-1 grid grid-cols-4 gap-4">
            <div>
              <p className="font-medium">{contact.name}</p>
              <p className="text-sm text-muted-foreground">{contact.phone}</p>
            </div>
            <div>
              <p className="text-sm">{contact.appointmentType || 'No type'}</p>
              <p className="text-xs text-muted-foreground">
                {contact.appointmentTime ? new Date(contact.appointmentTime).toLocaleDateString() : 'No appointment'}
              </p>
            </div>
            <div className="flex items-center">
              <Badge variant={contact.appointmentStatus === 'confirmed' ? 'default' : 'secondary'}>
                {contact.appointmentStatus}
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm">
                <Phone className="w-3 h-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="w-3 h-3 mr-2" />
                    Edit Contact
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => removeContactMutation.mutate(contact.id)}
                    className="text-red-600"
                  >
                    <UserMinus className="w-3 h-3 mr-2" />
                    Remove from Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      );
    }

    // Detailed view
    return (
      <Card key={contact.id} className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={isSelected}
                onChange={() => toggleContactSelection(contact.id)}
                data-testid={`checkbox-contact-${contact.id}`}
              />
              <div>
                <h3 className="font-semibold">{contact.name}</h3>
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                {contact.email && (
                  <p className="text-sm text-muted-foreground">{contact.email}</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Contact
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => removeContactMutation.mutate(contact.id)}
                  className="text-red-600"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Remove from Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Appointment</p>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon(contact.appointmentStatus)}
                <span className="text-sm">
                  {contact.appointmentTime 
                    ? new Date(contact.appointmentTime).toLocaleString()
                    : 'No appointment scheduled'
                  }
                </span>
              </div>
              {contact.appointmentType && (
                <p className="text-sm text-muted-foreground mt-1">{contact.appointmentType}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Call History</p>
              <p className="text-sm mt-1">
                {contact.callAttempts || 0} attempt{(contact.callAttempts || 0) !== 1 ? 's' : ''}
              </p>
              {contact.lastCallOutcome && (
                <p className="text-sm text-muted-foreground mt-1">Last: {contact.lastCallOutcome}</p>
              )}
            </div>
          </div>
          
          {contact.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm mt-1">{contact.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name} Members
              <Badge variant="secondary">{members.length} contacts</Badge>
            </DialogTitle>
            <DialogDescription>
              {group.description || "Manage and communicate with group members"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                {/* View Mode Selector */}
                <div className="flex items-center space-x-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    data-testid="view-mode-grid"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    data-testid="view-mode-list"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('detailed')}
                    data-testid="view-mode-detailed"
                  >
                    <ScanEye className="w-4 h-4" />
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search-members"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Filters */}
                <Select value={statusFilter} onValueChange={(value: FilterOption) => setStatusFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="appointment_time">Appointment Date</SelectItem>
                    <SelectItem value="appointment_status">Appointment Status</SelectItem>
                    <SelectItem value="call_attempts">Call Attempts</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedContactIds.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedContactIds.length === filteredAndSortedMembers.length}
                    onCheckedChange={selectAllContacts}
                    data-testid="checkbox-select-all-members"
                  />
                  <span className="text-sm font-medium">
                    {selectedContactIds.length} of {filteredAndSortedMembers.length} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkCall}
                    disabled={bulkCallMutation.isPending}
                    data-testid="button-bulk-call-selected"
                  >
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Call Selected ({selectedContactIds.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedContactIds([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

            {/* One-Click Group Call */}
            <div className="flex justify-center">
              <Button
                onClick={handleCallEntireGroup}
                disabled={members.length === 0 || bulkCallMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-call-entire-group"
              >
                <PhoneIcon className="w-4 h-4 mr-2" />
                Call Entire Group ({members.length} contacts)
              </Button>
            </div>

            {/* Members List */}
            <ScrollArea className="flex-1 max-h-96">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading group members...
                </div>
              ) : filteredAndSortedMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? "No members match your filters" 
                    : "No members in this group yet"
                  }
                </div>
              ) : (
                <div className={`space-y-3 p-4 ${
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
                    : 'space-y-3'
                }`}>
                  {filteredAndSortedMembers.map(renderContactCard)}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Call Configuration Modal */}
      <BulkCallConfigModal
        isOpen={showBulkCallConfig}
        onClose={() => setShowBulkCallConfig(false)}
        onConfirm={handleBulkCallConfig}
        contactCount={bulkCallContactIds.length}
        groupName={group.name}
        isLoading={bulkCallMutation.isPending}
      />
    </>
  );
}