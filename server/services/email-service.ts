import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY not configured - email sending will be disabled');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  token: string;
  role: string;
}

export async function sendInvitationEmail({ to, inviterName, token, role }: SendInvitationEmailParams): Promise<boolean> {
  if (!resend) {
    console.error('❌ Email service not configured - RESEND_API_KEY missing');
    return false;
  }

  const acceptUrl = `${process.env.REPL_URL || 'http://localhost:5000'}/accept-invitation?token=${token}`;
  const roleDisplay = role === 'client_admin' ? 'Admin' : 'Team Member';

  try {
    const { data, error } = await resend.emails.send({
      from: 'VioConcierge <noreply@smartaisolutions.ai>',
      to: [to],
      subject: `You've been invited to join VioConcierge as ${roleDisplay}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Team Invitation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">VioConcierge</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Intelligent Voice Appointment Management</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">You've Been Invited!</h2>
              
              <p><strong>${inviterName}</strong> has invited you to join their team on VioConcierge as a <strong>${roleDisplay}</strong>.</p>
              
              <p>VioConcierge is an intelligent voice appointment management platform that helps businesses reduce no-shows through AI-powered reminder calls.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #1f2937;">Your role: ${roleDisplay}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  ${role === 'client_admin' 
                    ? 'As an admin, you\'ll have full access to manage contacts, appointments, team members, and view analytics.' 
                    : 'As a team member, you\'ll be able to view contacts, appointments, and access reports.'}
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Accept Invitation</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="background: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #4b5563;">
                ${acceptUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  <strong>Note:</strong> This invitation will expire in 7 days.
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} VioConcierge. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send invitation email:', error);
      if (error.message && error.message.includes('testing emails')) {
        console.warn('⚠️ Resend testing restriction: Emails can only be sent to verified domain or account owner email');
        console.warn('ℹ️ To send to any email, verify a domain at https://resend.com/domains');
      }
      return false;
    }

    console.log(`✅ Invitation email sent to ${to}`, data);
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}
