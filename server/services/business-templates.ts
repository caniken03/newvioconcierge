/**
 * VioConcierge Business Template Engine
 * 
 * Implements enterprise-grade business-specific templates with HIPAA compliance,
 * field omission rules, and industry-optimized voice calling.
 */

interface BusinessTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  complianceRequired: boolean;
  fieldOmissionRules: FieldOmissionRules;
  voiceScriptTemplates: VoiceScriptTemplate[];
  validationRules: ValidationRules;
  complianceConfig?: ComplianceConfig;
}

interface FieldOmissionRules {
  omitCompletely: string[];           // Never include in voice calls
  anonymizeFields: { [key: string]: string }; // Replace with generic terms
  conditionalInclude: { [key: string]: string }; // Include with restrictions
}

interface VoiceScriptTemplate {
  id: string;
  name: string;
  script: string;
  estimatedDuration: number;
  complianceLevel?: string;
  variablesUsed: string[];
  variablesOmitted: string[];
}

interface ValidationRules {
  requiredFields: string[];
  optionalFields: string[];
  prohibitedFields: string[];
  fieldValidation: { [key: string]: any };
  complianceChecks?: { [key: string]: boolean };
}

interface ComplianceConfig {
  type: 'HIPAA' | 'GDPR' | 'SOX' | 'PCI';
  level: 'strict' | 'standard' | 'basic';
  features: {
    phiDetectionEnabled: boolean;
    auditTrailEnhanced: boolean;
    consentTracking: boolean;
    minimumNecessary: boolean;
  };
}

/**
 * Medical Practice Template with HIPAA Compliance
 */
const medicalPracticeTemplate: BusinessTemplate = {
  id: 'medical',
  name: 'Medical Practice / Healthcare',
  icon: '🏥',
  description: 'HIPAA-compliant templates for medical appointments with patient privacy protection',
  complianceRequired: true,
  
  fieldOmissionRules: {
    // NEVER included in voice calls for medical practices
    omitCompletely: [
      'notes',                    // Staff-only internal notes
      'email',                    // Not relevant for voice calls
      'companyName',             // Could indicate medical specialty
      'bookingSource',           // Internal system information
      'locationId',              // Could indicate medical department
      'specialInstructions',     // May contain PHI - sanitized separately
    ],
    
    // Fields ANONYMIZED/GENERALIZED for voice calls
    anonymizeFields: {
      'name': 'first_name_only',           // "Sarah" instead of "Sarah Johnson"
      'appointmentType': 'generic_terms',  // "appointment" instead of "surgery consultation"
      'ownerName': 'provider_title_only',  // "your provider" instead of "Dr. Sarah Johnson"
    },
    
    // Fields CONDITIONALLY INCLUDED with restrictions
    conditionalInclude: {
      'appointmentTime': 'date_and_time_only',     // Include but no duration details
      'appointmentDuration': 'omit_if_procedure',  // Omit for medical procedures
      'phone': 'never_spoken_aloud'                // Used for calling but not mentioned
    }
  },

  voiceScriptTemplates: [
    {
      id: 'hipaa_minimal',
      name: 'Ultra-Conservative Medical Script (Strict HIPAA)',
      script: `Hello {{customer_name}}, this is {{business_name}}.

We're calling to remind you about your upcoming appointment on {{appointment_date}} at {{appointment_time}}.

To confirm this appointment, please press 1.
To reschedule, please press 2.

If you have questions, please call us at {{callback_number}}.

Thank you.`,
      estimatedDuration: 35,
      complianceLevel: 'strict_hipaa',
      variablesUsed: ['customer_name', 'business_name', 'appointment_date', 'appointment_time', 'callback_number'],
      variablesOmitted: ['appointment_type', 'provider_name', 'special_instructions', 'company_details']
    },
    
    {
      id: 'hipaa_standard',
      name: 'Standard Medical Script (HIPAA Compliant)',
      script: `Hello {{customer_name}}, this is {{business_name}}.

We're calling to confirm your appointment on {{appointment_date}} at {{appointment_time}} with {{provider_name}}.

To confirm this appointment, please press 1.
To reschedule, please press 2.
To cancel, please press 3.

Please remember to arrive 15 minutes early for check-in.

If you have any questions, please call us at {{callback_number}}.

Thank you for choosing {{business_name}}.`,
      estimatedDuration: 55,
      complianceLevel: 'standard_hipaa',
      variablesUsed: ['customer_name', 'business_name', 'appointment_date', 'appointment_time', 'provider_name', 'callback_number'],
      variablesOmitted: ['appointment_type', 'special_instructions', 'medical_details']
    }
  ],

  validationRules: {
    requiredFields: ['name', 'phone', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'ownerName', 'appointmentDuration'],
    prohibitedFields: ['diagnosis', 'medicalHistory', 'insuranceInfo', 'socialSecurityNumber'],
    
    fieldValidation: {
      name: {
        minLength: 2,
        maxLength: 100,
        pattern: '^[a-zA-Z\\s\\-\\.]+$',
        phiScreening: true
      },
      phone: {
        required: true,
        format: 'e164',
        duplicateCheck: 'within_tenant'
      },
      appointmentType: {
        required: false,  // HIPAA: Always optional for privacy
        maxLength: 50,
        restrictedTerms: ['surgery', 'procedure', 'test', 'diagnosis'],
        suggestedGeneric: ['consultation', 'appointment', 'visit']
      },
      specialInstructions: {
        maxLength: 200,  // Shorter for medical
        phiScreening: true,
        prohibitedTerms: ['medication', 'diagnosis', 'insurance', 'ssn'],
        sanitization: 'automatic'
      }
    },
    
    complianceChecks: {
      phiDetection: true,
      consentVerification: true,
      minimumNecessary: true,
      auditLogging: true
    }
  },

  complianceConfig: {
    type: 'HIPAA',
    level: 'standard',
    features: {
      phiDetectionEnabled: true,
      auditTrailEnhanced: true,
      consentTracking: true,
      minimumNecessary: true
    }
  }
};

