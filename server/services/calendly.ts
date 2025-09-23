interface CalendlyEvent {
  uri: string;
  name: string;
  status: 'active' | 'canceled';
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type: string;
    location?: string;
    join_url?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
}

interface CalendlyInvitee {
  uri: string;
  name: string;
  email: string;
  text_reminder_number?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  canceled: boolean;
  rescheduled: boolean;
  payment?: {
    external_id: string;
    provider: string;
    amount: number;
    currency: string;
    terms: string;
    successful: boolean;
  };
  questions_and_answers?: Array<{
    question: string;
    answer: string;
    position: number;
  }>;
  tracking?: {
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_content?: string;
    utm_term?: string;
    salesforce_uuid?: string;
  };
}

interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  slug: string;
  scheduling_url: string;
  duration: number;
  kind: string;
  pooling_type?: string;
  type: string;
  color: string;
  created_at: string;
  updated_at: string;
  internal_note?: string;
  description_plain?: string;
  description_html?: string;
}

interface CalendlyWebhookPayload {
  event: string;
  time: string;
  payload: {
    event?: CalendlyEvent;
    invitee?: CalendlyInvitee;
    event_type?: CalendlyEventType;
    questions_and_answers?: Array<{
      question: string;
      answer: string;
      position: number;
    }>;
    old_event?: CalendlyEvent;
    old_invitee?: CalendlyInvitee;
    new_event?: CalendlyEvent;
    new_invitee?: CalendlyInvitee;
  };
}

export class CalendlyService {
  private baseUrl = 'https://api.calendly.com';

  async getScheduledEvents(accessToken: string, organization?: string, user?: string): Promise<CalendlyEvent[]> {
    const url = new URL(`${this.baseUrl}/scheduled_events`);
    if (organization) url.searchParams.append('organization', organization);
    if (user) url.searchParams.append('user', user);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.collection || [];
  }

  async getEvent(accessToken: string, eventUri: string): Promise<CalendlyEvent> {
    const response = await fetch(`${this.baseUrl}/scheduled_events/${this.extractUuidFromUri(eventUri)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.resource;
  }

  async getEventInvitees(accessToken: string, eventUri: string): Promise<CalendlyInvitee[]> {
    const eventUuid = this.extractUuidFromUri(eventUri);
    const response = await fetch(`${this.baseUrl}/scheduled_events/${eventUuid}/invitees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.collection || [];
  }

  async cancelEvent(accessToken: string, eventUri: string, reason?: string): Promise<CalendlyEvent> {
    const eventUuid = this.extractUuidFromUri(eventUri);
    const response = await fetch(`${this.baseUrl}/scheduled_events/${eventUuid}/cancellation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: reason || 'Cancelled via VioConcierge' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.resource;
  }

  async getEventTypes(accessToken: string, organization?: string, user?: string): Promise<CalendlyEventType[]> {
    const url = new URL(`${this.baseUrl}/event_types`);
    if (organization) url.searchParams.append('organization', organization);
    if (user) url.searchParams.append('user', user);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.collection || [];
  }

  async getCurrentUser(accessToken: string) {
    const response = await fetch(`${this.baseUrl}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.resource;
  }

  parseWebhookPayload(payload: any): CalendlyWebhookPayload {
    return {
      event: payload.event,
      time: payload.time,
      payload: payload.payload,
    };
  }

  mapEventToContact(event: CalendlyEvent, invitee: CalendlyInvitee) {
    return {
      name: invitee.name,
      email: invitee.email,
      phone: invitee.text_reminder_number || '',
      appointmentTime: new Date(event.start_time),
      appointmentType: event.name,
      appointmentDuration: Math.round(
        (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60)
      ),
      appointmentStatus: this.mapCalendlyStatusToInternal(event.status, invitee.canceled),
      notes: this.buildNotesFromInvitee(invitee),
    };
  }

  private buildNotesFromInvitee(invitee: CalendlyInvitee): string {
    let notes = `Calendly booking: ${this.extractUuidFromUri(invitee.uri)}`;
    
    if (invitee.questions_and_answers && invitee.questions_and_answers.length > 0) {
      notes += '\n\nQuestions & Answers:';
      invitee.questions_and_answers.forEach(qa => {
        notes += `\n${qa.question}: ${qa.answer}`;
      });
    }

    if (invitee.tracking) {
      const tracking = invitee.tracking;
      if (tracking.utm_source || tracking.utm_campaign) {
        notes += '\n\nTracking:';
        if (tracking.utm_source) notes += `\nSource: ${tracking.utm_source}`;
        if (tracking.utm_campaign) notes += `\nCampaign: ${tracking.utm_campaign}`;
        if (tracking.utm_medium) notes += `\nMedium: ${tracking.utm_medium}`;
      }
    }

    return notes;
  }

  private mapCalendlyStatusToInternal(eventStatus: string, inviteeCanceled: boolean): string {
    if (inviteeCanceled || eventStatus === 'canceled') {
      return 'cancelled';
    }
    
    switch (eventStatus) {
      case 'active':
        return 'confirmed';
      default:
        return 'pending';
    }
  }

  determineWebhookAction(payload: CalendlyWebhookPayload): 'create' | 'update' | 'cancel' | 'unknown' {
    switch (payload.event) {
      case 'invitee.created':
        return 'create';
      case 'invitee.updated':
        return 'update';
      case 'invitee.canceled':
        return 'cancel';
      default:
        return 'unknown';
    }
  }

  private extractUuidFromUri(uri: string): string {
    // Calendly URIs typically look like: https://api.calendly.com/scheduled_events/AAAAAAAAAAAAAAAA
    const parts = uri.split('/');
    return parts[parts.length - 1];
  }

  validateWebhookSignature(payload: string, signature: string, webhookSecret: string): boolean {
    // Calendly uses HMAC SHA256 for webhook verification
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export const calendlyService = new CalendlyService();