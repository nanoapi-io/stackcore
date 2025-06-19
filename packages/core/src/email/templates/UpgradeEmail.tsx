import { baseTemplate } from "./base.tsx";
import { sharedStyles } from "./sharedStyles.ts";
import type {
  StripeBillingCycle,
  StripeProduct,
} from "../../db/models/workspace.ts";

const UpgradeEmail = (props: {
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
}) => {
  const previewText = "Confirmation of your subscription upgrade | NanoAPI";

  return baseTemplate(
    previewText,
    <>
      {/* Header */}
      <div style={{ ...sharedStyles.centerText, ...sharedStyles.section }}>
        <div style={{ ...sharedStyles.iconCircle, backgroundColor: "#10b981" }}>
          🚀
        </div>
        <h1 style={sharedStyles.heading}>Upgrade Successful! 🎉</h1>
        <p style={sharedStyles.body}>
          Your subscription for <strong>"{props.workspaceName}"</strong>{" "}
          has been upgraded
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
              Previous Plan
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: "700", color: "#991b1b" }}
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
              style={{ fontSize: "20px", fontWeight: "700", color: "#166534" }}
            >
              {props.newSubscription.product}
            </div>
            <div style={sharedStyles.small}>
              {props.newSubscription.billingCycle ?? "Custom billing cycle"}
            </div>
          </div>
        </div>
      </div>

      {/* Immediate Access Notice */}
      <div style={{ ...sharedStyles.infoBox, ...sharedStyles.contentSpacing }}>
        <h3
          style={{
            ...sharedStyles.subheading,
            fontSize: "16px",
            margin: "0 0 8px 0",
            color: "#1e40af",
          }}
        >
          Immediate Access
        </h3>
        <p style={{ ...sharedStyles.small, color: "#1e40af", margin: 0 }}>
          This change is effective immediately, and you now have access to all
          the features included in your new subscription.
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
          Have questions about your upgraded subscription? Contact our{" "}
          <a href="mailto:support@nanoapi.io" style={sharedStyles.link}>
            support team
          </a>{" "}
          - we're here to help!
        </p>
      </div>

      {/* Footer */}
      <div style={{ ...sharedStyles.divider, ...sharedStyles.centerText }}>
        <p style={{ ...sharedStyles.body, margin: "0 0 8px 0" }}>
          Thank you for choosing NanoAPI! 🎉
        </p>
        <p style={sharedStyles.small}>
          Best regards,<br />
          The NanoAPI Team
        </p>
      </div>
    </>,
  );
};

UpgradeEmail.PreviewProps = {
  emails: ["test@nanoapi.io"],
  workspaceName: "My Workspace",
  oldSubscription: {
    product: "Basic Plan",
    billingCycle: "Monthly",
  },
  newSubscription: {
    product: "Pro Plan",
    billingCycle: "Yearly",
  },
};

export default UpgradeEmail;
