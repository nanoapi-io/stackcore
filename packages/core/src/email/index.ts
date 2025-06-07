import type {
  StripeBillingCycle,
  StripeProduct,
} from "../db/models/workspace.ts";
import { Resend } from "resend";
import settings from "../settings.ts";

export type SendEmail = (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
}) => Promise<void>;

const resend = new Resend(settings.EMAIL.RESEND_API_KEY);

const sendEmailWithResend: SendEmail = async (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
}) => {
  const response = await resend.emails.send({
    from: `${settings.EMAIL.FROM_EMAIL} <${settings.EMAIL.FROM_EMAIL}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  if (response.error) {
    throw new Error(`Failed to send email: ${response.error.message}`);
  }
};

// deno-lint-ignore require-await
const sendEmailWithConsole: SendEmail = async (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
}) => {
  console.info(`Sending email to ${options.to}: ${options.subject}`);
  console.info(options.text);
};

function getSendEmail() {
  if (settings.EMAIL.USE_CONSOLE) {
    return sendEmailWithConsole;
  }

  return sendEmailWithResend;
}

export function sendOtpEmail(email: string, otp: string) {
  const sendEmail = getSendEmail();
  sendEmail({
    to: [email],
    subject: "Your One-Time Password (OTP)",
    text: `Hi there,

You've requested a one-time password to access your account. Please use the code below to complete your authentication:

**${otp}**

This code is valid for a limited time and can only be used once. For your security, please do not share this code with anyone.

If you didn't request this code, please ignore this email or contact our support team if you have concerns about your account security.

Best regards,
The Team`,
  });
}

export function sendWelcomeEmail(email: string) {
  const sendEmail = getSendEmail();
  sendEmail({
    to: [email],
    subject: "Welcome to our platform!",
    text: `Hi there,

Welcome to our platform! We're thrilled to have you join our community.

Your account has been successfully created and you're all set to get started. Here's what you can do next:

• Explore the dashboard and familiarize yourself with the interface
• Set up your profile and preferences
• Create your first workspace or join an existing one
• Invite team members to collaborate with you

If you have any questions or need assistance getting started, our support team is here to help. Don't hesitate to reach out!

We're excited to see what you'll accomplish with our platform.

Best regards,
The Team`,
  });
}

export function sendInvitationEmail(
  email: string,
  workspaceName: string,
  invitationUuid: string,
  returnUrl: string,
) {
  const sendEmail = getSendEmail();

  const searchParams = new URLSearchParams();
  searchParams.set("invitationUuid", invitationUuid);

  const invitationLink = `${returnUrl}?${searchParams.toString()}`;

  sendEmail({
    to: [email],
    subject: `Invitation to join ${workspaceName}`,
    text: `Hi there,

You've been invited to join "${workspaceName}"!

We're excited to have you as part of our team. To get started, simply click the link below to accept your invitation and set up your account:

${invitationLink}

This invitation link is unique to you and will expire after a certain period for security reasons. If you have any questions or need assistance, please don't hesitate to reach out to your team administrator.

We look forward to collaborating with you!

Best regards,
The Team`,
  });
}

export function sendSubscriptionUpgradedEmail(
  payload: {
    email: string;
    workspaceName: string;
    oldSubscription: {
      product: StripeProduct;
      billingCycle: StripeBillingCycle | null;
    };
    newSubscription: {
      product: StripeProduct;
      billingCycle: StripeBillingCycle | null;
    };
  },
) {
  const sendEmail = getSendEmail();
  sendEmail({
    to: [payload.email],
    subject: "Subscription upgraded",
    text: `Hi there,

Your subscription for workspace "${payload.workspaceName}" has been successfully upgraded!

Previous subscription: ${payload.oldSubscription.product} (${
      payload.oldSubscription.billingCycle ?? "Custom billing cycle"
    })
New subscription: ${payload.newSubscription.product} (${
      payload.newSubscription.billingCycle ?? "Custom billing cycle"
    })

This change is effective immediately, and you now have access to all the features included in your new subscription.

If you have any questions about your upgraded subscription, please don't hesitate to contact our support team.

Best regards,
The Team`,
  });
}

export function sendSubscriptionDowngradedEmail(
  payload: {
    email: string;
    workspaceName: string;
    oldSubscription: {
      product: StripeProduct;
      billingCycle: StripeBillingCycle | null;
    };
    newSubscription: {
      product: StripeProduct;
      billingCycle: StripeBillingCycle | null;
    };
    newSubscriptionDate: string;
  },
) {
  const sendEmail = getSendEmail();
  sendEmail({
    to: [payload.email],
    subject: "Subscription downgraded",
    text: `Hi there,

Your subscription for workspace "${payload.workspaceName}" has been scheduled for downgrade.

Current subscription: ${payload.oldSubscription.product} (${
      payload.oldSubscription.billingCycle ?? "Custom billing cycle"
    })
New subscription: ${payload.newSubscription.product} (${
      payload.newSubscription.billingCycle ?? "Custom billing cycle"
    })
Effective date: ${payload.newSubscriptionDate}

Your current subscription will remain active until the end of your billing period, and the new subscription will take effect on ${payload.newSubscriptionDate}.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Team`,
  });
}
