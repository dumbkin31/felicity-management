const nodemailer = require("nodemailer");
const Buffer = require("buffer").Buffer;

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
 * Convert data URL to Buffer for email attachment
 */
function dataURLtoBuffer(dataURL) {
  const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

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
              <img src="cid:qrcode@felicity" alt="Ticket QR Code" style="max-width: 300px;" />
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
      attachments: [
        {
          filename: "qrcode.png",
          content: dataURLtoBuffer(qrCodeDataUrl),
          cid: "qrcode@felicity",
        },
      ],
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
 * Send payment approval email with QR code
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.participantName - Participant name
 * @param {string} params.eventName - Event name
 * @param {string} params.ticketId - Ticket ID
 * @param {string} params.qrCodeDataUrl - QR code data URL
 * @param {string} params.eventType - Event type (normal/merch)
 * @param {Object} params.eventDetails - Additional event details
 */
async function sendPaymentApprovalEmail({
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
      console.log("SMTP not configured, skipping payment approval email for:", to);
      return { ok: true, skipped: true };
    }

    const subject = `Payment Approved - Your ${eventType === "merch" ? "Order" : "Registration"} is Ready! - ${ticketId}`;
    
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
          .badge { display: inline-block; background: #4CAF50; color: white; padding: 8px 16px; border-radius: 4px; margin: 10px 0; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Approved!</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${participantName}</strong>,</p>
            <p>Great news! Your payment for <strong>${eventName}</strong> has been approved by the organizer.</p>
            
            <div class="badge">Your ${eventType === "merch" ? "order" : "registration"} is now confirmed!</div>
            
            <div class="details">
              <p><strong>Ticket ID:</strong></p>
              <p class="ticket-id">${ticketId}</p>
              
              ${eventDetails.startAt ? `<p><strong>Event Date:</strong> ${new Date(eventDetails.startAt).toLocaleString()}</p>` : ""}
              ${eventDetails.quantity ? `<p><strong>Quantity:</strong> ${eventDetails.quantity}</p>` : ""}
            </div>
            
            <div class="qr-code">
              <p><strong>Your QR Code (Show at Event):</strong></p>
              <img src="cid:qrcode@felicity" alt="Ticket QR Code" style="max-width: 300px;" />
              <p style="font-size: 12px; color: #777;">Present this QR code for verification</p>
            </div>
            
            <p>Please keep this email safe. You'll need your QR code and ticket ID at the event.</p>
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
      attachments: [
        {
          filename: "qrcode.png",
          content: dataURLtoBuffer(qrCodeDataUrl),
          cid: "qrcode@felicity",
        },
      ],
    });

    console.log("Payment approval email sent:", info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("Email sending error:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Send payment rejection email
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.participantName - Participant name
 * @param {string} params.eventName - Event name
 * @param {string} params.ticketId - Ticket ID
 * @param {string} params.reason - Rejection reason
 */
async function sendPaymentRejectionEmail({
  to,
  participantName,
  eventName,
  ticketId,
  reason,
}) {
  try {
    // Skip if SMTP not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("SMTP not configured, skipping payment rejection email for:", to);
      return { ok: true, skipped: true };
    }

    const subject = `Payment Rejected - ${eventName} - ${ticketId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { background: #ffebee; padding: 20px; margin: 20px 0; }
          .ticket-id { font-size: 24px; font-weight: bold; color: #f44336; margin: 10px 0; }
          .details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #f44336; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
          .action-btn { display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Payment Rejected</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${participantName}</strong>,</p>
            <p>Unfortunately, your payment proof for <strong>${eventName}</strong> has been rejected by the organizer.</p>
            
            <div class="details">
              <p><strong>Ticket ID:</strong></p>
              <p class="ticket-id">${ticketId}</p>
              
              <p><strong>Reason:</strong></p>
              <p>${reason}</p>
            </div>
            
            <p>Please review the reason above and submit a new payment proof if needed. You can upload a corrected proof from your registration page.</p>
            
            <p>If you have questions, please contact the event organizer.</p>
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

    console.log("Payment rejection email sent:", info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("Email sending error:", err);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendTicketEmail, sendPaymentApprovalEmail, sendPaymentRejectionEmail };