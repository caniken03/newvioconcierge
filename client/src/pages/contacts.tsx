import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ContactModal from "@/components/modals/contact-modal";
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
import type { Contact } from "@/types";

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch contacts with search
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts', { search: searchQuery, page: currentPage }],
    enabled: !!user,
  });

  const { data: contactStats = { total: 0, pending: 0, confirmed: 0 } } = useQuery({
    queryKey: ['/api/contacts/stats'],
    enabled: !!user,
  });

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

  const filteredContacts = contacts.filter((contact: Contact) => {
    if (statusFilter === "all") return true;
    return contact.appointmentStatus === statusFilter;
  });

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
                    <i className="fas fa-address-book"></i>
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
                    <i className="fas fa-clock"></i>
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
                    <i className="fas fa-check-circle"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contacts Table */}
          <Card>
            <div className="px-6 py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-foreground">Contacts</h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
                    <Input
                      type="text"
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm w-64"
                      data-testid="input-search-contacts"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Actions */}
                  <Button variant="secondary" data-testid="button-import-csv">
                    <i className="fas fa-upload text-sm mr-2"></i>
                    Import CSV
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setEditingContact(null);
                      setIsContactModalOpen(true);
                    }}
                    data-testid="button-add-contact"
                  >
                    <i className="fas fa-plus text-sm mr-2"></i>
                    Add Contact
                  </Button>
                </div>
              </div>

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
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Checkbox
                          checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Appointment
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Call History
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="text-muted-foreground">
                            <i className="fas fa-address-book text-4xl mb-4"></i>
                            <p className="text-lg font-medium mb-2">No contacts found</p>
                            <p className="text-sm">
                              {searchQuery || statusFilter !== "all" 
                                ? "Try adjusting your search or filters"
                                : "Add your first contact to get started"
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map((contact: Contact) => (
                        <tr 
                          key={contact.id} 
                          className="hover:bg-muted/30 transition-colors"
                          data-testid={`row-contact-${contact.id}`}
                        >
                          <td className="px-6 py-4">
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                              data-testid={`checkbox-contact-${contact.id}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-foreground">{contact.name}</p>
                              <p className="text-sm text-muted-foreground">{contact.phone}</p>
                              {contact.email && (
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
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
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={contact.appointmentStatus === 'confirmed' ? 'default' : 'secondary'}
                              className={
                                contact.appointmentStatus === 'confirmed'
                                  ? 'bg-green-100 text-green-800'
                                  : contact.appointmentStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : contact.appointmentStatus === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {contact.appointmentStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p className="text-foreground">
                                Attempts: {contact.callAttempts}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contact.lastCallOutcome || 'Never called'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleTriggerCall(contact.id)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-call-contact-${contact.id}`}
                                title="Trigger call"
                              >
                                <i className="fas fa-phone text-sm"></i>
                              </button>
                              <button
                                onClick={() => handleEdit(contact)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-edit-contact-${contact.id}`}
                                title="Edit contact"
                              >
                                <i className="fas fa-edit text-sm"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(contact.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                data-testid={`button-delete-contact-${contact.id}`}
                                title="Delete contact"
                              >
                                <i className="fas fa-trash text-sm"></i>
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

          {/* Contact Modal */}
          <ContactModal
            isOpen={isContactModalOpen}
            onClose={() => {
              setIsContactModalOpen(false);
              setEditingContact(null);
            }}
            contact={editingContact}
          />
        </main>
      </div>
    </div>
  );
}
