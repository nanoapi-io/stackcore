import { baseTemplate } from "./base.tsx";
import { sharedStyles } from "./sharedStyles.ts";
import type {
  StripeBillingCycle,
  StripeProduct,
} from "../../db/models/workspace.ts";

const DowngradeEmail = (props: {
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
}) => {
  const previewText = "Confirmation of your subscription downgrade | NanoAPI";

  return baseTemplate(
    previewText,
    <>
      {/* Header */}
      <div style={{ ...sharedStyles.centerText, ...sharedStyles.section }}>
        <div style={{ ...sharedStyles.iconCircle, backgroundColor: "#6b7280" }}>
          📋
        </div>
        <h1 style={sharedStyles.heading}>Subscription Change Confirmed</h1>
        <p style={sharedStyles.body}>
          Your subscription for <strong>"{props.workspaceName}"</strong>{" "}
          has been updated
        </p>
      </div>

      {/* Plan Comparison */}
      <div style={{ ...sharedStyles.section, ...sharedStyles.contentSpacing }}>
        <h3 style={{ ...sharedStyles.subheading, ...sharedStyles.centerText }}>
          Your Plan Changes
        </h3>

        <div style={sharedStyles.card}>
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                ...sharedStyles.small,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Current Plan
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: "700", color: "#166534" }}
            >
              {props.oldSubscription.product}
            </div>
            <div style={sharedStyles.small}>
              {props.oldSubscription.billingCycle ?? "Custom billing cycle"}
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              margin: "16px 0",
              fontSize: "20px",
              color: "#6b7280",
            }}
          >
            ⬇️
          </div>

          <div>
            <div
              style={{
                ...sharedStyles.small,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              New Plan
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: "700", color: "#991b1b" }}
            >
              {props.newSubscription.product}
            </div>
            <div style={sharedStyles.small}>
              {props.newSubscription.billingCycle ?? "Custom billing cycle"}
            </div>
          </div>
        </div>
      </div>

      {/* Effective Date */}
      <div
        style={{ ...sharedStyles.warningBox, ...sharedStyles.contentSpacing }}
      >
        <h3
          style={{
            ...sharedStyles.subheading,
            fontSize: "16px",
            margin: "0 0 8px 0",
            color: "#92400e",
          }}
        >
          Effective Date
        </h3>
        <p style={{ ...sharedStyles.small, color: "#92400e", margin: 0 }}>
          Your current subscription will remain active until the end of your
          billing period. The new subscription will take effect on{" "}
          <strong>{props.newSubscriptionDate}</strong>.
        </p>
      </div>

      {/* Support */}
      <div
        style={{
          ...sharedStyles.card,
          ...sharedStyles.centerText,
          ...sharedStyles.contentSpacing,
        }}
      >
        <p style={{ ...sharedStyles.small, margin: 0 }}>
          Have questions about your subscription change? Our{" "}
          <a href="mailto:support@nanoapi.io" style={sharedStyles.link}>
            support team
          </a>{" "}
          is here to help you.
        </p>
      </div>

      {/* Footer */}
      <div style={{ ...sharedStyles.divider, ...sharedStyles.centerText }}>
        <p style={{ ...sharedStyles.body, margin: "0 0 8px 0" }}>
          Thank you for being part of our community! 🙏
        </p>
        <p style={sharedStyles.small}>
          Best regards,<br />
          The NanoAPI Team
        </p>
      </div>
    </>,
  );
};

DowngradeEmail.PreviewProps = {
  emails: ["test@nanoapi.io"],
  workspaceName: "My Workspace",
  oldSubscription: {
    product: "Pro Plan",
    billingCycle: "Yearly",
  },
  newSubscription: {
    product: "Basic Plan",
    billingCycle: "Monthly",
  },
  newSubscriptionDate: "2023-10-01",
};

export default DowngradeEmail;
