import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY not configured - email sending will be disabled');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
  recipientName?: string;
}

export const emailService = {
  async sendPasswordResetEmail({ to, resetUrl, recipientName }: SendPasswordResetEmailParams): Promise<boolean> {
    if (!resend) {
      console.error('❌ Email service not configured - RESEND_API_KEY missing');
      return false;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'VioConcierge <onboarding@resend.dev>', // Using Resend's test domain
        to: [to],
        subject: 'Reset Your VioConcierge Password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">VioConcierge</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Intelligent Voice Appointment Management</p>
              </div>
              
              <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
                
                ${recipientName ? `<p>Hi ${recipientName},</p>` : '<p>Hi there,</p>'}
                
                <p>We received a request to reset your password for your VioConcierge account. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
                <p style="background: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #4b5563;">
                  ${resetUrl}
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    <strong>Security tip:</strong> This link will expire in 1 hour and can only be used once.
                  </p>
                  <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns.
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
        console.error('❌ Failed to send password reset email:', error);
        return false;
      }

      console.log(`✅ Password reset email sent to ${to}`, data);
      return true;
    } catch (error) {
      console.error('❌ Email service error:', error);
      return false;
    }
  },

  async isConfigured(): Promise<boolean> {
    return resend !== null;
  }
};
