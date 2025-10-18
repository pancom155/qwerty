const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

exports.generateOtp = () => {
  return otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    upperCase: false,
    specialChars: false
  });
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

exports.sendOtpEmail = async (toEmail, otpCode, type = 'verify') => {
  const isReset = type === 'reset';
  const title = isReset ? 'Reset Your Password' : 'Naps Verification Code';
  const subtitle = isReset ? 'Reset password request' : 'Secure your account';
  const introText = isReset
    ? 'Use the OTP below to reset your password:'
    : 'Use the OTP code below to verify your email address:';

  await transporter.sendMail({
    from: `"Nap's Grill and Restobar" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: isReset ? 'Password Reset OTP' : 'Email Verification OTP',
    html: `
        <div style="
            max-width: 600px;
            margin: auto;
            padding: 30px;
            border-radius: 10px;
            font-family: 'Segoe UI', sans-serif;
            background-color: #ffffff;
            color: #333;
            box-shadow: 0 4px 24px rgba(0,0,0,0.15); /* Increased shadow */
        ">
            <div style="text-align: center; padding-bottom: 20px;">
                <h2 style="margin: 0; color: #0047FF;">${title}</h2>
                <p style="margin: 5px 0; font-weight: 500;">${subtitle}</p>
            </div>

            <p style="font-size: 16px;">Hello,</p>
            <p style="font-size: 16px;">${introText}</p>

            <div style="text-align: center; margin: 20px 0;">
                <span style="
                    display: inline-block;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 4px;
                    padding: 10px 20px;
                    background-color: #fff;
                    color: #000;
                    border-radius: 8px;
                    box-shadow: 0 0 8px rgba(0,0,0,0.15); /* Added shadow to OTP */
                ">
                    ${otpCode}
                </span>
            </div>

            <p style="font-size: 15px;">This code will expire in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

            <p style="font-size: 14px;">Thank you,<br>The Naps Team</p>
        </div>
    `
  });
};

exports.sendReservationEmail = async ({ to, name, tableName }) => {
  if (!to || typeof to !== 'string') {
    console.error("Invalid 'to' email provided to sendReservationEmail:", to);
    return;
  }

  await transporter.sendMail({
    from: `"Nap's Grill and Restobar" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reservation Received - Nap’s Grill and Restobar',
    html: `
      <div style="
        max-width: 600px;
        margin: auto;
        padding: 30px;
        border-radius: 10px;
        font-family: 'Segoe UI', sans-serif;
        background-color: #ffffff;
        color: #333;
        box-shadow: 0 0 10px rgba(0,0,0,0.05);
      ">
        <div style="text-align: center; padding-bottom: 20px;">
          <h2 style="margin: 0; color: #0047FF;">Reservation Received</h2>
          <p style="margin: 5px 0; font-weight: 500;">Thank you for choosing Nap's Grill & Restobar</p>
        </div>

        <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px;">We’ve received your table reservation for <strong>${tableName}</strong>.</p>
        <p style="font-size: 16px;">Your reservation is currently marked as <strong>pending</strong> while we verify your GCash payment.</p>

        <p style="font-size: 15px;">You’ll receive another email once your reservation is confirmed. Please keep your reference number and proof of payment ready if we need to follow up.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 14px;">Cheers,<br>The Nap’s Team</p>
      </div>
    `
  });
};

