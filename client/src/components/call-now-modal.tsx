import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Phone, 
  PhoneCall,
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  User,
  PhoneOff,
  Headphones
} from "lucide-react";
import type { Contact } from "@/types";

interface CallSession {
  id: string;
  sessionId: string;
  contactId: string;
  tenantId: string;
  status: string;
  triggerTime: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  callOutcome?: string;
  retellCallId?: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface CallNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
}

function getStatusIcon(status: string, outcome?: string) {
  switch (status) {
    case 'queued':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'in_progress':
      return <PhoneCall className="h-4 w-4 text-blue-500 animate-pulse" />;
    case 'completed':
      if (outcome === 'confirmed') return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (outcome === 'voicemail') return <Headphones className="h-4 w-4 text-yellow-500" />;
      if (outcome === 'no_answer') return <PhoneOff className="h-4 w-4 text-gray-500" />;
      if (outcome === 'busy') return <PhoneOff className="h-4 w-4 text-orange-500" />;
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
}

function getStatusBadge(status: string, outcome?: string) {
  switch (status) {
    case 'queued':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Queued</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">In Progress</Badge>;
    case 'completed':
      if (outcome === 'confirmed') return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Confirmed</Badge>;
      if (outcome === 'voicemail') return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Voicemail</Badge>;
      if (outcome === 'no_answer') return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">No Answer</Badge>;
      if (outcome === 'busy') return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Busy</Badge>;
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Failed</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Failed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function formatDuration(durationSeconds?: number): string {
  if (!durationSeconds) return '';
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getCallProgress(status: string): number {
  switch (status) {
    case 'queued': return 25;
    case 'in_progress': return 50;
    case 'completed': return 100;
    case 'failed': return 100;
    default: return 0;
  }
}

export default function CallNowModal({ isOpen, onClose, contact }: CallNowModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentCallSessionId, setCurrentCallSessionId] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  // Call initiation mutation
  const initiateCallMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await apiRequest('POST', `/api/contacts/${contactId}/call`);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentCallSessionId(data.callSessionId);
      setCallStartTime(new Date());
      toast({
        title: "Call Initiated",
        description: "Voice call has been started successfully.",
      });
    },
    onError: (error: any) => {
      // Extract detailed error info including abuse protection violations
      let errorMessage = "Failed to initiate call. Please try again.";
      let errorTitle = "Call Failed";
      
      // Check if error has violations array from abuse protection
      if (error.violations && Array.isArray(error.violations)) {
        errorMessage = error.violations.join('. ');
        errorTitle = "Call Blocked";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Poll call status when we have an active session
  const { data: callSession, isLoading: isLoadingStatus } = useQuery<CallSession>({
    queryKey: [`/api/calls/${currentCallSessionId}`],
    enabled: !!currentCallSessionId && isOpen,
    refetchInterval: (query) => {
      // Stop polling when call is completed or failed
      const data = query.state.data as CallSession | undefined;
      if (!data || data.status === 'completed' || data.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds for active calls
    },
  });

  // Handle modal close
  const handleClose = () => {
    // Reset state when closing
    setCurrentCallSessionId(null);
    setCallStartTime(null);
    onClose();
  };

  // Initiate call
  const handleInitiateCall = () => {
    if (!contact) return;
    initiateCallMutation.mutate(contact.id);
  };

  // Auto-invalidate contact data when call completes
  useEffect(() => {
    if (callSession && (callSession.status === 'completed' || callSession.status === 'failed')) {
      // Invalidate contacts to refresh call attempts and last contact time
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      // Invalidate timeline to show new call event
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact?.id, 'timeline'] });
    }
  }, [callSession?.status, queryClient, contact?.id]);

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md" data-testid="call-now-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Now
          </DialogTitle>
          <DialogDescription>
            Initiate immediate voice call to this contact via AI agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Information */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium" data-testid="contact-name">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground" data-testid="contact-phone">{contact.phone}</p>
                  {contact.appointmentTime && (
                    <p className="text-xs text-muted-foreground">
                      Appointment: {new Date(contact.appointmentTime).toLocaleDateString()} at {new Date(contact.appointmentTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Status */}
          {currentCallSessionId && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Call Status</span>
                    {callSession && getStatusBadge(callSession.status, callSession.callOutcome)}
                  </div>

                  {/* Progress Bar */}
                  {callSession && (
                    <div>
                      <Progress 
                        value={getCallProgress(callSession.status)} 
                        className="h-2"
                        data-testid="call-progress"
                      />
                    </div>
                  )}

                  {/* Call Details */}
                  {callSession && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2" data-testid="call-status-detail">
                        {getStatusIcon(callSession.status, callSession.callOutcome)}
                        <span>
                          {callSession.status === 'queued' && 'Call is being initiated...'}
                          {callSession.status === 'in_progress' && 'AI agent is calling contact...'}
                          {callSession.status === 'completed' && `Call completed - ${callSession.callOutcome}`}
                          {callSession.status === 'failed' && 'Call failed to connect'}
                        </span>
                      </div>

                      {/* Call Duration */}
                      {callSession.durationSeconds && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Duration: {formatDuration(callSession.durationSeconds)}</span>
                        </div>
                      )}

                      {/* Call Time */}
                      {callSession.startTime && (
                        <div className="text-xs text-muted-foreground">
                          Started: {new Date(callSession.startTime).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loading State */}
                  {isLoadingStatus && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Checking call status...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {!currentCallSessionId ? (
              <>
                <Button
                  onClick={handleInitiateCall}
                  disabled={initiateCallMutation.isPending}
                  className="flex-1"
                  data-testid="button-initiate-call"
                >
                  {initiateCallMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PhoneCall className="h-4 w-4 mr-2" />
                  )}
                  {initiateCallMutation.isPending ? 'Initiating...' : 'Start Call'}
                </Button>
                <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
                  Cancel
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1"
                data-testid="button-close"
              >
                Close
              </Button>
            )}
          </div>

          {/* Help Text */}
          {!currentCallSessionId && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p>🤖 <strong>AI Agent Call:</strong> Our voice AI will call the contact to remind them about their appointment and confirm their attendance.</p>
              <p className="mt-1">📞 The call will be handled automatically with real-time status updates.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}