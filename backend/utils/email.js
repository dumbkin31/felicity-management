const nodemailer = require("nodemailer");

// Create transporter (configure with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send ticket confirmation email
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.participantName - Participant name
 * @param {string} params.eventName - Event name
 * @param {string} params.ticketId - Ticket ID
 * @param {string} params.qrCodeDataUrl - QR code data URL
 * @param {string} params.eventType - Event type (normal/merch)
 * @param {Object} params.eventDetails - Additional event details
 */
async function sendTicketEmail({
  to,
  participantName,
  eventName,
  ticketId,
  qrCodeDataUrl,
  eventType,
  eventDetails = {},
}) {
  try {
    // Skip if SMTP not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("SMTP not configured, skipping email for:", to);
      return { ok: true, skipped: true };
    }

    const subject = `Your Ticket for ${eventName} - ${ticketId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
          .ticket-id { font-size: 24px; font-weight: bold; color: #4CAF50; margin: 10px 0; }
          .qr-code { text-align: center; margin: 20px 0; }
          .details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎟️ Registration Confirmed!</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${participantName}</strong>,</p>
            <p>Your ${eventType === "merch" ? "purchase" : "registration"} for <strong>${eventName}</strong> has been confirmed!</p>
            
            <div class="details">
              <p><strong>Ticket ID:</strong></p>
              <p class="ticket-id">${ticketId}</p>
              
              ${eventDetails.startAt ? `<p><strong>Event Date:</strong> ${new Date(eventDetails.startAt).toLocaleString()}</p>` : ""}
              ${eventDetails.quantity ? `<p><strong>Quantity:</strong> ${eventDetails.quantity}</p>` : ""}
            </div>
            
            <div class="qr-code">
              <p><strong>Your QR Code:</strong></p>
              <img src="${qrCodeDataUrl}" alt="Ticket QR Code" />
              <p style="font-size: 12px; color: #777;">Show this QR code at the event</p>
            </div>
            
            <p>Please keep this email for your records. You can present the QR code at the event for verification.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>© ${new Date().getFullYear()} Felicity Event Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Felicity Events" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("Email sending error:", err);
    // Don't throw - we don't want email failure to block registration
    return { ok: false, error: err.message };
  }
}

/**
 * Send organizer credentials email
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.organizerName - Organizer name
 * @param {string} params.loginEmail - Auto-generated login email
 * @param {string} params.password - Auto-generated password
 */
async function sendOrganizerCredentialsEmail({
  to,
  organizerName,
  loginEmail,
  password,
}) {
  try {
    // Skip if SMTP not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("SMTP not configured, skipping organizer credentials email for:", to);
      return { ok: true, skipped: true };
    }

    const subject = `Felicity Events - Your Organizer Account Credentials`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
          .content { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; }
          .header h1 { margin: 0; font-size: 24px; }
          .credentials { background: #f9f9f9; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; font-family: 'Courier New', monospace; }
          .credential-label { font-weight: bold; color: #667eea; font-size: 12px; text-transform: uppercase; margin-top: 10px; }
          .credential-value { font-size: 16px; color: #333; word-break: break-all; }
          .section { margin: 20px 0; }
          .section h2 { color: #667eea; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .warning strong { color: #856404; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          a { color: #667eea; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="header">
              <h1>Welcome to Felicity Events</h1>
            </div>
            
            <p>Hello <strong>${organizerName}</strong>,</p>
            
            <p>Your organizer account has been successfully created on Felicity Events platform. Below are your login credentials:</p>
            
            <div class="credentials">
              <div class="credential-label">Login Email</div>
              <div class="credential-value">${loginEmail}</div>
              
              <div class="credential-label">Password</div>
              <div class="credential-value">${password}</div>
            </div>
            
            <div class="section">
              <h2>Getting Started</h2>
              <ol>
                <li>Visit the Felicity Events platform</li>
                <li>Click on "Login"</li>
                <li>Enter your login email: <strong>${loginEmail}</strong></li>
                <li>Enter your password: <strong>${password}</strong></li>
                <li>You can now create and manage events</li>
              </ol>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> Please keep this email safe. Your login credentials should not be shared with anyone. If you need to reset your password, contact the administrator.
            </div>
            
            <div class="section">
              <h2>Need Help?</h2>
              <p>If you have any questions or need assistance, please contact the Felicity Events support team.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>&copy; 2026 Felicity Events. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });

    console.log("Organizer credentials email sent:", info.response);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("Error sending organizer credentials email:", err);
    // Don't throw - we don't want email failure to block organizer creation
    return { ok: false, error: err.message };
  }
}

module.exports = { sendTicketEmail, sendOrganizerCredentialsEmail };