exports.sendReservationConfirmedEmail = async ({ to, name, tableName, dineInDateTime }) => {
  if (!to || typeof to !== 'string') {
    console.error("Invalid 'to' email provided to sendReservationConfirmedEmail:", to);
    return;
  }

  await transporter.sendMail({
    from: `"Nap's Grill and Restobar" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reservation Confirmed - Nap’s Grill and Restobar',
    html: `
      <div style="
        max-width: 600px;
        margin: auto;
        padding: 30px;
        border-radius: 10px;
        font-family: 'Segoe UI', sans-serif;
        background-color: #ffffff;
        color: #333;
        box-shadow: 0 0 10px rgba(0,0,0,0.05);
      ">
        <div style="text-align: center; padding-bottom: 20px;">
          <h2 style="margin: 0; color: #0047FF;">Reservation Confirmed</h2>
          <p style="margin: 5px 0; font-weight: 500;">We're excited to welcome you!</p>
        </div>

        <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px;">Your reservation for <strong>${tableName}</strong> has been <strong>confirmed</strong>.</p>
        <p style="font-size: 16px;"><strong>Date & Time:</strong> ${dineInDateTime}</p>

        <p style="font-size: 15px;">If you have any questions or changes, feel free to reply to this email or contact us directly.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 14px;">See you soon!<br>The Nap’s Team</p>
      </div>
    `
  });
};

exports.sendRejectionEmail = async ({ to, name, tableName }) => {
  if (!to || typeof to !== 'string') return;

  await transporter.sendMail({
    from: `"Nap's Grill and Restobar" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reservation Rejected - Nap’s Grill and Restobar',
    html: `
      <div style="max-width: 600px; margin: auto; padding: 30px; font-family: 'Segoe UI', sans-serif; background: #fff; border-radius: 10px;">
        <div style="text-align: center; color: #ff3e3e;">
          <h2>Reservation Rejected</h2>
        </div>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We regret to inform you that your reservation for table <strong>${tableName}</strong> has been <strong>rejected</strong>.</p>
        <p>Please verify your GCash proof or contact us for clarification.</p>
        <p>Thank you for considering Nap's Grill. We hope to serve you another time.</p>
        <hr>
        <p style="font-size: 14px;">- Nap’s Grill & Restobar Team</p>
      </div>
    `
  });
};