/**
 * Dental Practice Template (balanced privacy and personalization)
 */
const dentalPracticeTemplate: BusinessTemplate = {
  id: 'dental',
  name: 'Dental Practice',
  icon: '🦷',
  description: 'Dental appointment templates with patient-friendly personalization and privacy protection',
  complianceRequired: false,
  
  fieldOmissionRules: {
    // Staff-only fields NEVER included in voice calls
    omitCompletely: [
      'notes',                    // Staff-only internal notes
      'email',                    // Not relevant for voice calls
      'bookingSource',           // Internal system information
      'locationId',              // Internal reference
    ],
    
    // No anonymization needed for dental (less sensitive than medical)
    anonymizeFields: {},
    
    // All relevant fields can be included with dental appointments
    conditionalInclude: {
      'appointmentTime': 'date_and_time_only',     // Include date and time
      'appointmentDuration': 'voice_friendly',      // Include duration
      'phone': 'never_spoken_aloud'                // Used for calling but not mentioned
    }
  },

  voiceScriptTemplates: [
    {
      id: 'dental_friendly',
      name: 'Friendly Dental Reminder',
      script: `Hello {{customer_name}}, this is {{business_name}}.

We're calling to remind you about your {{appointment_type}} appointment on {{appointment_date}} at {{appointment_time}} with {{provider_name}}.

To confirm this appointment, please press 1.
To reschedule, please press 2.

{{special_instructions}}

If you have any questions, please call us at {{callback_number}}.

Thank you for choosing {{business_name}}.`,
      estimatedDuration: 65,
      complianceLevel: 'standard',
      variablesUsed: ['customer_name', 'business_name', 'appointment_type', 'appointment_date', 'appointment_time', 'provider_name', 'special_instructions', 'callback_number'],
      variablesOmitted: ['customer_phone', 'appointment_duration']
    }
  ],

  validationRules: {
    requiredFields: ['name', 'phone', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'ownerName', 'appointmentDuration', 'specialInstructions'],
    prohibitedFields: [],
    
    fieldValidation: {
      name: {
        minLength: 2,
        maxLength: 100,
        pattern: '^[a-zA-Z\\s\\-\\.]+$'
      },
      phone: {
        required: true,
        format: 'e164',
        duplicateCheck: 'within_tenant'
      },
      appointmentType: {
        required: false,
        maxLength: 100,
        suggestedTerms: ['cleaning', 'checkup', 'consultation', 'filling', 'crown', 'whitening']
      },
      specialInstructions: {
        maxLength: 300,  // Longer for dental (less sensitive)
        sanitization: 'voice_friendly'
      }
    }
  }
};

