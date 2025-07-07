import { baseTemplate } from "./base.tsx";
import type { stripeTypes } from "@stackcore/shared";

const DowngradeEmail = (props: {
  emails: string[];
  workspaceName: string;
  oldSubscription: {
    product: stripeTypes.StripeProduct;
    billingCycle: stripeTypes.StripeBillingCycle | null;
  };
  newSubscription: {
    product: stripeTypes.StripeProduct;
    billingCycle: stripeTypes.StripeBillingCycle | null;
  };
  newSubscriptionDate: string;
}) => {
  const previewText = "Confirmation of your subscription downgrade | NanoAPI";

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
            Subscription Change Confirmed
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
            has been updated
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
            <strong>Current Plan:</strong> {props.oldSubscription.product}{" "}
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
            Your current subscription will remain active until the end of your
            billing period. The new subscription will take effect on{" "}
            <strong>{props.newSubscriptionDate}</strong>.
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
            Have questions about your subscription change? Our{" "}
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
            is here to help you.
          </p>
        </td>
      </tr>
    </table>
  );

  return baseTemplate(previewText, content);
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
