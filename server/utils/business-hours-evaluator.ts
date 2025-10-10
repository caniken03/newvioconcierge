import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { TenantConfig, BusinessHoursConfig } from '@shared/schema';

interface BusinessHoursWindow {
  start: string; // "HH:MM" format
  end: string;   // "HH:MM" format
  enabled: boolean;
}

interface EvaluationResult {
  allowed: boolean;
  reason?: string;
  nextAllowedTime?: Date;
  evaluatedWindow?: BusinessHoursWindow;
  evaluatedDay?: string;
  evaluatedTime?: string;
}

/**
 * Business Hours Evaluator - Centralized logic for business hours validation
 * 
 * Key Features:
 * - Hybrid approach: Super admin sets defaults, client admin can update
 * - Per-day scheduling: Different hours for each day of the week
 * - Proper timezone handling: Evaluates in tenant timezone
 * - Clear logging: Shows exactly why calls are allowed/blocked
 */
export class BusinessHoursEvaluator {
  
  /**
   * Evaluate if a call is allowed at the given time based on configured business hours
   */
  static evaluate(
    callTimeUTC: Date, 
    tenantConfig: TenantConfig | null, 
    businessHoursConfig: BusinessHoursConfig | null
  ): EvaluationResult {
    if (!businessHoursConfig) {
      // Fallback to default hours if no configuration exists
      return this.evaluateDefault(callTimeUTC, tenantConfig);
    }

    // Get tenant timezone from business hours config or tenant config
    const timezone = businessHoursConfig.timezone || tenantConfig?.timezone || 'Europe/London';
    
    // Convert UTC time to tenant local time
    const localTime = toZonedTime(callTimeUTC, timezone);
    const dayOfWeek = localTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const timeString = localTime.toTimeString().slice(0, 5); // "HH:MM"
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    console.log(`🕐 Evaluating business hours: ${timeString} ${dayName} (${timezone})`);

    // Get the configured hours for this specific day
    const dayHoursField = this.getDayHoursField(dayOfWeek);
    const dayHoursJson = businessHoursConfig[dayHoursField];
    
    let businessWindow: BusinessHoursWindow;
    try {
      businessWindow = typeof dayHoursJson === 'string' 
        ? JSON.parse(dayHoursJson) 
        : dayHoursJson || { start: "09:00", end: "17:00", enabled: true };
    } catch (error) {
      console.error(`Failed to parse business hours for ${dayName}:`, error);
      businessWindow = { start: "09:00", end: "17:00", enabled: true };
    }

    // Check if this day is enabled for calling
    if (!businessWindow.enabled) {
      console.log(`❌ ${dayName} is disabled for calling`);
      return {
        allowed: false,
        reason: `${dayName} is not a business day`,
        nextAllowedTime: this.getNextAllowedTime(callTimeUTC, businessHoursConfig, timezone),
        evaluatedDay: dayName,
        evaluatedTime: timeString
      };
    }

    console.log(`📅 ${dayName} business hours: ${businessWindow.start} - ${businessWindow.end}`);
    return this.evaluateTimeWindow(timeString, businessWindow, dayName, callTimeUTC, businessHoursConfig, timezone);
  }

  /**
   * Get the field name for a specific day's hours
   */
  private static getDayHoursField(dayOfWeek: number): keyof BusinessHoursConfig {
    const fields: (keyof BusinessHoursConfig)[] = [
      'sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours',
      'thursdayHours', 'fridayHours', 'saturdayHours'
    ];
    return fields[dayOfWeek];
  }