/**
 * Salon/Spa Template for Enhanced Service Experience
 */
const salonSpaTemplate: BusinessTemplate = {
  id: 'salon',
  name: 'Salon / Spa / Beauty Services',
  icon: '💅',
  description: 'Beauty and wellness appointment templates with full service personalization',
  complianceRequired: false,
  
  fieldOmissionRules: {
    // Include ALL service details for better experience
    omitCompletely: [
      'notes',           // Internal stylist notes only
      'email',           // Not relevant for voice confirmation
      'bookingSource',   // Internal tracking
    ],
    
    anonymizeFields: {},  // No anonymization needed for salon services
    
    conditionalInclude: {
      'specialInstructions': 'beauty_formatting'  // Format for beauty context
    }
  },

  voiceScriptTemplates: [
    {
      id: 'salon_friendly',
      name: 'Friendly Personal Salon Script',
      script: `Hi {{customer_name}}! This is {{stylist_name}} from {{business_name}}.

I'm calling to confirm your {{service_type}} appointment on {{appointment_date}} at {{appointment_time}}.

Your {{service_type}} is scheduled for {{service_duration}}, and I have all your preferences on file.

To confirm, press 1. To reschedule, press 2.

{{service_notes}}

We can't wait to see you! Call us at {{callback_number}} if you have any questions.

Thanks for choosing {{business_name}}!`,
      estimatedDuration: 75,
      variablesUsed: ['customer_name', 'stylist_name', 'business_name', 'service_type', 'appointment_date', 'appointment_time', 'service_duration', 'service_notes', 'callback_number'],
      variablesOmitted: ['notes', 'email', 'internal_tracking']
    }
  ],

  validationRules: {
    requiredFields: ['name', 'phone', 'appointmentTime', 'appointmentType'],
    optionalFields: ['email', 'ownerName', 'specialInstructions', 'appointmentDuration'],
    prohibitedFields: [],
    
    fieldValidation: {
      appointmentType: {
        required: true,
        predefinedOptions: [
          'Haircut', 'Hair Color', 'Highlights', 'Perm', 'Straightening',
          'Facial', 'Massage', 'Manicure', 'Pedicure', 'Eyebrow Shaping',
          'Makeup Application', 'Skin Treatment', 'Waxing', 'Other'
        ],
        customAllowed: true
      },
      appointmentDuration: {
        presets: [30, 60, 90, 120, 180, 240],
        default: 60,
        customAllowed: true,
        maxDuration: 480
      }
    }
  }
};

/**
 * Restaurant Template for Guest Experience
 */
const restaurantTemplate: BusinessTemplate = {
  id: 'restaurant',
  name: 'Restaurant / Dining Establishment',
  icon: '🍽️',
  description: 'Restaurant reservation management with guest experience focus',
  complianceRequired: false,
  
  fieldOmissionRules: {
    omitCompletely: [
      'notes',           // Internal restaurant notes
      'email',           // Not relevant for voice confirmation
      'bookingSource'    // Internal tracking
    ],
    
    anonymizeFields: {},
    
    conditionalInclude: {
      'specialInstructions': 'dietary_formatting'  // Format for dining context
    }
  },

  voiceScriptTemplates: [
    {
      id: 'restaurant_casual',
      name: 'Casual Dining Confirmation',
      script: `Hello {{guest_name}}! This is {{restaurant_name}} calling to confirm your reservation for {{party_size}} on {{reservation_date}} at {{reservation_time}}.

{{occasion_context}}

To confirm your reservation, press 1.
To modify, press 2.

{{dietary_accommodations}}

We're excited to welcome you to {{restaurant_name}}!

If you need to reach us, call {{restaurant_phone}}.`,
      estimatedDuration: 70,
      variablesUsed: ['guest_name', 'restaurant_name', 'party_size', 'reservation_date', 'reservation_time', 'occasion_context', 'dietary_accommodations', 'restaurant_phone'],
      variablesOmitted: ['notes', 'email', 'booking_source']
    }
  ],

  validationRules: {
    requiredFields: ['name', 'phone', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'specialInstructions'],
    prohibitedFields: [],
    
    fieldValidation: {
      appointmentType: {
        predefinedOptions: [
          'Birthday', 'Anniversary', 'Business Meeting', 
          'Date Night', 'Family Gathering', 'Celebration'
        ],
        customAllowed: true
      }
    }
  }
};

