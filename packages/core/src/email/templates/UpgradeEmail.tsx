import { baseTemplate } from "./base.tsx";
import type { StripeBillingCycle, StripeProduct } from "../../stripe/index.ts";

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

  const content = (
    <table cellPadding={0} cellSpacing={0} border={0} style={{ width: "100%" }}>
      <tr>
        <td>
          <h2
            style={{
              margin: "0 0 20px 0",
              fontSize: "20px",
              fontWeight: "bold",
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Upgrade Successful!
          </h2>
          <p
            style={{
              margin: "0 0 15px 0",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Your subscription for <strong>"{props.workspaceName}"</strong>{" "}
            has been upgraded
          </p>
          <h3
            style={{
              margin: "30px 0 15px 0",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Your Plan Changes
          </h3>
          <p
            style={{
              margin: "0 0 10px 0",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            <strong>Previous Plan:</strong> {props.oldSubscription.product}{" "}
            ({props.oldSubscription.billingCycle ?? "Custom billing cycle"})
          </p>
          <p
            style={{
              margin: "0 0 20px 0",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            <strong>New Plan:</strong> {props.newSubscription.product}{" "}
            ({props.newSubscription.billingCycle ?? "Custom billing cycle"})
          </p>
          <table
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ width: "100%", margin: "30px 0" }}
          >
            <tr>
              <td align="center">
                <table cellPadding={0} cellSpacing={0} border={0}>
                  <tr>
                    <td
                      style={{
                        backgroundColor: "#0066cc",
                        padding: "12px 24px",
                      }}
                    >
                      <a
                        href="https://app.nanoapi.io"
                        style={{
                          color: "#ffffff",
                          textDecoration: "none",
                          fontSize: "16px",
                          fontFamily: "Arial, Helvetica, sans-serif",
                          fontWeight: "bold",
                          display: "block",
                        }}
                      >
                        Open App
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p
            style={{
              margin: "20px 0 0 0",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#666666",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            This change is effective immediately, and you now have access to all
            the features included in your new subscription.
          </p>
          <p
            style={{
              margin: "20px 0 0 0",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#666666",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Have questions about your upgraded subscription? Contact our{" "}
            <a
              href="mailto:support@nanoapi.io"
              style={{
                color: "#0066cc",
                textDecoration: "underline",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              support team
            </a>{" "}
            - we're here to help!
          </p>
        </td>
      </tr>
    </table>
  );

  return baseTemplate(previewText, content);
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
