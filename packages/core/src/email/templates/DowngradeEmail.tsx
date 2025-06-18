/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { baseTemplate } from "./base.tsx";
import { headingStyle } from "./styles.tsx";
import type {
  StripeBillingCycle,
  StripeProduct,
} from "../../db/models/workspace.ts";

type DowngradeEmailProps = {
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
};

const DowngradeEmail = (props: DowngradeEmailProps) => {
  const previewText = "Confirmation of your subscription downgrade | NanoAPI";
  return baseTemplate(
    previewText,
    <>
      <Section>
        <Heading as="h2" style={headingStyle}>
          We are sorry to see you go
        </Heading>
        <Text>
          Your subscription for workspace {props.workspaceName}{" "}
          has been scheduled for downgrade.
        </Text>
      </Section>
      <Section>
        <Text
          style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold" }}
        >
          Previous subscription: {props.oldSubscription.product}{" "}
          ({props.oldSubscription.billingCycle ?? "Custom billing cycle"})
        </Text>
        <Text
          style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold" }}
        >
          New subscription: {props.newSubscription.product}{" "}
          ({props.newSubscription.billingCycle ?? "Custom billing cycle"})
        </Text>
        <Text style={{ textAlign: "center", fontWeight: "bold" }}>
          Effective date: {props.newSubscriptionDate}
        </Text>
      </Section>
      <Section>
        <Text>
          Your current subscription will remain active until the end of your
          billing period, and the new subscription will take effect on{" "}
          {props.newSubscriptionDate}.
        </Text>
        <Text>
          If you have any questions, please don't hesitate to contact our
          support team.
        </Text>
        <Text>Best regards - Team Nano</Text>
      </Section>
    </>,
  );
};

DowngradeEmail.PreviewProps = {
  email: "test@nanoapi.io",
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
