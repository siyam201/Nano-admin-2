import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, code: string, appName?: string): Promise<boolean> {
  try {
    const fromName = appName || "Nano Admin";
    const subjectLine = appName 
      ? `Verify your email - ${appName}` 
      : "Verify your email - Nano Admin";
    const footerText = appName 
      ? `${appName} - Powered by Nano Admin` 
      : "Nano Admin - Lightweight Admin Panel";

    await transporter.sendMail({
      from: `"${fromName}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: subjectLine,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 20px;">Verify your email</h2>
          ${appName ? `<p style="color: #666; margin-bottom: 10px;">Welcome to <strong>${appName}</strong>!</p>` : ''}
          <p style="color: #666; margin-bottom: 20px;">
            Enter this verification code to complete your registration:
          </p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code expires in 10 minutes. If you didn't request this, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            ${footerText}
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

export async function sendApprovalEmail(email: string, name: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Nano Admin" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your account has been approved - Nano Admin",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 20px;">Welcome to Nano Admin!</h2>
          <p style="color: #666; margin-bottom: 20px;">
            Hi ${name},
          </p>
          <p style="color: #666; margin-bottom: 20px;">
            Great news! Your account has been approved by an administrator. You can now log in and start using the admin panel.
          </p>
          <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Go to Login
          </a>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Nano Admin - Lightweight Admin Panel
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send approval email:", error);
    return false;
  }
}
