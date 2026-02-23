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

module.exports = { sendTicketEmail };