exports.sendOrderConfirmationEmail = async ({ to, name, orderId }) => {
  const mailOptions = {
    from: `"Nap's Grill & Restobar" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your Order Has Been Placed — Payment Under Review',
    html: `
      <div style="max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;font-family:'Poppins',sans-serif;">
        <div style="background:linear-gradient(90deg,#03C4E7,#0047FF);color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h2>Order Confirmation</h2>
        </div>
        <div style="padding:20px;background:white;border-radius:0 0 8px 8px;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We have received your order <strong>#${orderId}</strong>.</p>
          <p>We will review your payment proof. This usually takes up to a minute. Please check back later to see your order status.</p>

          <p style="margin-top:20px;">Thank you for ordering with Nap's Grill & Restobar!</p>
          <p style="color:#888;font-size:12px;">This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.sendOrderProcessedEmail = async ({ to, name, orderId }) => {
  await transporter.sendMail({
    from: `"Nap's Grill & Restobar" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `Your Order #${orderId} is Now Being Processed`,
    html: `
      <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;font-family:Arial,sans-serif;background:#fff;">
        <h2 style="text-align:center;color:#d32f2f;">Nap's Grill & Restobar</h2>
        <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:15px;">We're excited to let you know that your order <strong>#${orderId}</strong> is now being <span style="color:#1976d2;font-weight:bold;">processed</span>!</p>
        <p style="font-size:15px;">Our kitchen team is working on your order, and we’ll notify you once it's ready for pickup.</p>
        <hr style="margin:20px 0;">
        <p style="font-size:14px;">Thank you for choosing <strong>Nap's Grill & Restobar</strong>! 🍔</p>
        <p style="font-size:13px;color:#888;">If you have any questions, feel free to contact us.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="https://qwerty-1-8irw.onrender.com/" style="background:#d32f2f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:5px;font-weight:bold;">Visit Us Again</a>
        </div>
      </div>
    `
  });
};

exports.sendOrderRejectedEmail = async ({ to, name, orderId }) => {
  await transporter.sendMail({
    from: `"Nap's Grill & Restobar" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `Order #${orderId} Rejected`,
    html: `
      <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;font-family:Arial,sans-serif;background:#fff;">
        <h2 style="text-align:center;color:#d32f2f;">Order Rejected</h2>
        <p style="font-size:16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size:15px;">We're sorry to inform you that your order <strong>#${orderId}</strong> has been <span style="color:#d32f2f;font-weight:bold;">rejected</span>.</p>
        <p style="font-size:15px;"><strong>Reason:</strong> The proof of payment and reference number is invalid and does not match our records.</p>
        <p style="font-size:15px;">You may try again with correct details or contact us for support.</p>
        <hr style="margin:20px 0;">
        <p style="font-size:14px;">Thank you for understanding. — <strong>Nap's Grill & Restobar</strong></p>
        <div style="text-align:center;margin-top:30px;">
          <a href="https://qwerty-1-8irw.onrender.com/" style="background:#d32f2f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:5px;font-weight:bold;">Contact Support</a>
        </div>
      </div>
    `
  });
};

exports.sendOrderCompletedEmail = async ({ to, name, orderId }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Nap's Grill and Restobar" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: 'Your Order is Ready for Pickup!',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #fefefe; padding: 30px; color: #333; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px; margin: auto;">
        <div style="text-align: center;">
          <h2 style="color: #d35400;">Nap's Grill and Restobar</h2>
        </div>

        <h3 style="color: #333;">Hi ${name},</h3>
        <p>Your order <strong>#${orderId}</strong> has been successfully <span style="color: green; font-weight: bold;">COMPLETED</span>!</p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 5px solid #27ae60; margin: 20px 0;">
          <p style="margin: 0;">You may now pick it up at our store.</p>
        </div>

        <p>Thank you for choosing Nap's Grill and Restobar! We hope you enjoyed our food and service.</p>

        <hr style="margin: 30px 0; border-top: 1px dashed #ccc;">

        <p style="font-size: 14px; color: #888; text-align: center;">
          🍽️ Need help? Contact us at <a href="mailto:support@napsgrill.com">support@napsgrill.com</a><br>
          &copy; ${new Date().getFullYear()} Nap's Grill and Restobar. All rights reserved.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.sendUserBlockedEmail = async ({ to, name }) => {
  await transporter.sendMail({
    from: `"Nap's Grill & Restobar" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Account Blocked - Nap’s Grill & Restobar',
    html: `
      <div style="background:#f4f4f4;padding:30px 0;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- HEADER -->
          <div style="background:#d32f2f;padding:20px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Nap's Grill & Restobar</h1>
          </div>
          
          <!-- BODY -->
          <div style="padding:30px;text-align:center;">
            <img src="https://img.icons8.com/ios-filled/100/d32f2f/cancel.png" alt="Blocked Icon" style="width:80px;height:80px;margin-bottom:15px;" />
            <h2 style="color:#d32f2f;margin-bottom:20px;">Account Blocked</h2>
            
            <p style="font-size:15px;color:#333;">Hi <strong>${name}</strong>,</p>
            <p style="font-size:15px;color:#555;line-height:1.6;">
              We regret to inform you that your account has been <strong>blocked</strong> by the administrator.
              You will not be able to log in until your account is unblocked.
            </p>
            <p style="font-size:15px;color:#555;">If you believe this is a mistake, please contact our support team.</p>
          </div>
          
          <!-- FOOTER -->
          <div style="background:#fafafa;padding:20px;text-align:center;border-top:1px solid #eee;">
            <p style="font-size:13px;color:#777;margin:0;">© ${new Date().getFullYear()} Nap's Grill & Restobar. All rights reserved.</p>
          </div>
        </div>
      </div>
    `
  });
};

exports.sendUserUnblockedEmail = async ({ to, name }) => {
  await transporter.sendMail({
    from: `"Nap's Grill & Restobar" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Account Unblocked - Nap’s Grill & Restobar',
    html: `
      <div style="background:#f4f4f4;padding:30px 0;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- HEADER -->
          <div style="background:#4caf50;padding:20px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Nap's Grill & Restobar</h1>
          </div>
          
          <!-- BODY -->
          <div style="padding:30px;text-align:center;">
            <img src="https://img.icons8.com/ios-filled/100/4caf50/ok.png" alt="Unblocked Icon" style="width:80px;height:80px;margin-bottom:15px;" />
            <h2 style="color:#4caf50;margin-bottom:20px;">Account Unblocked</h2>
            
            <p style="font-size:15px;color:#333;">Hi <strong>${name}</strong>,</p>
            <p style="font-size:15px;color:#555;line-height:1.6;">
              Good news! Your account has been <strong>unblocked</strong> and you can now log in again.
            </p>
            <p style="font-size:15px;color:#555;">If you have any questions, feel free to reach out to us anytime.</p>
          </div>
          
          <!-- FOOTER -->
          <div style="background:#fafafa;padding:20px;text-align:center;border-top:1px solid #eee;">
            <p style="font-size:13px;color:#777;margin:0;">© ${new Date().getFullYear()} Nap's Grill & Restobar. All rights reserved.</p>
          </div>
        </div>
      </div>
    `
  });
};

exports.sendReadyToPickupEmail = async ({ to, name, orderId }) => {
  try {
    await transporter.sendMail({
      from: `"DineHub" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your Order #${orderId} is Ready for Pickup`,
      html: `
        <p>Hi ${name},</p>
        <p>Your order <strong>#${orderId}</strong> is now ready for pickup.</p>
        <p>Please come to our counter at your earliest convenience.</p>
        <p>Thank you for ordering with us!</p>
      `
    });
    console.log(`Ready-to-pickup email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send ready-to-pickup email:`, error);
  }
};

exports.sendVoucherEmail = async ({ to, name, voucher }) => {
  try {
    await transporter.sendMail({
      from: `"Nap's Grill & Restobar" <${process.env.GMAIL_USER}>`,
      to,
      subject: `New Voucher Just for You: ${voucher.code}`,
      html: `
        <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;font-family:Arial,sans-serif;background:#fff;">
          <h2 style="text-align:center;color:#d32f2f;">Nap's Grill & Restobar</h2>
          <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
          <p style="font-size:15px;">We’re excited to share an exclusive voucher with you!</p>
          <div style="background:#f9f9f9;padding:15px;border-radius:6px;margin:20px 0;">
            <p style="font-size:15px;margin:5px 0;"><b>Voucher Code:</b> <span style="color:#1976d2;">${voucher.code}</span></p>
            <p style="font-size:15px;margin:5px 0;"><b>Discount:</b> ₱${voucher.discount} Off</p>
            <p style="font-size:15px;margin:5px 0;"><b>Minimum Spend:</b> ₱${voucher.minSpend}</p>
            <p style="font-size:15px;margin:5px 0;"><b>Valid Until:</b> ${new Date(voucher.expiryDate).toLocaleDateString()}</p>
          </div>
          <p style="font-size:15px;">Use this voucher on your next order with <strong>Dinehub</strong> and enjoy your savings at <strong>Nap's Grill & Restobar</strong>!</p>
          <hr style="margin:20px 0;">
          <p style="font-size:14px;">Thank you for being one of our valued customers. We look forward to serving you again soon! 🍽️</p>
          <p style="font-size:13px;color:#888;">If you have any questions, feel free to contact us.</p>
          <div style="text-align:center;margin-top:30px;">
            <a href="https://qwerty-1-8irw.onrender.com/" style="background:#d32f2f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:5px;font-weight:bold;">Order Now</a>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send voucher email:', error);
  }
};

exports.sendSupportEmail = async ({ to, name, staffEmail, imageUrl }) => {
  try {
    await transporter.sendMail({
      from: `"Nap's Grill & Restobar" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Staff ${staffEmail} sent you a message from Nap's Grill & Restobar`,
      html: `
        <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;font-family:Arial,sans-serif;background:#fff;">
          <h2 style="text-align:center;color:#d32f2f;">Nap's Grill & Restobar</h2>
          <p style="font-size:16px;">Hi <strong>${name || "Customer"}</strong>,</p>
          <p style="font-size:15px;">
            <strong>${staffEmail}</strong> from our support team has sent you a new message.
          </p>

          <div style="background:#f9f9f9;padding:15px;border-radius:6px;margin:20px 0;text-align:center;color:#888;">
            <p style="font-size:15px;margin:0;">To protect your privacy, message content is hidden.</p>
            <p style="font-size:15px;margin:0;">Please log in to view it securely.</p>
          </div>

          ${
            imageUrl
              ? `<div style="margin-top:10px;text-align:center;">
                  <a href="${imageUrl}" target="_blank" style="text-decoration:none;">
                    <img src="${imageUrl}" alt="Support Image" style="max-width:100%;border-radius:6px;display:block;margin:0 auto;">
                  </a>
                </div>`
              : ""
          }

          <p style="font-size:15px;">Please log in to your Dinehub account to read and reply to this message.</p>
          <hr style="margin:20px 0;">
          <p style="font-size:14px;">Thank you for contacting <strong>Nap's Grill & Restobar</strong>! We’re always happy to assist you.</p>
          <p style="font-size:13px;color:#888;">This is an automated notification — please reply through your Dinehub account.</p>
          <div style="text-align:center;margin-top:30px;">
            <a href="https://qwerty-1-8irw.onrender.com/" style="background:#d32f2f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:5px;font-weight:bold;">View Message</a>
          </div>
        </div>
      `,
    });

    console.log(`[Email Sent] Support message sent to ${to}`);
  } catch (err) {
    console.error("[EmailService Error - Support Email]:", err);
  }
};