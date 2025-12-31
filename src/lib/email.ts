import { privateEnv } from "~/config/privateEnv";

// Email service interface
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Try to import Resend dynamically
let Resend: any = null;
try {
  // Dynamic import for optional dependency
  Resend = require("resend").Resend;
} catch {
  // Resend not installed - will use mock
}

// Send email using Resend or log if not configured
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text } = options;

  // Check if Resend is available and API key is configured
  if (!Resend || !privateEnv.RESEND_API_KEY) {
    // Log the email for development/testing
    console.log("=".repeat(60));
    console.log("[EMAIL SERVICE] Email not sent (Resend not configured)");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("HTML Preview:", html.substring(0, 200) + "...");
    console.log("=".repeat(60));

    return {
      success: true,
      id: `mock-${Date.now()}`,
    };
  }

  try {
    const resend = new Resend(privateEnv.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: privateEnv.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[EMAIL SERVICE] Failed to send email:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log("[EMAIL SERVICE] Email sent successfully:", data?.id);
    return {
      success: true,
      id: data?.id,
    };
  } catch (error) {
    console.error("[EMAIL SERVICE] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Email template for tree invitation
interface InvitationEmailData {
  inviterName: string;
  treeName: string;
  role: string;
  invitationLink: string;
  expiresAt: Date;
}

export function generateInvitationEmailHtml(data: InvitationEmailData): string {
  const { inviterName, treeName, role, invitationLink, expiresAt } = data;

  const roleDescription = {
    viewer: "view the family tree",
    editor: "view and edit the family tree",
    admin: "view, edit, and manage collaborators on the family tree",
  }[role] || "access the family tree";

  const expirationDate = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Tree Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                You're Invited!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Join a family tree on Family Node
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi there!
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to collaborate on the family tree "<strong>${treeName}</strong>".
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 14px; line-height: 1.6;">
                As a <strong>${role}</strong>, you'll be able to ${roleDescription}.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 20px 0 0; color: #999999; font-size: 12px; text-align: center; word-break: break-all;">
                Or copy this link: <a href="${invitationLink}" style="color: #667eea;">${invitationLink}</a>
              </p>

              <!-- Expiration notice -->
              <div style="margin-top: 30px; padding: 16px; background-color: #fff8e6; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Note:</strong> This invitation expires on ${expirationDate}.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                Family Node - Connect with your family history
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateInvitationEmailText(data: InvitationEmailData): string {
  const { inviterName, treeName, role, invitationLink, expiresAt } = data;

  const roleDescription = {
    viewer: "view the family tree",
    editor: "view and edit the family tree",
    admin: "view, edit, and manage collaborators on the family tree",
  }[role] || "access the family tree";

  const expirationDate = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
You're Invited to Join a Family Tree!

Hi there!

${inviterName} has invited you to collaborate on the family tree "${treeName}".

As a ${role}, you'll be able to ${roleDescription}.

Click the link below to accept the invitation:
${invitationLink}

Note: This invitation expires on ${expirationDate}.

If you weren't expecting this invitation, you can safely ignore this email.

---
Family Node - Connect with your family history
  `.trim();
}
