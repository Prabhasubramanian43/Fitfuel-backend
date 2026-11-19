
const router = require("express").Router();
const Feedback = require("../models/Feedback");
const { sendMail } = require("../utils/mailer");
router.post("/", async (req,res,next)=>{
  try {
    const {name,email,rating,message}=req.body;
    const numericRating=Number(rating);
    if(!name?.trim()||!email?.trim()||!message?.trim()) return res.status(400).json({message:"Please fill in all feedback fields."});
    if(!Number.isInteger(numericRating)||numericRating<1||numericRating>5) return res.status(400).json({message:"Rating must be between 1 and 5."});
    const feedback=await Feedback.create({name:name.trim(),email:email.trim().toLowerCase(),rating:numericRating,message:message.trim()});
    const adminEmail=process.env.ADMIN_EMAIL||process.env.SMTP_USER;
    await Promise.all([
      sendMail({to:adminEmail,subject:`New FitFuel feedback (${numericRating}/5)`,text:`${name} (${email}) rated ${numericRating}/5\n\n${message}`,html:`<h2>New FitFuel feedback</h2><p><b>${name}</b> (${email})</p><p>Rating: ${numericRating}/5</p><p>${message}</p>`}),
      sendMail({to:email.trim(),subject:"Thank you for your FitFuel feedback",text:`Hi ${name},\n\nThank you for sharing your feedback with FitFuel. We appreciate it.\n\nFitFuel Team`,html:`<h2>Thank you, ${name}!</h2><p>We appreciate you taking the time to share your feedback.</p><p>FitFuel Team</p>`})
    ]);
    res.status(201).json({message:"Feedback submitted successfully!",feedback});
  }catch(e){next(e);}
});
module.exports=router;