/**
 * Business Template Service
 */
export class BusinessTemplateService {
  private templates: Map<string, BusinessTemplate>;

  constructor() {
    this.templates = new Map([
      ['medical', medicalPracticeTemplate],
      ['dental', dentalPracticeTemplate],
      ['salon', salonSpaTemplate],
      ['restaurant', restaurantTemplate],
      // Add more templates as needed
    ]);
  }

  /**
   * Get business template by type
   */
  getTemplate(businessType: string): BusinessTemplate | undefined {
    return this.templates.get(businessType);
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): BusinessTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Detect business type from business information
   */
  async detectBusinessType(businessInfo: {
    name?: string;
    companyName?: string;
    adminEmail?: string;
    sampleAppointmentTypes?: string[];
  }): Promise<{ detectedType: string; confidence: number; evidence: string[] }> {
    const businessText = `${businessInfo.name || ''} ${businessInfo.companyName || ''}`.toLowerCase();
    const domain = businessInfo.adminEmail?.split('@')[1]?.toLowerCase() || '';
    const appointmentTypes = businessInfo.sampleAppointmentTypes?.map(t => t.toLowerCase()) || [];

    // Medical practice indicators
    const medicalKeywords = [
      'medical', 'clinic', 'hospital', 'healthcare', 'health center',
      'medical group', 'family medicine', 'pediatrics', 'cardiology',
      'dermatology', 'orthopedics', 'dental', 'dentist', 'dental office',
      'urgent care', 'primary care', 'specialty clinic'
    ];

    const medicalDomains = ['.md', 'medical', 'health', 'clinic', 'hospital', 'care'];
    const medicalAppointments = ['consultation', 'follow-up', 'check-up', 'physical', 'exam'];

    // Salon indicators
    const salonKeywords = [
      'salon', 'spa', 'beauty', 'hair', 'nail', 'nails', 'skin care',
      'day spa', 'hair salon', 'nail salon', 'beauty salon', 'barber',
      'barbershop', 'styling', 'aesthetics', 'wellness center'
    ];

    const salonAppointments = [
      'haircut', 'color', 'highlights', 'facial', 'massage', 'manicure',
      'pedicure', 'waxing', 'treatment'
    ];

    // Restaurant indicators
    const restaurantKeywords = [
      'restaurant', 'cafe', 'bistro', 'grill', 'diner', 'eatery',
      'steakhouse', 'pizzeria', 'fine dining', 'casual dining',
      'bar and grill', 'tavern', 'pub', 'brasserie'
    ];

    const restaurantAppointments = [
      'dinner', 'lunch', 'brunch', 'reservation', 'table', 'dining'
    ];

    // Calculate scores
    let medicalScore = 0;
    let salonScore = 0;
    let restaurantScore = 0;
    const evidence: string[] = [];

    // Check business name/company
    medicalKeywords.forEach(keyword => {
      if (businessText.includes(keyword)) {
        medicalScore += 3;
        evidence.push(`Business name contains "${keyword}"`);
      }
    });

    salonKeywords.forEach(keyword => {
      if (businessText.includes(keyword)) {
        salonScore += 3;
        evidence.push(`Business name contains "${keyword}"`);
      }
    });

    restaurantKeywords.forEach(keyword => {
      if (businessText.includes(keyword)) {
        restaurantScore += 3;
        evidence.push(`Business name contains "${keyword}"`);
      }
    });

    // Check domain
    medicalDomains.forEach(pattern => {
      if (domain.includes(pattern)) {
        medicalScore += 2;
        evidence.push(`Email domain indicates medical practice`);
      }
    });

    // Check appointment types
    appointmentTypes.forEach(apt => {
      if (medicalAppointments.some(med => apt.includes(med))) {
        medicalScore += 1;
        evidence.push(`Appointment type "${apt}" suggests medical practice`);
      }
      if (salonAppointments.some(salon => apt.includes(salon))) {
        salonScore += 1;
        evidence.push(`Appointment type "${apt}" suggests beauty services`);
      }
      if (restaurantAppointments.some(rest => apt.includes(rest))) {
        restaurantScore += 1;
        evidence.push(`Appointment type "${apt}" suggests restaurant`);
      }
    });

    // Determine result
    const maxScore = Math.max(medicalScore, salonScore, restaurantScore);
    const confidence = Math.min((maxScore / 5) * 100, 95); // Cap at 95%

    let detectedType = 'general';
    if (maxScore >= 2) {
      if (medicalScore === maxScore) detectedType = 'medical';
      else if (salonScore === maxScore) detectedType = 'salon';
      else if (restaurantScore === maxScore) detectedType = 'restaurant';
    }

    return {
      detectedType,
      confidence,
      evidence: evidence.slice(0, 3) // Top 3 evidence items
    };
  }

