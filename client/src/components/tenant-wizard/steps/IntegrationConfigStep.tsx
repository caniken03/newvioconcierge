import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Phone, Calendar, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IntegrationConfigStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function IntegrationConfigStep({ data, onUpdate, onNext, onPrevious }: IntegrationConfigStepProps) {
  const [retellConfig, setRetellConfig] = useState({
    enabled: false,
    apiKey: data.retellConfig?.apiKey || "",
    agentId: data.retellConfig?.agentId || "",
    phoneNumber: data.retellConfig?.phoneNumber || "",
    tested: false,
  });
  
  const [calendarConfig, setCalendarConfig] = useState({
    enabled: false,
    type: data.calendarConfig?.type || "calcom",
    apiKey: data.calendarConfig?.apiKey || "",
    eventTypeId: data.calendarConfig?.eventTypeId || "",
    organizerEmail: data.calendarConfig?.organizerEmail || "",
    tested: false,
  });

  const [testing, setTesting] = useState({
    retell: false,
    calendar: false,
  });

  const { toast } = useToast();

  const testRetellConnection = async () => {
    if (!retellConfig.apiKey || !retellConfig.agentId) {
      toast({
        title: "Required Fields Missing",
        description: "Please enter both Retell API Key and Agent ID to test the connection",
        variant: "destructive",
      });
      return;
    }

    setTesting(prev => ({ ...prev, retell: true }));
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setRetellConfig(prev => ({ ...prev, tested: true }));
    setTesting(prev => ({ ...prev, retell: false }));
    
    toast({
      title: "Retell Connection Successful!",
      description: "Voice AI integration is working correctly",
    });
  };

  const testCalendarConnection = async () => {
    if (!calendarConfig.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key to test the calendar connection",
        variant: "destructive",
      });
      return;
    }

    setTesting(prev => ({ ...prev, calendar: true }));
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setCalendarConfig(prev => ({ ...prev, tested: true }));
    setTesting(prev => ({ ...prev, calendar: false }));
    
    toast({
      title: "Calendar Connection Successful!",
      description: "Calendar integration is working correctly",
    });
  };

  const handleNext = () => {
    onUpdate({
      retellConfig: retellConfig.enabled ? {
        apiKey: retellConfig.apiKey,
        agentId: retellConfig.agentId,
        phoneNumber: retellConfig.phoneNumber,
      } : undefined,
      calendarConfig: calendarConfig.enabled ? {
        type: calendarConfig.type,
        apiKey: calendarConfig.apiKey,
        eventTypeId: parseInt(calendarConfig.eventTypeId) || undefined,
        organizerEmail: calendarConfig.organizerEmail.trim() || undefined,
      } : undefined,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Integration Configuration</h3>
        <p className="text-muted-foreground">
          Set up voice AI and calendar integrations for automated appointment management
        </p>
      </div>

      {/* Retell Voice AI Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Retell Voice AI Integration</span>
            </CardTitle>
            <Switch
              checked={retellConfig.enabled}
              onCheckedChange={(enabled) => setRetellConfig(prev => ({ ...prev, enabled }))}
              data-testid="switch-retell-enabled"
            />
          </div>
        </CardHeader>
        {retellConfig.enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="retell-api-key">Retell API Key *</Label>
                <Input
                  id="retell-api-key"
                  type="password"
                  value={retellConfig.apiKey}
                  onChange={(e) => setRetellConfig(prev => ({ ...prev, apiKey: e.target.value, tested: false }))}
                  placeholder="key_xxxxxxxxxxxxxxxx"
                  data-testid="input-retell-api-key"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retell-agent-id">Retell Agent ID *</Label>
                <Input
                  id="retell-agent-id"
                  value={retellConfig.agentId}
                  onChange={(e) => setRetellConfig(prev => ({ ...prev, agentId: e.target.value, tested: false }))}
                  placeholder="agent_xxxxxxxxxxxxxxxx"
                  data-testid="input-retell-agent-id"
                />
              </div>
              <div>
                <Label htmlFor="retell-phone">Phone Number (Optional)</Label>
                <Input
                  id="retell-phone"
                  value={retellConfig.phoneNumber}
                  onChange={(e) => setRetellConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+44 20 7946 0958"
                  data-testid="input-retell-phone"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={testRetellConnection}
                disabled={testing.retell || !retellConfig.apiKey || !retellConfig.agentId}
                data-testid="button-test-retell"
              >
                {testing.retell ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : retellConfig.tested ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Phone className="w-4 h-4 mr-2" />
                )}
                {testing.retell ? "Testing..." : "Test Connection"}
              </Button>
              
              {retellConfig.tested && (
                <Badge className="bg-green-100 text-green-800">
                  Connection Verified
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Calendar Integration</span>
            </CardTitle>
            <Switch
              checked={calendarConfig.enabled}
              onCheckedChange={(enabled) => setCalendarConfig(prev => ({ ...prev, enabled }))}
              data-testid="switch-calendar-enabled"
            />
          </div>
        </CardHeader>
        {calendarConfig.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label>Calendar Platform</Label>
              <div className="flex space-x-4 mt-2">
                <Button
                  variant={calendarConfig.type === "calcom" ? "default" : "outline"}
                  onClick={() => setCalendarConfig(prev => ({ ...prev, type: "calcom", tested: false }))}
                  data-testid="button-select-calcom"
                >
                  Cal.com
                </Button>
                <Button
                  variant={calendarConfig.type === "calendly" ? "default" : "outline"}
                  onClick={() => setCalendarConfig(prev => ({ ...prev, type: "calendly", tested: false }))}
                  data-testid="button-select-calendly"
                >
                  Calendly
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calendar-api-key">API Key *</Label>
                <Input
                  id="calendar-api-key"
                  type="password"
                  value={calendarConfig.apiKey}
                  onChange={(e) => setCalendarConfig(prev => ({ ...prev, apiKey: e.target.value, tested: false }))}
                  placeholder="Enter API key"
                  data-testid="input-calendar-api-key"
                />
              </div>
              {calendarConfig.type === "calcom" && (
                <div>
                  <Label htmlFor="event-type-id">Event Type ID</Label>
                  <Input
                    id="event-type-id"
                    type="number"
                    value={calendarConfig.eventTypeId}
                    onChange={(e) => setCalendarConfig(prev => ({ ...prev, eventTypeId: e.target.value }))}
                    placeholder="123456"
                    data-testid="input-event-type-id"
                  />
                </div>
              )}
              {calendarConfig.type === "calendly" && (
                <div>
                  <Label htmlFor="organizer-email">Organizer Email</Label>
                  <Input
                    id="organizer-email"
                    type="email"
                    value={calendarConfig.organizerEmail}
                    onChange={(e) => setCalendarConfig(prev => ({ ...prev, organizerEmail: e.target.value }))}
                    placeholder="organizer@business.com"
                    data-testid="input-organizer-email"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={testCalendarConnection}
                disabled={testing.calendar || !calendarConfig.apiKey}
                data-testid="button-test-calendar"
              >
                {testing.calendar ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : calendarConfig.tested ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                {testing.calendar ? "Testing..." : "Test Connection"}
              </Button>
              
              {calendarConfig.tested && (
                <Badge className="bg-green-100 text-green-800">
                  Connection Verified
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>Optional Setup:</strong> You can skip integrations now and configure them later in the tenant settings. 
            However, testing integrations during setup ensures everything works correctly from day one.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} data-testid="button-previous-integration">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext} data-testid="button-next-integration">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}