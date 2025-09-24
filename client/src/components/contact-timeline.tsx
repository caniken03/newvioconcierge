import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Clock, 
  Users, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  MessageSquare,
  Activity
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  description: string;
  status: string;
  outcome?: string;
  duration?: number;
  metadata?: any;
}

interface ContactTimelineData {
  contactId: string;
  totalEvents: number;
  events: TimelineEvent[];
}

function getEventIcon(type: string, status: string, outcome?: string) {
  switch (type) {
    case 'call_session':
      if (outcome === 'confirmed') return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (outcome === 'voicemail' || outcome === 'no_answer') return <MessageSquare className="h-4 w-4 text-yellow-500" />;
      if (outcome === 'failed' || outcome === 'busy') return <XCircle className="h-4 w-4 text-red-500" />;
      return <Phone className="h-4 w-4 text-blue-500" />;
    case 'follow_up_task':
      if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
      if (status === 'processing') return <Activity className="h-4 w-4 text-blue-500" />;
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'group_membership':
      return <Users className="h-4 w-4 text-purple-500" />;
    case 'contact_lifecycle':
      return <UserPlus className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
}

function getEventBadgeColor(type: string, status: string, outcome?: string) {
  switch (type) {
    case 'call_session':
      if (outcome === 'confirmed') return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      if (outcome === 'voicemail' || outcome === 'no_answer') return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      if (outcome === 'failed' || outcome === 'busy') return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case 'follow_up_task':
      if (status === 'completed') return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      if (status === 'failed') return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case 'group_membership':
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case 'contact_lifecycle':
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatEventType(type: string) {
  switch (type) {
    case 'call_session': return 'Call';
    case 'follow_up_task': return 'Task';
    case 'group_membership': return 'Group';
    case 'contact_lifecycle': return 'Lifecycle';
    default: return type;
  }
}

interface ContactTimelineProps {
  contactId: string;
}

export function ContactTimeline({ contactId }: ContactTimelineProps) {
  const { data: timeline, isLoading, error } = useQuery<ContactTimelineData>({
    queryKey: ['/api/contacts', contactId, 'timeline'],
    enabled: !!contactId,
  });

  if (isLoading) {
    return (
      <Card data-testid="contact-timeline-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Contact Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 items-start animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="contact-timeline-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Timeline Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load contact timeline. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!timeline || timeline.events.length === 0) {
    return (
      <Card data-testid="contact-timeline-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Contact Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No timeline events found for this contact.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="contact-timeline">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Contact Timeline
          <Badge variant="secondary" className="ml-auto">
            {timeline.totalEvents} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4" data-testid="timeline-events">
            {timeline.events.map((event, index) => (
              <div key={event.id}>
                <div className="flex gap-4 items-start" data-testid={`timeline-event-${event.id}`}>
                  {/* Event Icon */}
                  <div className="flex-shrink-0 w-8 h-8 bg-background border-2 border-border rounded-full flex items-center justify-center">
                    {getEventIcon(event.type, event.status, event.outcome)}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground" data-testid={`event-title-${event.id}`}>
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={getEventBadgeColor(event.type, event.status, event.outcome)}
                          data-testid={`event-type-${event.id}`}
                        >
                          {formatEventType(event.type)}
                        </Badge>
                        <span 
                          className="text-xs text-muted-foreground whitespace-nowrap"
                          title={format(new Date(event.timestamp), "PPpp")}
                          data-testid={`event-time-${event.id}`}
                        >
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2" data-testid={`event-description-${event.id}`}>
                      {event.description}
                    </p>

                    {/* Event Metadata */}
                    {event.metadata && (
                      <div className="space-y-1">
                        {/* Call Duration */}
                        {event.type === 'call_session' && event.metadata.durationFormatted && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Duration: {event.metadata.durationFormatted}</span>
                          </div>
                        )}

                        {/* Follow-up Task Details */}
                        {event.type === 'follow_up_task' && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {event.metadata.scheduledTime && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Scheduled: {format(new Date(event.metadata.scheduledTime), "PPp")}
                                </span>
                              </div>
                            )}
                            {event.metadata.attempts > 0 && (
                              <span>Attempts: {event.metadata.attempts}</span>
                            )}
                          </div>
                        )}

                        {/* Group Details */}
                        {event.type === 'group_membership' && event.metadata.groupName && (
                          <div className="flex items-center gap-1 text-xs">
                            <Badge 
                              variant="outline" 
                              style={{ 
                                backgroundColor: event.metadata.groupColor + '20',
                                borderColor: event.metadata.groupColor,
                                color: event.metadata.groupColor
                              }}
                            >
                              {event.metadata.groupName}
                            </Badge>
                          </div>
                        )}

                        {/* Contact Status */}
                        {event.type === 'contact_lifecycle' && event.metadata.appointmentStatus && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Status: {event.metadata.appointmentStatus}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Separator between events (except last) */}
                {index < timeline.events.length - 1 && (
                  <div className="ml-4 mt-4">
                    <Separator orientation="horizontal" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}