  /**
   * Apply field omission rules for business type
   */
  applyFieldOmissionRules(contactData: any, businessType: string): any {
    const template = this.getTemplate(businessType);
    if (!template) return contactData;

    const filtered = { ...contactData };
    const rules = template.fieldOmissionRules;

    // Remove completely omitted fields
    rules.omitCompletely.forEach(field => {
      delete filtered[field];
    });

    // Apply anonymization rules
    Object.entries(rules.anonymizeFields).forEach(([field, rule]) => {
      if (filtered[field]) {
        switch (rule) {
          case 'first_name_only':
            filtered[field] = this.extractFirstName(filtered[field]);
            break;
          case 'generic_terms':
            filtered[field] = this.genericizeAppointmentType(filtered[field]);
            break;
          case 'provider_title_only':
            filtered[field] = 'your provider';
            break;
        }
      }
    });

    return filtered;
  }

  /**
   * Get voice script template for business type
   */
  getVoiceScript(businessType: string, scriptType: string = 'standard'): any {
    const template = this.getTemplate(businessType);
    if (!template?.voiceScriptTemplates?.length) return null;
    
    // For medical, prefer HIPAA compliant scripts
    if (businessType === 'medical') {
      return template.voiceScriptTemplates.find(s => s.id === 'hipaa_standard') 
             || template.voiceScriptTemplates[0];
    }
    
    // For other business types, use first available script
    return template.voiceScriptTemplates[0];
  }

  /**
   * Generate voice script variables for Retell AI
   */
  generateRetellVariables(contact: any, tenantConfig: any, businessType: string): any {
    const template = this.getTemplate(businessType);
    if (!template) return this.generateGenericVariables(contact, tenantConfig);

    // Apply field filtering
    const filteredContact = this.applyFieldOmissionRules(contact, businessType);

    // Generate business-specific variables
    switch (businessType) {
      case 'medical':
        return this.generateMedicalVariables(filteredContact, tenantConfig);
      case 'dental':
        return this.generateDentalVariables(filteredContact, tenantConfig);
      case 'salon':
        return this.generateSalonVariables(filteredContact, tenantConfig);
      case 'restaurant':
        return this.generateRestaurantVariables(filteredContact, tenantConfig);
      default:
        return this.generateGenericVariables(filteredContact, tenantConfig);
    }
  }

  /**
   * Medical practice variables (HIPAA compliant)
   */
  private generateMedicalVariables(contact: any, tenantConfig: any): any {
    const variables = {
      // Retell AI agent expects these specific variable names:
      first_name: String(this.extractFirstName(contact.name || '')),  // First name only for HIPAA
      company_name: String(tenantConfig.companyName || 'your healthcare provider'),
      appointment_spoken: String(this.formatAppointmentSpoken(contact.appointmentTime)),
      owner_name: String('your healthcare provider'),  // Always anonymous for privacy
      internal_reference: String(contact.id || '')
      // NOTE: appointment_type OMITTED for HIPAA compliance (may reveal medical condition)
      // NOTE: special_instructions OMITTED for HIPAA compliance (may contain PHI)
      // NOTE: last_name OMITTED for HIPAA compliance
    };
    
    console.log('🏥 Generated medical variables (Retell AI format):', JSON.stringify(variables, null, 2));
    return variables;
  }

