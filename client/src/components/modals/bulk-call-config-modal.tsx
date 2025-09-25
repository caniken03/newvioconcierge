import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Phone,
  Users,
  Calendar,
  Timer,
  AlertCircle,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface BulkCallConfig {
  callTiming: 'immediate' | 'scheduled' | 'staggered';
  scheduledDateTime?: string;
  staggerDurationMinutes?: number;
  overrideCallTiming: boolean;
  customHoursBefore?: number;
  customMessage?: string;
  priorityLevel: 'normal' | 'high' | 'urgent';
}

interface BulkCallConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: BulkCallConfig) => void;
  contactCount: number;
  groupName: string;
  isLoading?: boolean;
}

export function BulkCallConfigModal({
  isOpen,
  onClose,
  onConfirm,
  contactCount,
  groupName,
  isLoading = false,
}: BulkCallConfigModalProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<BulkCallConfig>({
    callTiming: 'immediate',
    overrideCallTiming: false,
    priorityLevel: 'normal',
  });

  const [showSafetyConfirmation, setShowSafetyConfirmation] = useState(false);

  const updateConfig = (updates: Partial<BulkCallConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const calculateEstimatedCompletion = () => {
    const CALLS_PER_BATCH = 5;
    const BATCH_DELAY_SECONDS = 30;
    const totalBatches = Math.ceil(contactCount / CALLS_PER_BATCH);
    const totalTimeMinutes = (totalBatches * BATCH_DELAY_SECONDS) / 60;

    if (config.callTiming === 'immediate') {
      return `~${Math.ceil(totalTimeMinutes)} minutes`;
    } else if (config.callTiming === 'staggered' && config.staggerDurationMinutes) {
      return `${config.staggerDurationMinutes} minutes (staggered)`;
    } else if (config.callTiming === 'scheduled') {
      return 'At scheduled time';
    }
    return 'Unknown';
  };

  const getEstimatedCost = () => {
    // Placeholder cost calculation - would integrate with actual billing
    const costPerCall = 0.02; // $0.02 per call
    return (contactCount * costPerCall).toFixed(2);
  };

  const validateConfig = (): string | null => {
    if (config.callTiming === 'scheduled' && !config.scheduledDateTime) {
      return 'Please select a date and time for scheduled calling';
    }
    if (config.callTiming === 'staggered' && !config.staggerDurationMinutes) {
      return 'Please select a duration for staggered calling';
    }
    if (config.overrideCallTiming && (!config.customHoursBefore || config.customHoursBefore < 1)) {
      return 'Please specify valid hours before appointment (minimum 1 hour)';
    }
    return null;
  };

  const handleProceed = () => {
    const validationError = validateConfig();
    if (validationError) {
      toast({
        title: "Configuration Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    if (contactCount > 10) {
      setShowSafetyConfirmation(true);
    } else {
      onConfirm(config);
    }
  };

  const handleConfirmAfterSafety = () => {
    setShowSafetyConfirmation(false);
    onConfirm(config);
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTimingDescription = () => {
    switch (config.callTiming) {
      case 'immediate':
        return 'Calls will start immediately with rate limiting (5 calls per 30 seconds)';
      case 'scheduled':
        return 'Calls will start at the specified date and time';
      case 'staggered':
        return 'Calls will be spread evenly over the specified time period';
      default:
        return '';
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showSafetyConfirmation} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Configure Bulk Call Campaign
            </DialogTitle>
            <DialogDescription>
              Configure calling options for <strong>{contactCount}</strong> contacts from "{groupName}"
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="timing" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timing">Call Timing</TabsTrigger>
              <TabsTrigger value="customization">Customization</TabsTrigger>
              <TabsTrigger value="safety">Safety Check</TabsTrigger>
            </TabsList>

            <TabsContent value="timing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    When to Start Calling
                  </CardTitle>
                  <CardDescription>
                    {getTimingDescription()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="immediate"
                        name="timing"
                        checked={config.callTiming === 'immediate'}
                        onChange={() => updateConfig({ callTiming: 'immediate' })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="immediate" className="font-medium">Call Immediately</Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Start calling all contacts right now with automatic rate limiting
                    </p>

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="scheduled"
                        name="timing"
                        checked={config.callTiming === 'scheduled'}
                        onChange={() => updateConfig({ callTiming: 'scheduled' })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="scheduled" className="font-medium">Schedule for Later</Label>
                    </div>
                    {config.callTiming === 'scheduled' && (
                      <div className="ml-6">
                        <Label htmlFor="scheduled-time">When to start calling</Label>
                        <Input
                          id="scheduled-time"
                          type="datetime-local"
                          value={config.scheduledDateTime || ''}
                          onChange={(e) => updateConfig({ scheduledDateTime: e.target.value })}
                          className="w-full mt-1"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="staggered"
                        name="timing"
                        checked={config.callTiming === 'staggered'}
                        onChange={() => updateConfig({ callTiming: 'staggered' })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="staggered" className="font-medium">Staggered Calling</Label>
                    </div>
                    {config.callTiming === 'staggered' && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="stagger-duration">Spread calls over (minutes)</Label>
                        <Select
                          value={config.staggerDurationMinutes?.toString() || ''}
                          onValueChange={(value) => updateConfig({ staggerDurationMinutes: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Call Customization
                  </CardTitle>
                  <CardDescription>
                    Customize the calling behavior and messaging
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Call Priority</Label>
                    <Select
                      value={config.priorityLevel}
                      onValueChange={(value: 'normal' | 'high' | 'urgent') => 
                        updateConfig({ priorityLevel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal Priority</SelectItem>
                        <SelectItem value="high">High Priority (processed first)</SelectItem>
                        <SelectItem value="urgent">Urgent (bypasses some rate limits)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge className={getPriorityBadgeColor(config.priorityLevel)}>
                      {config.priorityLevel.toUpperCase()} PRIORITY
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="override-timing"
                        checked={config.overrideCallTiming}
                        onCheckedChange={(checked) => 
                          updateConfig({ overrideCallTiming: checked as boolean })
                        }
                      />
                      <Label htmlFor="override-timing">Override Individual Call Timing</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use group-specific timing instead of individual contact preferences
                    </p>
                    
                    {config.overrideCallTiming && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="hours-before">Hours before appointment</Label>
                        <Input
                          id="hours-before"
                          type="number"
                          min="1"
                          max="168"
                          value={config.customHoursBefore || ''}
                          onChange={(e) => updateConfig({ 
                            customHoursBefore: parseInt(e.target.value) || undefined 
                          })}
                          placeholder="24"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="custom-message">Additional Message (Optional)</Label>
                    <Textarea
                      id="custom-message"
                      placeholder="This is a special reminder for our VIP patients..."
                      maxLength={200}
                      value={config.customMessage || ''}
                      onChange={(e) => updateConfig({ customMessage: e.target.value })}
                      className="min-h-20"
                    />
                    <p className="text-xs text-muted-foreground">
                      {config.customMessage?.length || 0}/200 characters
                    </p>
                    {config.customMessage && config.customMessage.length > 0 && (
                      <div className="flex items-start gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          Ensure message complies with HIPAA if this is a medical practice
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="safety" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Safety Confirmation
                  </CardTitle>
                  <CardDescription>
                    Review the impact and estimated completion time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Contacts</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{contactCount}</p>
                      <p className="text-sm text-muted-foreground">contacts to call</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Completion</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{calculateEstimatedCompletion()}</p>
                      <p className="text-sm text-muted-foreground">estimated time</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">Estimated Cost</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">${getEstimatedCost()}</p>
                      <p className="text-sm text-muted-foreground">approximate cost</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">Rate Limiting</span>
                      </div>
                      <p className="text-sm font-bold text-orange-600">5 calls/30sec</p>
                      <p className="text-sm text-muted-foreground">automatic limits</p>
                    </Card>
                  </div>

                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">How to Stop Campaign</h4>
                    <p className="text-sm text-blue-700">
                      You can stop the calling campaign at any time from the Call History page. 
                      Already initiated calls will complete, but no new calls will be started.
                    </p>
                  </div>

                  {contactCount > 25 && (
                    <div className="bg-amber-50 p-4 rounded border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-900">Large Group Warning</h4>
                          <p className="text-sm text-amber-700">
                            You're about to call {contactCount} contacts. This will take significant time 
                            and may impact your calling limits. Consider using staggered calling.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleProceed}
              disabled={isLoading || (config.callTiming === 'scheduled' && !config.scheduledDateTime)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Starting Campaign..." : `Start Calling ${contactCount} Contacts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Safety Confirmation for Large Groups */}
      <Dialog open={showSafetyConfirmation} onOpenChange={setShowSafetyConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Large Group Confirmation
            </DialogTitle>
            <DialogDescription>
              You are about to initiate calls to <strong>{contactCount} contacts</strong> from "{groupName}". 
              This is a significant operation that will take approximately {calculateEstimatedCompletion()} to complete.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 p-4 rounded border border-amber-200">
            <h4 className="font-medium text-amber-900 mb-2">Please Confirm:</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• You have reviewed the calling configuration</li>
              <li>• You understand this will consume calling credits</li>
              <li>• You can stop the campaign at any time if needed</li>
              <li>• All contacts have consented to receiving calls</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSafetyConfirmation(false)}>
              Go Back
            </Button>
            <Button 
              onClick={handleConfirmAfterSafety}
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? "Starting..." : "Confirm & Start Calling"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}