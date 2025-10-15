import nodemailer from "nodemailer";

// Test with Gmail SMTP (you'll need to set up App Password)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "mdmuzammil603@gmail.com",
    pass: "your_gmail_app_password" // Replace with real App Password
  },
});

async function testEmail() {
  try {
    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    // Send test email
    const info = await transporter.sendMail({
      from: "Splitwise+ <mdmuzammil603@gmail.com>",
      to: "mdmuzammil603@gmail.com",
      subject: "Test Email from Splitwise+",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #32a852;">Test Email</h2>
          <p>This is a test email from Splitwise+ backend.</p>
          <p>If you receive this, email functionality is working!</p>
        </div>
      `,
    });

    console.log("✅ Test email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
  }
}

testEmail();