  /**
   * Dental practice variables (using standard variable names)
   */
  private generateDentalVariables(contact: any, tenantConfig: any): any {
    const nameParts = (contact.name || '').split(' ');
    return {
      // Retell AI agent expects these specific variable names:
      first_name: String(nameParts[0] || ''),
      last_name: String(nameParts.slice(1).join(' ') || ''),
      company_name: String(tenantConfig.companyName || 'our dental office'),
      owner_name: String(contact.ownerName || 'your dentist'),
      appointment_type: String(this.formatDentalProcedure(contact.appointmentType || 'appointment')),
      appointment_spoken: String(this.formatAppointmentSpoken(contact.appointmentTime)),
      appointment_duration: String(contact.appointmentDuration || ''),
      special_instructions: String(this.formatDentalPrep(contact.specialInstructions || '')),
      internal_reference: String(contact.id || '')
    };
  }

  /**
   * Salon/spa variables (full service experience)
   */
  private generateSalonVariables(contact: any, tenantConfig: any): any {
    const nameParts = (contact.name || '').split(' ');
    return {
      // Retell AI agent expects these specific variable names:
      first_name: String(nameParts[0] || ''),
      last_name: String(nameParts.slice(1).join(' ') || ''),
      owner_name: String(contact.ownerName || 'your stylist'),
      company_name: String(tenantConfig.companyName || 'our salon'),
      appointment_type: String(contact.appointmentType || 'service'),
      appointment_spoken: String(this.formatAppointmentSpoken(contact.appointmentTime)),
      appointment_duration: String(contact.appointmentDuration || ''),
      special_instructions: String(this.formatBeautyInstructions(contact.specialInstructions || '')),
      internal_reference: String(contact.id || '')
    };
  }

  /**
   * Restaurant variables (guest experience)
   */
  private generateRestaurantVariables(contact: any, tenantConfig: any): any {
    const nameParts = (contact.name || '').split(' ');
    return {
      // Retell AI agent expects these specific variable names:
      first_name: String(nameParts[0] || ''),
      last_name: String(nameParts.slice(1).join(' ') || ''),
      company_name: String(tenantConfig.companyName || 'our restaurant'),
      appointment_type: String(contact.appointmentType || 'reservation'),
      appointment_spoken: String(this.formatAppointmentSpoken(contact.appointmentTime)),
      appointment_duration: String(contact.appointmentDuration || ''),
      special_instructions: String(this.extractDietaryRequirements(contact.specialInstructions || '')),
      internal_reference: String(contact.id || '')
    };
  }

  /**
   * Generic business variables
   */
  private generateGenericVariables(contact: any, tenantConfig: any): any {
    const nameParts = (contact.name || '').split(' ');
    return {
      // Retell AI agent expects these specific variable names:
      first_name: String(nameParts[0] || ''),
      last_name: String(nameParts.slice(1).join(' ') || ''),
      company_name: String(tenantConfig.companyName || 'our office'),
      owner_name: String(contact.ownerName || 'your service provider'),
      appointment_type: String(contact.appointmentType || 'appointment'),
      appointment_spoken: String(this.formatAppointmentSpoken(contact.appointmentTime)),
      appointment_duration: String(contact.appointmentDuration || ''),
      special_instructions: String(contact.specialInstructions || ''),
      internal_reference: String(contact.id || '')
    };
  }

  // Helper methods
  private extractFirstName(fullName: string): string {
    if (!fullName) return 'there';
    const nameParts = fullName.trim().split(' ');
    return nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
  }

  private genericizeAppointmentType(appointmentType: string): string {
    const sensitiveTerms = ['surgery', 'procedure', 'test', 'diagnosis', 'treatment'];
    const lowerType = appointmentType.toLowerCase();
    
    for (const term of sensitiveTerms) {
      if (lowerType.includes(term)) {
        return 'appointment';
      }
    }
    return appointmentType;
  }

