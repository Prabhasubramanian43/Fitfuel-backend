
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const adminAuth = require("../middleware/adminAuth");
const Order = require("../models/Order");
const Contact = require("../models/Contact");
const Feedback = require("../models/Feedback");
const Product = require("../models/Product");

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminEmail || !adminPassword || !process.env.JWT_SECRET)
    return res.status(503).json({ message: "Admin credentials are not configured on the server." });
  const valid = email === adminEmail && (await bcrypt.compare(password, adminPassword).catch(() => false) || password === adminPassword);
  if (!valid) return res.status(401).json({ message: "Invalid admin email or password." });
  const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, admin: { email } });
});
router.use(adminAuth);

router.get("/dashboard", async (req, res, next) => {
  try {
    const [orders, contacts, feedback, products, revenue] = await Promise.all([
      Order.countDocuments(), Contact.countDocuments(), Feedback.countDocuments(),
      Product.countDocuments(), Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$total" } } }])
    ]);
    res.json({ orders, contacts, feedback, products, revenue: revenue[0]?.total || 0 });
  } catch (e) { next(e); }
});
router.get("/orders", async (req,res,next)=>{ try { res.json(await Order.find().sort({createdAt:-1}).limit(500)); } catch(e){next(e);} });
router.patch("/orders/:id", async (req,res,next)=>{
  try {
    const allowed = ["Placed","Confirmed","Preparing","Out for Delivery","Delivered","Cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({message:"Invalid order status."});
    const order = await Order.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true,runValidators:true});
    if (!order) return res.status(404).json({message:"Order not found."});
    res.json(order);
  } catch(e){next(e);}
});
router.delete("/orders/:id", async(req,res,next)=>{try{const x=await Order.findByIdAndDelete(req.params.id); if(!x)return res.status(404).json({message:"Order not found."});res.json({message:"Order deleted."});}catch(e){next(e);}});
router.get("/contacts", async(req,res,next)=>{try{res.json(await Contact.find().sort({createdAt:-1}).limit(500));}catch(e){next(e);}});
router.patch("/contacts/:id", async(req,res,next)=>{try{const x=await Contact.findByIdAndUpdate(req.params.id,{status:req.body.status==="resolved"?"resolved":"new"},{new:true});if(!x)return res.status(404).json({message:"Message not found."});res.json(x);}catch(e){next(e);}});
router.delete("/contacts/:id", async(req,res,next)=>{try{const x=await Contact.findByIdAndDelete(req.params.id);if(!x)return res.status(404).json({message:"Message not found."});res.json({message:"Message deleted."});}catch(e){next(e);}});
router.get("/feedback", async(req,res,next)=>{try{res.json(await Feedback.find().sort({createdAt:-1}).limit(500));}catch(e){next(e);}});
router.delete("/feedback/:id", async(req,res,next)=>{try{const x=await Feedback.findByIdAndDelete(req.params.id);if(!x)return res.status(404).json({message:"Feedback not found."});res.json({message:"Feedback deleted."});}catch(e){next(e);}});
router.get("/products", async(req,res,next)=>{try{res.json(await Product.find().sort({createdAt:-1}));}catch(e){next(e);}});
router.patch("/products/:id", async(req,res,next)=>{try{const allowed={};["name","price","description","category","active"].forEach(k=>{if(req.body[k]!==undefined)allowed[k]=req.body[k];});const x=await Product.findByIdAndUpdate(req.params.id,allowed,{new:true,runValidators:true});if(!x)return res.status(404).json({message:"Product not found."});res.json(x);}catch(e){next(e);}});
module.exports = router;
