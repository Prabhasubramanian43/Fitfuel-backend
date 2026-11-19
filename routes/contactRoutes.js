
const router = require("express").Router();
const Contact = require("../models/Contact");
const { sendMail } = require("../utils/mailer");
router.post("/", async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim())
      return res.status(400).json({ message: "Name, email and message are required." });
    const saved = await Contact.create({ name:name.trim(), email:email.trim().toLowerCase(), subject:subject || "", message:message.trim() });
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const safe = String(message).replace(/[<>&"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
    await Promise.all([
      sendMail({ to: adminEmail, subject: `FitFuel Contact: ${subject || "New message"}`, text:`From: ${name} (${email})\n\n${message}`, html:`<h2>New FitFuel contact message</h2><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Subject:</b> ${subject || "-"}</p><p>${safe}</p>` }),
      sendMail({ to: email.trim(), subject:"We received your FitFuel message", text:`Hi ${name},\n\nThank you for contacting FitFuel. We have received your message and our team will get back to you.\n\nFitFuel Team`, html:`<h2>Thanks for contacting FitFuel, ${name}!</h2><p>We received your message and our team will get back to you soon.</p><p>FitFuel Team</p>` })
    ]);
    res.status(201).json({ message:"Your message was saved and email notifications were processed.", id:saved._id });
  } catch(e){next(e);}
});
module.exports = router;
