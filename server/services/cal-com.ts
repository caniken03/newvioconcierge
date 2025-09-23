interface CalComBooking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: Array<{
    name: string;
    email: string;
    timeZone: string;
  }>;
  organizer: {
    name: string;
    email: string;
  };
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED';
  location?: string;
  eventTypeId: number;
  metadata?: any;
}

interface CalComEventType {
  id: number;
  title: string;
  slug: string;
  description?: string;
  length: number;
  price: number;
  currency: string;
  metadata?: any;
}

interface CalComWebhookPayload {
  triggerEvent: string;
  createdAt: string;
  payload: {
    booking: CalComBooking;
    eventType: CalComEventType;
    metadata?: any;
  };
}

export class CalComService {
  private baseUrl = 'https://api.cal.com/v1';

  async getBookings(apiKey: string, eventTypeId?: number): Promise<CalComBooking[]> {
    const url = new URL(`${this.baseUrl}/bookings`);
    if (eventTypeId) {
      url.searchParams.append('eventTypeId', eventTypeId.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cal.com API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.bookings || [];
  }

  async getBooking(apiKey: string, bookingId: number): Promise<CalComBooking> {
    const response = await fetch(`${this.baseUrl}/bookings/${bookingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cal.com API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.booking;
  }

  async createBooking(apiKey: string, booking: {
    eventTypeId: number;
    start: string;
    end: string;
    attendee: {
      name: string;
      email: string;
      timeZone?: string;
    };
    metadata?: any;
  }): Promise<CalComBooking> {
    const response = await fetch(`${this.baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(booking),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cal.com API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.booking;
  }

  async cancelBooking(apiKey: string, bookingId: number, reason?: string): Promise<CalComBooking> {
    const response = await fetch(`${this.baseUrl}/bookings/${bookingId}/cancel`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cal.com API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.booking;
  }

  async getEventTypes(apiKey: string): Promise<CalComEventType[]> {
    const response = await fetch(`${this.baseUrl}/event-types`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cal.com API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.event_types || [];
  }

  parseWebhookPayload(payload: any): CalComWebhookPayload {
    return {
      triggerEvent: payload.triggerEvent,
      createdAt: payload.createdAt,
      payload: {
        booking: payload.payload.booking,
        eventType: payload.payload.eventType,
        metadata: payload.payload.metadata,
      },
    };
  }

  mapBookingToContact(booking: CalComBooking) {
    const attendee = booking.attendees[0]; // Take the first attendee
    
    return {
      name: attendee?.name || 'Unknown',
      email: attendee?.email,
      phone: '', // Cal.com bookings don't always include phone
      appointmentTime: new Date(booking.startTime),
      appointmentType: booking.title,
      appointmentDuration: Math.round(
        (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60)
      ),
      appointmentStatus: this.mapCalComStatusToInternal(booking.status),
      notes: booking.description || `Cal.com booking ${booking.uid}`,
    };
  }

  private mapCalComStatusToInternal(status: string): string {
    switch (status) {
      case 'ACCEPTED':
        return 'confirmed';
      case 'PENDING':
        return 'pending';
      case 'CANCELLED':
      case 'REJECTED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  determineWebhookAction(payload: CalComWebhookPayload): 'create' | 'update' | 'cancel' | 'unknown' {
    switch (payload.triggerEvent) {
      case 'BOOKING_CREATED':
        return 'create';
      case 'BOOKING_RESCHEDULED':
      case 'BOOKING_PAID':
        return 'update';
      case 'BOOKING_CANCELLED':
        return 'cancel';
      default:
        return 'unknown';
    }
  }
}

export const calComService = new CalComService();