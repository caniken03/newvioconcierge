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
    // Retell webhooks have call data nested under 'call' object
    const callData = payload.call || payload;
    
    return {
      event: payload.event,
      call_id: callData.call_id || callData.id, // Retell uses 'id' field in some webhooks
      agent_id: callData.agent_id,
      call_status: callData.call_status || callData.status, // Also check 'status'
      call_type: callData.call_type,
      from_number: callData.from_number,
      to_number: callData.to_number,
      direction: callData.direction,
      recording_url: callData.recording_url,
      transcript: callData.transcript,
      call_analysis: callData.call_analysis,
      metadata: callData.metadata,
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
  // Expert Recommendation: Outcome Precedence Hierarchy
  // Higher priority outcomes (earlier in array) override lower priority ones
  private readonly OUTCOME_PRECEDENCE = [
    'rescheduled',
    'cancelled', 
    'confirmed',
    'voicemail',
    'no_answer',
    'busy',
    'answered',
    'failed',
    'unknown'
  ];

  // Compare two outcomes and return the stronger one (higher precedence)
  stronger(a: string, b: string): string {
    const indexA = this.OUTCOME_PRECEDENCE.indexOf(a);
    const indexB = this.OUTCOME_PRECEDENCE.indexOf(b);
    
    // If either outcome not in precedence list, prefer the known one
    if (indexA === -1) return b;
    if (indexB === -1) return a;
    
    // Return outcome with lower index (higher precedence)
    return indexA < indexB ? a : b;
  }

  // Expert Recommendation: Derive outcome from payload using strict precedence
  determineCallOutcome(payload: RetellWebhookPayload): string {
    // Null-safe data extraction (Expert Recommendation)
    const ca = payload.call_analysis ?? {};
    const cd = ca.custom_analysis_data ?? {};
    const topics: string[] = ca.conversation_analytics?.topics_discussed ?? [];
    const status = (payload.call_status || '').toLowerCase();
    const outcomeStr = (ca.call_outcome || '').toLowerCase();
    
    let derivedOutcome: string = 'unknown';
    let reason = 'default';
    
    // Priority 1: custom_analysis_data booleans (most accurate)
    if (cd.appointment_rescheduled) {
      derivedOutcome = 'rescheduled';
      reason = 'custom_analysis_data.appointment_rescheduled=true';
    } else if (cd.appointment_cancelled) {
      derivedOutcome = 'cancelled';
      reason = 'custom_analysis_data.appointment_cancelled=true';
    } else if (cd.appointment_confirmed) {
      derivedOutcome = 'confirmed';
      reason = 'custom_analysis_data.appointment_confirmed=true';
    } else if (cd.reached_voicemail) {
      derivedOutcome = 'voicemail';
      reason = 'custom_analysis_data.reached_voicemail=true';
    } else if (cd.customer_engaged === false) {
      derivedOutcome = 'no_answer';
      reason = 'custom_analysis_data.customer_engaged=false';
    } else if (cd.call_completed_successfully && cd.customer_engaged) {
      derivedOutcome = 'answered';
      reason = 'custom_analysis_data.call_completed+engaged=true';
    }
    // Priority 2: conversation topics (semantic signals)
    else {
      const topicsLower = topics.join(' ').toLowerCase();
      if (topicsLower.includes('resched')) {
        derivedOutcome = 'rescheduled';
        reason = 'topics.includes(resched)';
      } else if (topicsLower.includes('cancel')) {
        derivedOutcome = 'cancelled';
        reason = 'topics.includes(cancel)';
      } else if (topicsLower.includes('confirm')) {
        derivedOutcome = 'confirmed';
        reason = 'topics.includes(confirm)';
      } else if (topicsLower.includes('voicemail')) {
        derivedOutcome = 'voicemail';
        reason = 'topics.includes(voicemail)';
      }
      // Priority 3: legacy free text (call_outcome field)
      else if (outcomeStr.includes('resched')) {
        derivedOutcome = 'rescheduled';
        reason = 'call_outcome.includes(resched)';
      } else if (outcomeStr.includes('cancel')) {
        derivedOutcome = 'cancelled';
        reason = 'call_outcome.includes(cancel)';
      } else if (outcomeStr.includes('confirm')) {
        derivedOutcome = 'confirmed';
        reason = 'call_outcome.includes(confirm)';
      } else if (outcomeStr.includes('voicemail')) {
        derivedOutcome = 'voicemail';
        reason = 'call_outcome.includes(voicemail)';
      } else if (outcomeStr.includes('no answer') || outcomeStr.includes('no_answer')) {
        derivedOutcome = 'no_answer';
        reason = 'call_outcome.includes(no_answer)';
      } else if (outcomeStr.includes('busy')) {
        derivedOutcome = 'busy';
        reason = 'call_outcome.includes(busy)';
      }
      // Priority 4: call_status fallback (NEVER equate completed with confirmed)
      else if (status === 'no-answer' || status === 'no_answer') {
        derivedOutcome = 'no_answer';
        reason = 'call_status=no_answer';
      } else if (status === 'busy') {
        derivedOutcome = 'busy';
        reason = 'call_status=busy';
      } else if (status === 'failed') {
        derivedOutcome = 'failed';
        reason = 'call_status=failed';
      } else if (status === 'completed') {
        // Expert Fix: completed ≠ confirmed, just means call connected
        derivedOutcome = 'answered';
        reason = 'call_status=completed (person answered, outcome unknown)';
      }
    }
    
    // Observability logging (Expert Recommendation)
    console.log(`📊 Outcome derived: ${derivedOutcome} (reason: ${reason})`);
    
    return derivedOutcome;
  }

  // Derive appointment action from outcome
  determineAppointmentAction(payload: RetellWebhookPayload): string {
    const outcome = this.determineCallOutcome(payload);
    
    // Map outcome to appointment action
    if (outcome === 'confirmed') return 'confirmed';
    if (outcome === 'cancelled') return 'cancelled';
    if (outcome === 'rescheduled') return 'rescheduled';
    
    return 'none'; // No appointment action for other outcomes
  }
}

export const retellService = new RetellService();