  /**
   * Check if a time falls within a business hours window
   */
  private static evaluateTimeWindow(
    timeString: string, 
    window: BusinessHoursWindow, 
    dayName: string,
    callTimeUTC: Date,
    businessHoursConfig: BusinessHoursConfig,
    timezone: string
  ): EvaluationResult {
    
    if (timeString >= window.start && timeString <= window.end) {
      console.log(`✅ Call allowed: ${timeString} within ${window.start}-${window.end} on ${dayName}`);
      return {
        allowed: true,
        evaluatedWindow: window,
        evaluatedDay: dayName,
        evaluatedTime: timeString
      };
    }

    console.log(`❌ Call blocked: ${timeString} outside ${window.start}-${window.end} on ${dayName}`);
    return {
      allowed: false,
      reason: `Outside business hours (${window.start} - ${window.end}) on ${dayName}`,
      nextAllowedTime: this.getNextAllowedTime(callTimeUTC, businessHoursConfig, timezone),
      evaluatedWindow: window,
      evaluatedDay: dayName,
      evaluatedTime: timeString
    };
  }

  /**
   * Default business hours for tenants without configuration
   */
  private static evaluateDefault(callTimeUTC: Date, tenantConfig: TenantConfig | null): EvaluationResult {
    const localTime = new Date(callTimeUTC); // Assume UTC for default
    const dayOfWeek = localTime.getDay();
    const hour = localTime.getHours();
    const timeString = localTime.toTimeString().slice(0, 5);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    // Default: No weekend calling
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        allowed: false,
        reason: `Default policy: Weekend calling not allowed on ${dayName}`,
        evaluatedDay: dayName,
        evaluatedTime: timeString
      };
    }

    // Default business hours: 8 AM - 8 PM
    if (hour >= 8 && hour < 20) {
      return {
        allowed: true,
        evaluatedWindow: { start: "08:00", end: "20:00", enabled: true },
        evaluatedDay: dayName,
        evaluatedTime: timeString
      };
    }

    return {
      allowed: false,
      reason: `Default policy: Outside business hours (08:00 - 20:00) on ${dayName}`,
      evaluatedDay: dayName,
      evaluatedTime: timeString
    };
  }

  /**
   * Calculate next allowed call time based on business hours configuration
   * CRITICAL: Always returns a time strictly in the future
   */
  private static getNextAllowedTime(
    callTimeUTC: Date, 
    businessHoursConfig: BusinessHoursConfig, 
    timezone: string
  ): Date {
    const currentLocalTime = toZonedTime(callTimeUTC, timezone);
    let nextTime = new Date(callTimeUTC);
    
    // Try the next 7 days to find an enabled business day with future hours
    for (let i = 0; i < 7; i++) {
      const localTime = toZonedTime(nextTime, timezone);
      const dayOfWeek = localTime.getDay();
      
      // Get business hours for this day
      const dayHoursField = this.getDayHoursField(dayOfWeek);
      const dayHoursJson = businessHoursConfig[dayHoursField];
      
      let dayHours: BusinessHoursWindow;
      try {
        dayHours = typeof dayHoursJson === 'string' 
          ? JSON.parse(dayHoursJson) 
          : dayHoursJson || { start: "09:00", end: "17:00", enabled: false };
      } catch (error) {
        dayHours = { start: "09:00", end: "17:00", enabled: false };
      }
      
      // If this day is enabled, check if business start is in the future
      if (dayHours.enabled) {
        const [startHour, startMinute] = dayHours.start.split(':').map(Number);
        const businessStart = new Date(localTime);
        businessStart.setHours(startHour, startMinute, 0, 0);
        
        const businessStartUTC = fromZonedTime(businessStart, timezone);
        
        // Only return if this time is strictly after the current call time
        if (businessStartUTC > callTimeUTC) {
          return businessStartUTC;
        }
      }
      
      // Try next day (advance by 1 day)
      nextTime = new Date(nextTime.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // CRITICAL: If no enabled days found within 7 days, this indicates business hours misconfiguration
    // Return a far-future date (30 days) to prevent infinite rescheduling loops
    // Callers should detect this as an error condition (no valid business hours)
    console.warn('⚠️ No enabled business days found within 7-day window - business hours may be misconfigured');
    return new Date(callTimeUTC.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}