  private formatDateForVoice(appointmentTime: string | Date | null): string {
    if (!appointmentTime) return 'your upcoming appointment';
    
    try {
      const date = new Date(appointmentTime);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'your upcoming appointment';
    }
  }

  private formatTimeForVoice(appointmentTime: string | Date | null): string {
    if (!appointmentTime) return 'your scheduled time';
    
    try {
      const date = new Date(appointmentTime);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return 'your scheduled time';
    }
  }

  private formatAppointmentSpoken(appointmentTime: string | Date | null): string {
    if (!appointmentTime) return 'your upcoming appointment';
    
    try {
      const date = new Date(appointmentTime);
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${dateStr} at ${timeStr}`;
    } catch {
      return 'your upcoming appointment';
    }
  }

  private formatDurationForVoice(durationMinutes: number | null): string {
    if (!durationMinutes) return '';
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    } else if (durationMinutes === 60) {
      return '1 hour';
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      if (minutes === 0) {
        return `${hours} hours`;
      } else {
        return `${hours} hours and ${minutes} minutes`;
      }
    }
  }

  private sanitizeMedicalInstructions(instructions: string): string {
    if (!instructions) return '';
    
    // Remove potential PHI
    const phiTerms = ['medication', 'diagnosis', 'treatment', 'condition', 'surgery', 'procedure'];
    const instructionsLower = instructions.toLowerCase();
    
    for (const term of phiTerms) {
      if (instructionsLower.includes(term)) {
        return 'Please follow the preparation instructions provided by your healthcare provider';
      }
    }
    
    // Keep safe instructions
    const safeInstructions = [
      'arrive early', 'bring id', 'no food', 'no drink', 'comfortable clothing',
      'fasting required', 'wear comfortable shoes', 'bring insurance card'
    ];
    
    for (const safeInstruction of safeInstructions) {
      if (instructionsLower.includes(safeInstruction)) {
        return instructions; // Safe to include
      }
    }
    
    return 'Please follow any preparation instructions provided';
  }

  private formatBeautyInstructions(instructions: string): string {
    if (!instructions) return '';
    
    // Format for beauty services
    let formatted = instructions.replace(/color formula:/gi, 'using color formula');
    formatted = formatted.replace(/allergic to/gi, 'please note allergy to');
    
    return `Special notes: ${formatted}`;
  }

  private extractPartySize(text: string): string {
    const patterns = [
      /party of (\d+)/i,
      /(\d+) people/i,
      /(\d+) guests/i,
      /table for (\d+)/i,
      /(\d+) person/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const size = parseInt(match[1]);
        return `${size} guest${size !== 1 ? 's' : ''}`;
      }
    }
    
    return '2 guests'; // Default assumption
  }

  private extractDietaryRequirements(text: string): string {
    const dietaryTerms = [
      'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut allergy',
      'shellfish allergy', 'food allergy', 'diabetic', 'low sodium'
    ];
    
    const textLower = text.toLowerCase();
    const foundRestrictions: string[] = [];
    
    for (const term of dietaryTerms) {
      if (textLower.includes(term)) {
        foundRestrictions.push(term);
      }
    }
    
    if (foundRestrictions.length > 0) {
      return `Please note: ${foundRestrictions.join(', ')}`;
    }
    
    return '';
  }

  private formatDentalProcedure(appointmentType: string): string {
    const friendlyTerms: { [key: string]: string } = {
      'cleaning': 'dental cleaning',
      'checkup': 'routine checkup',
      'consultation': 'consultation',
      'filling': 'dental filling',
      'crown': 'crown procedure',
      'root canal': 'root canal treatment',
      'extraction': 'tooth extraction',
      'whitening': 'teeth whitening',
      'exam': 'dental examination'
    };
    
    const lowerType = appointmentType.toLowerCase();
    return friendlyTerms[lowerType] || appointmentType;
  }

  private formatDentalPrep(instructions: string): string {
    if (!instructions || instructions.trim().length === 0) {
      return '';
    }
    
    // Keep dental prep instructions but make them voice-friendly
    const voiceFriendly = instructions
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return voiceFriendly.length > 200 ? voiceFriendly.substring(0, 200) + '...' : voiceFriendly;
  }
}

// Export singleton instance
export const businessTemplateService = new BusinessTemplateService();