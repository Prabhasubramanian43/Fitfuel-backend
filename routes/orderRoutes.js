const router = require("express").Router();

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { sendMail } = require("../utils/mailer");

router.post("/", async (req, res, next) => {
  try {
    const {
      customer,
      items,
      sessionId,
      paymentMethod = "COD",
    } = req.body;

    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.address ||
      !customer?.city
    ) {
      return res.status(400).json({
        message: "Please provide name, phone, address and city.",
      });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        message: "Your cart is empty.",
      });
    }

    if (!["QR", "COD"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method.",
      });
    }

    let total = 0;

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity) || 1);

      if (item.isCombo && Array.isArray(item.items)) {
        total +=
          item.items.reduce(
            (sum, sub) => sum + Math.max(0, Number(sub.price) || 0),
            0
          ) * qty;
      } else {
        const product = await Product.findOne({
          frontendId: Number(item.id),
          active: true,
        });

        if (!product) {
          return res.status(400).json({
            message: `Product not found: ${item.name || item.id}`,
          });
        }

        total += product.price * qty;
      }
    }

    const orderNumber = `FF${Date.now().toString().slice(-8)}`;

    const order = await Order.create({
      orderNumber,
      customer,
      items,
      total,
      paymentMethod,
      paymentStatus: "pending",
    });

    if (sessionId) {
      await Cart.findOneAndUpdate({ sessionId }, { $set: { items: [] } });
    }

    const itemLines = items.map((item) => `${item.name || "Item"} x ${item.quantity || 1}`).join("\\n");
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const customerEmail = customer.email && customer.email.trim();
    const orderText = `Order: ${order.orderNumber}\\nCustomer: ${customer.name}\\nPhone: ${customer.phone}\\nEmail: ${customer.email || "Not provided"}\\nAddress: ${customer.address}, ${customer.city}\\nItems:\\n${itemLines}\\nTotal: Rs. ${total}\\nPayment: ${paymentMethod}`;
    await Promise.all([
      sendMail({ to: adminEmail, subject: `New FitFuel order ${order.orderNumber}`, text: orderText, html: `<h2>New FitFuel Order</h2><p><b>Order:</b> ${order.orderNumber}</p><p><b>Customer:</b> ${customer.name}</p><p><b>Phone:</b> ${customer.phone}</p><p><b>Email:</b> ${customer.email || "Not provided"}</p><p><b>Address:</b> ${customer.address}, ${customer.city}</p><p><b>Items:</b> ${itemLines.replace(/\\n/g, "<br>")}</p><p><b>Total:</b> ₹${total}</p><p><b>Payment:</b> ${paymentMethod}</p>` }),
      customerEmail ? sendMail({ to: customerEmail, subject: `FitFuel order confirmation - ${order.orderNumber}`, text: `Hi ${customer.name},\\n\\nYour FitFuel order has been placed successfully.\\n\\n${orderText}\\n\\nThank you for choosing FitFuel!`, html: `<h2>Thank you for your order, ${customer.name}!</h2><p>Your order <b>${order.orderNumber}</b> has been placed successfully.</p><p>${itemLines.replace(/\\n/g, "<br>")}</p><p><b>Total: ₹${total}</b></p><p>Payment: ${paymentMethod}</p><p>FitFuel Team</p>` }) : Promise.resolve(false)
    ]);

    res.status(201).json({
      id: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const order = await Order.findOne({
      $or: [
        {
          _id: /^[0-9a-fA-F]{24}$/.test(req.params.id)
            ? req.params.id
            : null,
        },
        {
          orderNumber: req.params.id,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (e) {
    next(e);
  }
});

module.exports = router;