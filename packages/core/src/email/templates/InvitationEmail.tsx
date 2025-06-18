/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import { baseTemplate } from "./base.tsx";
import { headingStyle } from "./styles.tsx";

type InvitationEmailProps = {
  workspaceName: string;
  invitationLink: string;
};

const InvitationEmail = ({
  workspaceName,
  invitationLink,
}: InvitationEmailProps) => {
  const previewText = `Invitation to join "${workspaceName}" on NanoAPI`;
  return baseTemplate(
    previewText,
    <>
      <Section>
        <Heading as="h2" style={headingStyle}>
          You have been invited to join "{workspaceName}"
        </Heading>
        <Text>
          We're excited to have you as part of our team. To get started, simply
          click the link below to accept your invitation and set up your
          account:
        </Text>
      </Section>
      <Section
        style={{ display: "flex", justifyContent: "center", padding: 20 }}
      >
        <Button
          href={invitationLink}
          style={{
            boxSizing: "border-box",
            padding: 12,
            fontWeight: 600,
            borderRadius: 8,
            textAlign: "center",
            backgroundColor: "rgb(79,70,229)",
            color: "rgb(255,255,255)",
          }}
        >
          Accept Invitation
        </Button>
      </Section>
      <Section>
        <Text>
          This invitation link is unique to you and will expire after a period
          for security reasons. If you have any questions or need assistance,
          please don't hesitate to reach out to your team administrator.
        </Text>
        <Text>We look forward to collaborating with you!</Text>
        <Text>Best regards - Team Nano</Text>
      </Section>
    </>,
  );
};

InvitationEmail.PreviewProps = {
  workspaceName: "My Workspace",
  invitationLink: "https://nanoapi.io/invitation?token=exampleToken",
};

export default InvitationEmail;
