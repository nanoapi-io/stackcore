import { Heading, Section, Text } from "@react-email/components";
import { baseTemplate } from "./base.tsx";
import { headingStyle } from "./styles.tsx";
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
      <Section>
        <Heading as="h2" style={headingStyle}>
          Congratulations on your upgrade! 🎉
        </Heading>
        <Text>
          Your subscription for workspace {props.workspaceName}{" "}
          has been successfully upgraded!
        </Text>
      </Section>
      <Section>
        <Text
          style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold" }}
        >
          ❌ Previous subscription: {props.oldSubscription.product}{" "}
          ({props.oldSubscription.billingCycle ?? "Custom billing cycle"})
        </Text>
        <Text
          style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold" }}
        >
          ✅ New subscription: {props.newSubscription.product}{" "}
          ({props.newSubscription.billingCycle ?? "Custom billing cycle"})
        </Text>
      </Section>
      <Section>
        <Text>
          This change is effective immediately, and you now have access to all
          the features included in your new subscription.
        </Text>
        <Text>
          If you have any questions about your upgraded subscription, please
          don't hesitate to contact our support team.
        </Text>
        <Text>Best regards - Team Nano</Text>
      </Section>
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
