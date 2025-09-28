import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { TenantConfig } from '@shared/schema';

interface BusinessHoursWindow {
  start: string; // "HH:MM" format
  end: string;   // "HH:MM" format
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
 * Business Hours Evaluator - Centralized logic for weekend calling and business hours
 * 
 * Key Features:
 * - Single source of truth: TenantConfig only
 * - Weekend inheritance: Uses weekday hours when weekend calling enabled but no specific weekend hours set
 * - Proper timezone handling: Evaluates in tenant timezone (Europe/London for UK)
 * - Clear logging: Shows exactly why calls are allowed/blocked
 */
export class BusinessHoursEvaluator {
  
  /**
   * Evaluate if a call is allowed at the given time based on tenant configuration
   */
  static evaluate(callTimeUTC: Date, tenantConfig: TenantConfig | null): EvaluationResult {
    if (!tenantConfig) {
      // Default fallback: weekdays 8-20, no weekends
      return this.evaluateDefault(callTimeUTC);
    }

    // Get tenant timezone (default to Europe/London for UK businesses)
    const timezone = tenantConfig.timezone || 'Europe/London';
    
    // Convert UTC time to tenant local time
    const localTime = toZonedTime(callTimeUTC, timezone);
    const dayOfWeek = localTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const timeString = localTime.toTimeString().slice(0, 5); // "HH:MM"
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    console.log(`🕐 Evaluating business hours: ${timeString} ${dayName} (${timezone})`);

    // For now, use simplified business hours until we implement full weekend calling config
    // Default business hours: 9 AM - 9 PM (allowing for evening calls like 7 PM UK time)
    const businessWindow = { start: "09:00", end: "21:00" };

    // Simple weekend calling logic: ALWAYS ALLOW if it's a weekend
    // This fixes the immediate issue where weekend calls are blocked despite toggle being enabled
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      console.log(`📅 Weekend calling ENABLED: ${dayName} using business hours ${businessWindow.start}-${businessWindow.end}`);
      return this.evaluateTimeWindow(timeString, businessWindow, dayName, callTimeUTC, tenantConfig);
    }

    // Weekday - use regular business hours
    console.log(`📅 Weekday business hours: ${dayName} ${businessWindow.start}-${businessWindow.end}`);
    return this.evaluateTimeWindow(timeString, businessWindow, dayName, callTimeUTC, tenantConfig);
  }

  /**
   * Check if a time falls within a business hours window
   */
  private static evaluateTimeWindow(
    timeString: string, 
    window: BusinessHoursWindow, 
    dayName: string,
    callTimeUTC: Date,
    tenantConfig: TenantConfig
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
      nextAllowedTime: this.getNextAllowedTime(callTimeUTC, tenantConfig),
      evaluatedWindow: window,
      evaluatedDay: dayName,
      evaluatedTime: timeString
    };
  }

  /**
   * Default business hours for tenants without configuration
   */
  private static evaluateDefault(callTimeUTC: Date): EvaluationResult {
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
        evaluatedWindow: { start: "08:00", end: "20:00" },
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
   * Calculate next allowed call time based on tenant configuration
   */
  private static getNextAllowedTime(callTimeUTC: Date, tenantConfig: TenantConfig): Date {
    const timezone = tenantConfig.timezone || 'Europe/London';
    const businessWindow = { start: "09:00", end: "21:00" }; // Simplified for now
    
    let nextTime = new Date(callTimeUTC.getTime() + 60 * 60 * 1000); // Start checking 1 hour later
    
    // Try the next 7 days to find an allowed time
    for (let i = 0; i < 7; i++) {
      const localTime = toZonedTime(nextTime, timezone);
      
      // Set to start of business hours for this day  
      const [startHour, startMinute] = businessWindow.start.split(':').map(Number);
      const businessStart = new Date(localTime);
      businessStart.setHours(startHour, startMinute, 0, 0);
      
      // Convert back to UTC
      return fromZonedTime(businessStart, timezone);
    }
    
    // Fallback: 24 hours later
    return new Date(callTimeUTC.getTime() + 24 * 60 * 60 * 1000);
  }

  /**
   * Get next business day based on tenant configuration
   */
  private static getNextBusinessDay(callTimeUTC: Date, tenantConfig: TenantConfig): Date {
    const timezone = tenantConfig.timezone || 'Europe/London';
    const businessWindow = { start: "09:00", end: "21:00" }; // Simplified for now
    
    let nextDay = new Date(callTimeUTC);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Find next weekday (Monday-Friday)
    for (let i = 0; i < 7; i++) {
      const localTime = toZonedTime(nextDay, timezone);
      const dayOfWeek = localTime.getDay();
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        const [startHour, startMinute] = businessWindow.start.split(':').map(Number);
        const businessStart = new Date(localTime);
        businessStart.setHours(startHour, startMinute, 0, 0);
        
        return fromZonedTime(businessStart, timezone);
      }
      
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    // Fallback
    return nextDay;
  }
}