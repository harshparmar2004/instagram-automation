const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    const user = process.env.GMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

    if (!user || !pass) {
        return null;
    }

    if (!transporter) {
        if (process.env.SMTP_HOST) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user, pass }
            });
        } else {
            // Default to official Gmail SMTP
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user, pass }
            });
        }
    }

    return transporter;
}

/**
 * Send a 6-digit OTP email to a user for registration or verification
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit numeric OTP code
 * @param {string} userName - Optional recipient name
 * @returns {Promise<{success: boolean, simulated?: boolean, error?: string}>}
 */
async function sendOtpEmail(toEmail, otp, userName = 'Creator') {
    const cleanEmail = String(toEmail).trim().toLowerCase();
    const cleanName = String(userName || 'Creator').trim();
    const mailClient = getTransporter();

    const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@instaauto.app';
    const appName = 'InstaAuto';

    // If no SMTP credentials configured, run in simulated/dev mode
    if (!mailClient) {
        console.log('\n==============================================================');
        console.log(`[EmailService - DEV/SIMULATION MODE]`);
        console.log(`To: ${cleanEmail}`);
        console.log(`Recipient: ${cleanName}`);
        console.log(`Subject: Your ${appName} Verification Code: ${otp}`);
        console.log(`Verification Code: ${otp} (Valid for 10 minutes)`);
        console.log(`Note: To send real emails, set GMAIL_USER and GMAIL_APP_PASSWORD in .env`);
        console.log('==============================================================\n');
        return { success: true, simulated: true, otp };
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your InstaAuto Account</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 10px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #15803d; font-family: 'Courier New', Courier, monospace; }
        .otp-hint { font-size: 12px; color: #64748b; margin-top: 8px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        .badge { display: inline-block; padding: 4px 10px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="badge">Official Creator Portal</div>
          <h1>InstaAuto</h1>
          <p>Instagram DM Automation Platform</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${cleanName},</div>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Welcome to InstaAuto! Use the verification code below to verify your email address and activate your creator workspace:
          </p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-hint">⏱️ This verification code is valid for <strong>10 minutes</strong>.</div>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
            Never share this OTP with anyone. If you didn't attempt to sign up on InstaAuto, you can safely disregard this email.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} InstaAuto Platform &bull; Secured with Meta Graph API
        </div>
      </div>
    </body>
    </html>
    `;

    try {
        const info = await mailClient.sendMail({
            from: `"${appName} Support" <${senderEmail}>`,
            to: cleanEmail,
            subject: `[${otp}] Your InstaAuto Verification Code`,
            text: `Hello ${cleanName},\n\nYour InstaAuto verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nNever share this code with anyone.`,
            html: htmlContent
        });

        console.log(`[EmailService] OTP email dispatched to ${cleanEmail} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[EmailService] Failed to send email to ${cleanEmail}:`, err.message);
        return { success: false, error: err.message };
    }
}

module.exports = {
    sendOtpEmail,
    getTransporter
};
