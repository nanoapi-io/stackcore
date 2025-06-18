import type { ReactNode } from "react";
import type {
  StripeBillingCycle,
  StripeProduct,
} from "../db/models/workspace.ts";
import { Resend } from "resend";
import { render } from "@react-email/render";
import settings from "../settings.ts";

import OtpEmail from "./templates/OtpEmail.tsx";
import WelcomeEmail from "./templates/WelcomeEmail.tsx";
import InvitationEmail from "./templates/InvitationEmail.tsx";
import UpgradeEmail from "./templates/UpgradeEmail.tsx";
import DowngradeEmail from "./templates/DowngradeEmail.tsx";

export type SendEmail = (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  react?: ReactNode;
}) => Promise<void>;

const resend = new Resend(settings.EMAIL.RESEND_API_KEY);

const sendEmailWithResend: SendEmail = async (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  react?: ReactNode;
}) => {
  const response = await resend.emails.send({
    from: `${settings.EMAIL.FROM_EMAIL} <${settings.EMAIL.FROM_EMAIL}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.text,
    react: options.react,
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
  react?: ReactNode;
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

export async function sendOtpEmail(email: string, otp: string) {
  const emailPlainText = await render(OtpEmail({ otp }), {
    plainText: true,
  });

  const sendEmail = getSendEmail();
  sendEmail({
    to: [email],
    subject: "Your One-Time Password (OTP)",
    text: emailPlainText,
    react: OtpEmail({ otp }),
  });
}

export async function sendWelcomeEmail(email: string) {
  const emailPlainText = await render(WelcomeEmail(), {
    plainText: true,
  });

  const sendEmail = getSendEmail();
  sendEmail({
    to: [email],
    subject: "Welcome to our platform!",
    text: emailPlainText,
    react: WelcomeEmail(),
  });
}

export async function sendInvitationEmail(
  email: string,
  workspaceName: string,
  invitationUuid: string,
  returnUrl: string,
) {
  const sendEmail = getSendEmail();

  const searchParams = new URLSearchParams();
  searchParams.set("invitationUuid", invitationUuid);

  const invitationLink = `${returnUrl}?${searchParams.toString()}`;

  const emailPlainText = await render(
    InvitationEmail({
      workspaceName,
      invitationLink,
    }),
    {
      plainText: true,
    },
  );

  sendEmail({
    to: [email],
    subject: `Invitation to join ${workspaceName}`,
    text: emailPlainText,
    react: InvitationEmail({
      workspaceName,
      invitationLink,
    }),
  });
}

export async function sendSubscriptionUpgradedEmail(
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
  const emailPlainText = await render(
    UpgradeEmail(payload),
    {
      plainText: true,
    },
  );

  const sendEmail = getSendEmail();
  sendEmail({
    to: [payload.email],
    subject: "Subscription upgraded",
    text: emailPlainText,
    react: UpgradeEmail(payload),
  });
}

export async function sendSubscriptionDowngradedEmail(
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
  const emailPlainText = await render(
    DowngradeEmail(payload),
    {
      plainText: true,
    },
  );

  const sendEmail = getSendEmail();
  sendEmail({
    to: [payload.email],
    subject: "Subscription downgraded",
    text: emailPlainText,
    react: DowngradeEmail(payload),
  });
}
