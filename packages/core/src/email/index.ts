import type { StripeBillingCycle, StripeProduct } from "../stripe/index.ts";
import { Resend } from "resend";
import settings from "@stackcore/settings";

import OtpEmail from "./templates/OtpEmail.tsx";
import WelcomeEmail from "./templates/WelcomeEmail.tsx";
import InvitationEmail from "./templates/InvitationEmail.tsx";
import UpgradeEmail from "./templates/UpgradeEmail.tsx";
import DowngradeEmail from "./templates/DowngradeEmail.tsx";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { convert } from "html-to-text";

async function getPlainText(react: ReactNode) {
  const emailText = await renderToString(react);
  const plainText = convert(emailText, {
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "[data-skip-in-text=true]", format: "skip" },
      {
        selector: "a",
        options: { linkBrackets: false },
      },
    ],
  });
  return plainText;
}

export type SendEmail = (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  react: ReactNode;
}) => Promise<void>;

const resend = new Resend(settings.EMAIL.RESEND_API_KEY);

const sendEmailWithResend: SendEmail = async (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  react: ReactNode;
}) => {
  const emailPlainText = await getPlainText(options.react);

  const response = await resend.emails.send({
    from: `${settings.EMAIL.FROM_EMAIL} <${settings.EMAIL.FROM_EMAIL}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: emailPlainText,
    react: options.react,
  });

  if (response.error) {
    throw new Error(`Failed to send email: ${response.error.message}`);
  }
};

const sendEmailWithConsole: SendEmail = async (options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  react: ReactNode;
}) => {
  const emailPlainText = await getPlainText(options.react);

  console.info(`Sending email to ${options.to}: ${options.subject}`);
  console.info(emailPlainText);
};

function getSendEmail() {
  if (settings.EMAIL.USE_CONSOLE) {
    return sendEmailWithConsole;
  }
  return sendEmailWithResend;
}

export async function sendOtpEmail(email: string, otp: string) {
  const sendEmail = getSendEmail();
  await sendEmail({
    to: [email],
    subject: "Your One-Time Password (OTP)",
    react: OtpEmail({ otp }),
  });
}

export async function sendWelcomeEmail(email: string) {
  const sendEmail = getSendEmail();
  await sendEmail({
    to: [email],
    subject: "Welcome to our platform!",
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

  await sendEmail({
    to: [email],
    subject: `Invitation to join ${workspaceName}`,
    react: InvitationEmail({
      workspaceName,
      invitationLink,
    }),
  });
}

export async function sendSubscriptionUpgradedEmail(
  payload: {
    emails: string[];
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
  await sendEmail({
    to: payload.emails,
    subject: "Subscription upgraded",
    react: UpgradeEmail(payload),
  });
}

export async function sendSubscriptionDowngradedEmail(
  payload: {
    emails: string[];
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
  await sendEmail({
    to: payload.emails,
    subject: "Subscription downgraded",
    react: DowngradeEmail(payload),
  });
}
