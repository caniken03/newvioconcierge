import { format } from 'date-fns';

interface CallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  pendingCalls: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  rescheduledAppointments: number;
}

interface DetailedData {
  confirmedAppointments: Array<{
    contactName: string;
    appointmentTime: Date | null;
    appointmentType: string;
  }>;
  cancelledAppointments: Array<{
    contactName: string;
    appointmentTime: Date | null;
    appointmentType: string;
  }>;
  rescheduledAppointments: Array<{
    contactName: string;
    appointmentTime: Date | null;
    appointmentType: string;
  }>;
  noAnswerCalls: Array<{
    contactName: string;
    appointmentTime: Date | null;
  }>;
  voicemailCalls: Array<{
    contactName: string;
    appointmentTime: Date | null;
  }>;
  failedCalls: Array<{
    contactName: string;
    outcome: string;
  }>;
}

interface DailySummaryData {
  userName: string;
  companyName: string;
  date: Date;
  stats: CallStats;
  detailedData: DetailedData;
  upcomingAppointments: Array<{
    contactName: string;
    appointmentDate: Date;
    appointmentType: string;
  }>;
}

export function generateDailySummaryEmail(data: DailySummaryData): string {
  const { userName, companyName, date, stats, detailedData, upcomingAppointments } = data;
  const formattedDate = format(date, 'MMMM d, yyyy');
  
  const successRate = stats.totalCalls > 0 
    ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) 
    : 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Summary - ${formattedDate}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #667eea;
      margin: 0;
    }
    .stat-label {
      font-size: 13px;
      color: #666;
      margin-top: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .success-rate {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .success-rate-value {
      font-size: 36px;
      font-weight: 700;
      margin: 0;
    }
    .success-rate-label {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 5px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 25px 0 15px;
      color: #333;
    }
    .appointment-list {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
    }
    .appointment-item {
      padding: 12px;
      background: white;
      border-radius: 6px;
      margin-bottom: 10px;
      border-left: 4px solid #667eea;
    }
    .appointment-item:last-child {
      margin-bottom: 0;
    }
    .appointment-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    .appointment-details {
      font-size: 14px;
      color: #666;
    }
    .no-appointments {
      text-align: center;
      color: #666;
      padding: 20px;
      font-style: italic;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #666;
      border-top: 1px solid #eee;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Summary</h1>
      <p>${formattedDate}</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hello ${userName},
      </div>
      
      <p>Here's your daily summary for ${companyName}:</p>
      
      <div class="success-rate">
        <div class="success-rate-value">${successRate}%</div>
        <div class="success-rate-label">Call Success Rate</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.totalCalls}</div>
          <div class="stat-label">Total Calls</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.successfulCalls}</div>
          <div class="stat-label">Successful</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.failedCalls}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.pendingCalls}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>
      
      <h2 class="section-title">📅 Appointment Status</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.confirmedAppointments}</div>
          <div class="stat-label">Confirmed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.rescheduledAppointments}</div>
          <div class="stat-label">Rescheduled</div>
        </div>
      </div>

      ${detailedData.confirmedAppointments.length > 0 ? `
        <h2 class="section-title">✅ Recently Confirmed</h2>
        <div class="appointment-list">
          ${detailedData.confirmedAppointments.map(apt => `
            <div class="appointment-item">
              <div class="appointment-name">${apt.contactName}</div>
              <div class="appointment-details">
                ${apt.appointmentTime ? format(new Date(apt.appointmentTime), 'MMM d, yyyy h:mm a') : 'Time TBD'} • ${apt.appointmentType}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${detailedData.rescheduledAppointments.length > 0 ? `
        <h2 class="section-title">📅 Recently Rescheduled</h2>
        <div class="appointment-list">
          ${detailedData.rescheduledAppointments.map(apt => `
            <div class="appointment-item" style="border-left-color: #f59e0b;">
              <div class="appointment-name">${apt.contactName}</div>
              <div class="appointment-details">
                ${apt.appointmentTime ? format(new Date(apt.appointmentTime), 'MMM d, yyyy h:mm a') : 'Time TBD'} • ${apt.appointmentType}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${detailedData.cancelledAppointments.length > 0 ? `
        <h2 class="section-title">❌ Recently Cancelled</h2>
        <div class="appointment-list">
          ${detailedData.cancelledAppointments.map(apt => `
            <div class="appointment-item" style="border-left-color: #ef4444;">
              <div class="appointment-name">${apt.contactName}</div>
              <div class="appointment-details">
                ${apt.appointmentTime ? 'Was scheduled for ' + format(new Date(apt.appointmentTime), 'MMM d, yyyy h:mm a') : 'Time TBD'} • ${apt.appointmentType}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${detailedData.noAnswerCalls.length > 0 ? `
        <h2 class="section-title">📞 No Answer - Needs Follow-up</h2>
        <div class="appointment-list">
          ${detailedData.noAnswerCalls.map(call => `
            <div class="appointment-item" style="border-left-color: #f59e0b;">
              <div class="appointment-name">${call.contactName}</div>
              <div class="appointment-details">
                ${call.appointmentTime ? 'Appointment: ' + format(new Date(call.appointmentTime), 'MMM d, yyyy h:mm a') : 'No appointment set'}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${detailedData.voicemailCalls.length > 0 ? `
        <h2 class="section-title">📨 Voicemail Left</h2>
        <div class="appointment-list">
          ${detailedData.voicemailCalls.map(call => `
            <div class="appointment-item" style="border-left-color: #8b5cf6;">
              <div class="appointment-name">${call.contactName}</div>
              <div class="appointment-details">
                ${call.appointmentTime ? 'Appointment: ' + format(new Date(call.appointmentTime), 'MMM d, yyyy h:mm a') : 'No appointment set'}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${detailedData.failedCalls.length > 0 ? `
        <h2 class="section-title">⚠️ Failed Calls</h2>
        <div class="appointment-list">
          ${detailedData.failedCalls.map(call => `
            <div class="appointment-item" style="border-left-color: #ef4444;">
              <div class="appointment-name">${call.contactName}</div>
              <div class="appointment-details">
                ${call.outcome}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${upcomingAppointments.length > 0 ? `
        <h2 class="section-title">🔜 Upcoming Appointments (Next 24h)</h2>
        <div class="appointment-list">
          ${upcomingAppointments.map(apt => `
            <div class="appointment-item">
              <div class="appointment-name">${apt.contactName}</div>
              <div class="appointment-details">
                ${format(apt.appointmentDate, 'MMM d, yyyy h:mm a')} • ${apt.appointmentType}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <h2 class="section-title">🔜 Upcoming Appointments (Next 24h)</h2>
        <div class="no-appointments">No upcoming appointments in the next 24 hours</div>
      `}
    </div>
    
    <div class="footer">
      <p>This is an automated daily summary from VioConcierge.</p>
      <p>You can manage your notification preferences in your <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'your-app'}/profile">profile settings</a>.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

interface SummaryRecipient {
  email: string;
  userName: string;
  userId: string;
  tenantId: string;
  deliveryTime: string;
  deliveryDays: string[];
}

export function shouldSendSummary(recipient: SummaryRecipient, currentDate: Date): boolean {
  const dayOfWeek = currentDate.getDay().toString();
  const currentTime = format(currentDate, 'HH:mm');
  
  // Check if today is a scheduled day
  if (!recipient.deliveryDays.includes(dayOfWeek)) {
    return false;
  }
  
  // Check if current time matches delivery time (within 1-minute window)
  const [recipientHour, recipientMinute] = recipient.deliveryTime.split(':').map(Number);
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  
  return recipientHour === currentHour && recipientMinute === currentMinute;
}
