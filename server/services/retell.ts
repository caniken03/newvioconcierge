interface RetellCallRequest {
  from_number: string;
  to_number: string;
  agent_id: string;
  retell_llm_dynamic_variables?: Record<string, any>;
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

interface RetellCallResponse {
  call_id: string;
  from_number: string;
  to_number: string;
  agent_id: string;
  status: string;
  call_type: string;
  metadata?: any;
}

interface RetellWebhookPayload {
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
    inbound_phone_call_debugging_log?: any;
  };
  metadata?: any;
}

export class RetellService {
  private baseUrl = 'https://api.retellai.com';
  
  /**
   * Create business-aware call with dynamic variables and personalized script
   */
  async createBusinessCall(
    apiKey: string, 
    contact: any, 
    tenantConfig: any, 
    callSessionId: string,
    businessTemplateService: any
  ): Promise<RetellCallResponse> {
    // Detect or get business type
    const businessType = tenantConfig.businessType || 'general';
    
    // Generate business-specific variables for Retell AI
    const dynamicVariables = businessTemplateService.generateRetellVariables(
      contact, 
      tenantConfig, 
      businessType
    );
    
    // Build call request with business intelligence and HIPAA compliance
    const metadata: any = {
      contactId: contact.id,
      tenantId: tenantConfig.tenantId || contact.tenantId,
      callSessionId,
      businessType,
      variablesSent: Object.keys(dynamicVariables)
    };

    // HIPAA Compliance: Only include safe metadata for medical practices
    if (businessType === 'medical') {
      // For medical practices, omit all PHI from metadata sent to third-party vendor
      metadata.appointmentTime = contact.appointmentTime?.toISOString();
      // contactName and appointmentType OMITTED for HIPAA compliance
    } else {
      // For non-medical businesses, include full metadata
      metadata.appointmentTime = contact.appointmentTime?.toISOString();
      metadata.appointmentType = contact.appointmentType;
      metadata.contactName = contact.name;
    }

    const callRequest: RetellCallRequest = {
      from_number: tenantConfig.retellAgentNumber,
      to_number: contact.phone,
      agent_id: tenantConfig.retellAgentId,
      retell_llm_dynamic_variables: dynamicVariables,
      metadata
    };
    
    console.log(`📞 Creating business-aware call for ${businessType} with ${Object.keys(dynamicVariables).length} variables`);
    console.log(`🎭 Variables sent: ${Object.keys(dynamicVariables).join(', ')}`);
    // Note: Variable values and payload logging removed for HIPAA compliance
    
    return this.createCall(apiKey, callRequest);
  }
  
  async createCall(apiKey: string, callRequest: RetellCallRequest): Promise<RetellCallResponse> {
    const response = await fetch(`${this.baseUrl}/v2/create-phone-call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retell API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getCall(apiKey: string, callId: string): Promise<RetellCallResponse> {
    const response = await fetch(`${this.baseUrl}/v2/get-call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retell API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  parseWebhookPayload(payload: any): RetellWebhookPayload {
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

  determineCallOutcome(payload: RetellWebhookPayload): string {
    // Map Retell call status to our internal call outcomes
    if (payload.call_analysis?.call_outcome) {
      const outcome = payload.call_analysis.call_outcome.toLowerCase();
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
    }

    // Fallback based on call status
    switch (payload.call_status) {
      case 'completed':
        return 'confirmed'; // Assume successful completion means confirmation
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

export const retellService = new RetellService();