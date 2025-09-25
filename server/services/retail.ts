interface RetailCallRequest {
  from_number: string;
  to_number: string;
  agent_id: string;
  retail_llm_dynamic_variables?: Record<string, any>;
  metadata?: {
    contactId: string;
    tenantId: string;
    callSessionId?: string;
    appointmentTime?: string;
    appointmentType?: string;
    contactName?: string;
    businessType?: string;
    variablesSent?: string[];
  };
}

interface RetailCallResponse {
  call_id: string;
  from_number: string;
  to_number: string;
  agent_id: string;
  status: string;
  call_type: string;
  metadata?: any;
}

interface RetailWebhookPayload {
  event: string;
  call_id: string;
  agent_id: string;
  call_status: string;
  call_type: string;
  from_number: string;
  to_number: string;
  direction: string;
  recording_url?: string;
  transcript?: string;
  call_analysis?: {
    call_summary?: string;
    call_outcome?: string;
    transfer_requested?: boolean;
    booking_confirmed?: boolean;
    customer_interest?: string;
    inbound_phone_call_debugging_log?: any;
  };
  metadata?: any;
}

export class RetailService {
  private baseUrl = 'https://api.retail.com';
  
  /**
   * Create business-aware call with dynamic variables and personalized script
   */
  async createBusinessCall(
    apiKey: string, 
    contact: any, 
    tenantConfig: any, 
    callSessionId: string,
    businessTemplateService: any
  ): Promise<RetailCallResponse> {
    // Detect or get business type
    const businessType = tenantConfig.businessType || 'general';
    
    // Generate business-specific variables for Retail AI
    const dynamicVariables = businessTemplateService.generateRetailVariables(
      contact, 
      tenantConfig, 
      businessType
    );
    
    // Build call request with business intelligence
    const metadata: any = {
      contactId: contact.id,
      tenantId: tenantConfig.tenantId || contact.tenantId,
      callSessionId,
      businessType,
      variablesSent: Object.keys(dynamicVariables)
    };

    // Include safe metadata for voice calls
    if (businessType !== 'medical') {
      // For non-medical businesses, include full metadata
      metadata.appointmentTime = contact.appointmentTime?.toISOString();
      metadata.appointmentType = contact.appointmentType;
      metadata.contactName = contact.name;
    } else {
      // For medical practices, omit PHI from metadata sent to third-party vendor
      metadata.appointmentTime = contact.appointmentTime?.toISOString();
      // contactName and appointmentType OMITTED for HIPAA compliance
    }
    
    console.log(`🛍️ Creating Retail business call (business: ${businessType}, contact: ${contact.name}, ID: ${contact.id})`);
    
    const callRequest: RetailCallRequest = {
      from_number: tenantConfig.retailAgentNumber,
      to_number: contact.phone,
      agent_id: tenantConfig.retailAgentId,
      retail_llm_dynamic_variables: dynamicVariables,
      metadata
    };

    const response = await fetch(`${this.baseUrl}/create-phone-call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retail API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`📞 Retail call initiated: ${result.call_id} for contact ${contact.name}`);
    
    return result;
  }

  async getCall(apiKey: string, callId: string): Promise<RetailCallResponse> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retail API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  parseWebhookPayload(payload: any): RetailWebhookPayload {
    return {
      event: payload.event,
      call_id: payload.call_id,
      agent_id: payload.agent_id,
      call_status: payload.call_status,
      call_type: payload.call_type,
      from_number: payload.from_number,
      to_number: payload.to_number,
      direction: payload.direction,
      recording_url: payload.recording_url,
      transcript: payload.transcript,
      call_analysis: payload.call_analysis,
      metadata: payload.metadata,
    };
  }

  determineCallOutcome(payload: RetailWebhookPayload): string {
    // Map Retail call analysis to our internal call outcomes
    if (payload.call_analysis?.call_outcome) {
      const outcome = payload.call_analysis.call_outcome.toLowerCase();
      
      // Check for booking confirmation
      if (outcome.includes('booking_confirmed') || payload.call_analysis.booking_confirmed) {
        return 'confirmed';
      }
      
      // Check for transfer requests
      if (outcome.includes('transfer') || payload.call_analysis.transfer_requested) {
        return 'transfer_requested';
      }
      
      // Check for standard outcomes
      if (outcome.includes('confirm') || outcome.includes('accept')) {
        return 'confirmed';
      }
      if (outcome.includes('voicemail')) {
        return 'voicemail';
      }
      if (outcome.includes('busy')) {
        return 'busy';
      }
      if (outcome.includes('no answer') || outcome.includes('no_answer')) {
        return 'no_answer';
      }
      if (outcome.includes('no_interest')) {
        return 'no_interest';
      }
    }

    // Fallback based on call status
    switch (payload.call_status) {
      case 'completed':
        return payload.call_analysis?.booking_confirmed ? 'confirmed' : 'completed';
      case 'busy':
        return 'busy';
      case 'no-answer':
      case 'no_answer':
        return 'no_answer';
      case 'failed':
        return 'failed';
      default:
        return 'failed';
    }
  }
}

export const retailService = new RetailService();