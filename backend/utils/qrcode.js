const QRCode = require("qrcode");

/**
 * Generate QR code as data URL
 * @param {string} data - Data to encode in QR code (e.g., ticket ID or JSON string)
 * @returns {Promise<string>} - Data URL of QR code image
 */
async function generateQRCode(data) {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 1,
    });
    return qrDataUrl;
  } catch (err) {
    console.error("QR code generation error:", err);
    throw new Error("Failed to generate QR code");
  }
}

module.exports = { generateQRCode };
