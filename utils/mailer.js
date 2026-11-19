const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendMail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !to) {
    console.warn("Email skipped: RESEND_API_KEY or recipient is missing.");
    return false;
  }

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject,
      html,
      text,
    });

    console.log("Email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Resend email failed:", error.message);
    return false;
  }
}

module.exports = { sendMail };