import { normalizePhoneNumber, isNormalizedPhoneNumber } from '../utils/phone-normalization';

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
    in_voicemail?: boolean;
    user_sentiment?: string;
    call_successful?: boolean;
    sentiment_analysis?: {
      overall_sentiment?: string; // 'positive', 'negative', 'neutral'
      sentiment_score?: number; // -1 to 1
      emotions_detected?: string[]; // ['frustrated', 'anxious', 'cooperative']
      tone_analysis?: string; // 'professional', 'casual', 'upset'
      engagement_level?: string; // 'high', 'medium', 'low'
    };
    voice_analytics?: {
      speech_pace?: string; // 'fast', 'normal', 'slow'
      interruptions_count?: number;
      silence_duration?: number; // Total seconds of silence
      voice_quality?: string; // 'clear', 'muffled', 'noisy'
    };
    conversation_analytics?: {
      topics_discussed?: string[];
      customer_questions_count?: number;
      agent_clarifications_count?: number;
      conversation_flow?: string; // 'smooth', 'difficult', 'confused'
    };
    custom_analysis_data?: {
      appointment_confirmed?: boolean;
      appointment_cancelled?: boolean;
      appointment_rescheduled?: boolean;
      new_appointment_details?: string;
      customer_engaged?: boolean;
      call_completed_successfully?: boolean;
      customer_sentiment?: string;
      wrong_person?: boolean;
      reached_voicemail?: boolean;
      callback_requested?: boolean;
      followup_required?: boolean;
      customer_response_summary?: string;
      appointment_purpose?: string;
      preferred_call_time?: string;
      transfer_requested?: boolean;
      transfer_reason?: string;
      transferred_to?: string;
      department?: string;
    };
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

    // Use normalized phone number for API call, fallback to original if not available
    let phoneToUse = contact.normalizedPhone || contact.phone;
    
    // Pre-dial validation to prevent contaminated numbers reaching API
    if (!isNormalizedPhoneNumber(phoneToUse)) {
      const normalizationResult = normalizePhoneNumber(phoneToUse);
      if (!normalizationResult.success) {
        throw new Error(`Invalid phone number format for ${contact.name}: ${normalizationResult.error}`);
      }
      // Use the freshly normalized number if the stored one was invalid
      phoneToUse = normalizationResult.normalizedPhone!;
      console.warn(`⚠️ Using fresh normalization for contact ${contact.id}: ${contact.phone} → ${phoneToUse}`);
    }

    const callRequest: RetellCallRequest = {
      from_number: tenantConfig.retellAgentNumber,
      to_number: phoneToUse,
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

  /**
   * Extract and process sentiment analysis from Retell AI webhook
   */
  extractSentimentAnalysis(payload: RetellWebhookPayload) {
    const analysis = payload.call_analysis;
    if (!analysis) return null;

    return {
      // Core sentiment data
      overallSentiment: analysis.sentiment_analysis?.overall_sentiment || 'neutral',
      sentimentScore: analysis.sentiment_analysis?.sentiment_score || 0,
      emotionsDetected: analysis.sentiment_analysis?.emotions_detected || [],
      toneAnalysis: analysis.sentiment_analysis?.tone_analysis || 'neutral',
      engagementLevel: analysis.sentiment_analysis?.engagement_level || 'medium',
      
      // Voice analytics
      speechPace: analysis.voice_analytics?.speech_pace || 'normal',
      interruptionsCount: analysis.voice_analytics?.interruptions_count || 0,
      silenceDuration: analysis.voice_analytics?.silence_duration || 0,
      voiceQuality: analysis.voice_analytics?.voice_quality || 'clear',
      
      // Conversation analytics  
      topicsDiscussed: analysis.conversation_analytics?.topics_discussed || [],
      customerQuestionsCount: analysis.conversation_analytics?.customer_questions_count || 0,
      agentClarificationsCount: analysis.conversation_analytics?.agent_clarifications_count || 0,
      conversationFlow: analysis.conversation_analytics?.conversation_flow || 'smooth',
    };
  }

  /**
   * Determine appointment action taken during call from sentiment and conversation analysis
   */
  determineAppointmentAction(payload: RetellWebhookPayload): string {
    const outcome = payload.call_analysis?.call_outcome?.toLowerCase() || '';
    const topics = payload.call_analysis?.conversation_analytics?.topics_discussed || [];
    
    // Check conversation topics for appointment actions
    const topicsString = topics.join(' ').toLowerCase();
    
    if (outcome.includes('confirm') || topicsString.includes('confirm')) {
      return 'confirmed';
    }
    if (outcome.includes('reschedule') || topicsString.includes('reschedule') || topicsString.includes('different time')) {
      return 'rescheduled';
    }
    if (outcome.includes('cancel') || topicsString.includes('cancel')) {
      return 'cancelled';
    }
    if (outcome.includes('voicemail') || payload.call_status === 'no_answer') {
      return 'no_response';
    }
    
    // Fallback to call outcome logic
    return this.determineCallOutcome(payload);
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