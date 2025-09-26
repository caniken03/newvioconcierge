import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Clock, Settings, Shield, Calendar } from "lucide-react";

const TIMEZONE_OPTIONS = [
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Dublin", label: "Dublin (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
];

interface BusinessConfigStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function BusinessConfigStep({ data, onUpdate, onNext, onPrevious }: BusinessConfigStepProps) {
  const [config, setConfig] = useState({
    timezone: data.timezone || "Europe/London",
    businessHours: {
      start: data.businessHours?.start || "09:00",
      end: data.businessHours?.end || "17:00",
    },
    operationalSettings: {
      maxCallsPerDay: data.operationalSettings?.maxCallsPerDay || 300,
      maxCallsPer15Min: data.operationalSettings?.maxCallsPer15Min || 75,
      quietStart: data.operationalSettings?.quietStart || "20:00",
      quietEnd: data.operationalSettings?.quietEnd || "08:00",
    },
    weekendCalling: {
      enabled: data.weekendCalling?.enabled !== false, // Default to true (enabled)
      saturdayHours: data.weekendCalling?.saturdayHours || { start: "09:00", end: "17:00" },
      sundayHours: data.weekendCalling?.sundayHours || { start: "10:00", end: "16:00" },
    },
  });

  // Apply business template defaults
  const applyTemplateDefaults = () => {
    switch (data.businessTemplate) {
      case 'medical':
        setConfig(prev => ({
          ...prev,
          businessHours: { start: "08:00", end: "18:00" },
          operationalSettings: {
            ...prev.operationalSettings,
            maxCallsPerDay: 500,
            maxCallsPer15Min: 100,
          },
          weekendCalling: {
            enabled: true,
            saturdayHours: { start: "08:00", end: "16:00" },
            sundayHours: { start: "10:00", end: "14:00" }
          },
        }));
        break;
      case 'salon':
        setConfig(prev => ({
          ...prev,
          businessHours: { start: "09:00", end: "19:00" },
          operationalSettings: {
            ...prev.operationalSettings,
            maxCallsPerDay: 200,
            maxCallsPer15Min: 50,
          },
          weekendCalling: {
            enabled: true,
            saturdayHours: { start: "09:00", end: "18:00" },
            sundayHours: { start: "11:00", end: "17:00" }
          },
        }));
        break;
      case 'restaurant':
        setConfig(prev => ({
          ...prev,
          businessHours: { start: "10:00", end: "22:00" },
          operationalSettings: {
            ...prev.operationalSettings,
            maxCallsPerDay: 400,
            maxCallsPer15Min: 75,
          },
          weekendCalling: {
            enabled: true,
            saturdayHours: { start: "10:00", end: "23:00" },
            sundayHours: { start: "10:00", end: "21:00" }
          },
        }));
        break;
      default:
        // General business defaults are already set
        break;
    }
  };

  const handleNext = () => {
    onUpdate(config);
    onNext();
  };

  const getBusinessTypeRecommendations = () => {
    switch (data.businessTemplate) {
      case 'medical':
        return {
          title: "Healthcare Best Practices",
          recommendations: [
            "Extended hours to accommodate patient schedules",
            "Higher call volume for appointment confirmations",
            "HIPAA-compliant communication protocols",
            "Priority handling for urgent appointments"
          ]
        };
      case 'salon':
        return {
          title: "Beauty & Wellness Optimization",
          recommendations: [
            "Evening hours for after-work appointments",
            "Moderate call volume for personal service",
            "Gentle reminder timing for relaxation services",
            "Flexible scheduling for treatment durations"
          ]
        };
      case 'restaurant':
        return {
          title: "Hospitality Excellence", 
          recommendations: [
            "Extended hours for lunch and dinner service",
            "High call volume for peak dining times",
            "Last-minute confirmation for table management",
            "Special occasion and dietary considerations"
          ]
        };
      default:
        return {
          title: "General Business Configuration",
          recommendations: [
            "Standard business hours and call volumes",
            "Balanced approach for various appointment types",
            "Flexible settings that can be adjusted later",
            "Universal compatibility with most workflows"
          ]
        };
    }
  };

  const recommendations = getBusinessTypeRecommendations();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Business Configuration</h3>
        <p className="text-muted-foreground">
          Configure operational settings and business rules for optimal performance
        </p>
      </div>

      {/* Template Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm text-blue-900">{recommendations.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-blue-800 space-y-1">
            {recommendations.recommendations.map((rec, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            onClick={applyTemplateDefaults}
            className="mt-3 text-blue-700 border-blue-300"
            data-testid="button-apply-template-defaults"
          >
            Apply Template Defaults
          </Button>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Basic Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="timezone">Business Timezone</Label>
            <Select
              value={config.timezone}
              onValueChange={(value) => setConfig(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business-start">Business Hours Start</Label>
              <Input
                id="business-start"
                type="time"
                value={config.businessHours.start}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  businessHours: { ...prev.businessHours, start: e.target.value }
                }))}
                data-testid="input-business-start"
              />
            </div>
            <div>
              <Label htmlFor="business-end">Business Hours End</Label>
              <Input
                id="business-end"
                type="time"
                value={config.businessHours.end}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  businessHours: { ...prev.businessHours, end: e.target.value }
                }))}
                data-testid="input-business-end"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Operational Limits</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-calls-day">Max Calls Per Day</Label>
              <Input
                id="max-calls-day"
                type="number"
                min="50"
                max="1000"
                value={config.operationalSettings.maxCallsPerDay}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  operationalSettings: {
                    ...prev.operationalSettings,
                    maxCallsPerDay: parseInt(e.target.value) || 300
                  }
                }))}
                data-testid="input-max-calls-day"
              />
            </div>
            <div>
              <Label htmlFor="max-calls-15min">Max Calls Per 15 Minutes</Label>
              <Input
                id="max-calls-15min"
                type="number"
                min="5"
                max="100"
                value={config.operationalSettings.maxCallsPer15Min}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  operationalSettings: {
                    ...prev.operationalSettings,
                    maxCallsPer15Min: parseInt(e.target.value) || 20
                  }
                }))}
                data-testid="input-max-calls-15min"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quiet-start">Quiet Hours Start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={config.operationalSettings.quietStart}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  operationalSettings: {
                    ...prev.operationalSettings,
                    quietStart: e.target.value
                  }
                }))}
                data-testid="input-quiet-start"
              />
            </div>
            <div>
              <Label htmlFor="quiet-end">Quiet Hours End</Label>
              <Input
                id="quiet-end"
                type="time"
                value={config.operationalSettings.quietEnd}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  operationalSettings: {
                    ...prev.operationalSettings,
                    quietEnd: e.target.value
                  }
                }))}
                data-testid="input-quiet-end"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Quiet hours prevent automatic calls during specified times (e.g., evenings and early mornings)
          </p>
        </CardContent>
      </Card>

      {/* Weekend Calling Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Weekend Calling</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Weekend Calling</Label>
              <p className="text-xs text-muted-foreground">
                Allow appointment reminders on Saturdays and Sundays
              </p>
            </div>
            <Switch
              checked={config.weekendCalling.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                weekendCalling: { ...prev.weekendCalling, enabled: checked }
              }))}
              data-testid="switch-weekend-calling"
            />
          </div>

          {config.weekendCalling.enabled && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label className="text-sm font-medium">Saturday Hours</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="saturday-start" className="text-xs">Start</Label>
                    <Input
                      id="saturday-start"
                      type="time"
                      value={config.weekendCalling.saturdayHours.start}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        weekendCalling: {
                          ...prev.weekendCalling,
                          saturdayHours: { ...prev.weekendCalling.saturdayHours, start: e.target.value }
                        }
                      }))}
                      data-testid="input-saturday-start"
                    />
                  </div>
                  <div>
                    <Label htmlFor="saturday-end" className="text-xs">End</Label>
                    <Input
                      id="saturday-end"
                      type="time"
                      value={config.weekendCalling.saturdayHours.end}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        weekendCalling: {
                          ...prev.weekendCalling,
                          saturdayHours: { ...prev.weekendCalling.saturdayHours, end: e.target.value }
                        }
                      }))}
                      data-testid="input-saturday-end"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Sunday Hours</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="sunday-start" className="text-xs">Start</Label>
                    <Input
                      id="sunday-start"
                      type="time"
                      value={config.weekendCalling.sundayHours.start}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        weekendCalling: {
                          ...prev.weekendCalling,
                          sundayHours: { ...prev.weekendCalling.sundayHours, start: e.target.value }
                        }
                      }))}
                      data-testid="input-sunday-start"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sunday-end" className="text-xs">End</Label>
                    <Input
                      id="sunday-end"
                      type="time"
                      value={config.weekendCalling.sundayHours.end}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        weekendCalling: {
                          ...prev.weekendCalling,
                          sundayHours: { ...prev.weekendCalling.sundayHours, end: e.target.value }
                        }
                      }))}
                      data-testid="input-sunday-end"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Weekend hours are typically shorter than weekdays. Many businesses operate 10am-4pm on weekends.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} data-testid="button-previous-config">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext} data-testid="button-next-config">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}