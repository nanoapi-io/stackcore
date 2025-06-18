/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
// deno-lint-ignore verbatim-module-syntax
import React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { baseTemplate } from "./base.tsx";
import { headingStyle } from "./styles.tsx";

const codeStyle = {
  display: "inline-block",
  padding: "16px 4.5%",
  width: "90.5%",
  backgroundColor: "#f4f4f4",
  borderRadius: "5px",
  border: "1px solid #eee",
  color: "#222",
  fontFamily: "roboto mono, monospace",
  fontSize: "28px",
  // deno-lint-ignore no-explicit-any
  textAlign: "center" as any,
  letterSpacing: "5px",
};

type OtpEmailProps = {
  otp: string;
};

const OtpEmail = ({ otp }: OtpEmailProps) => {
  const previewText = `Your one-time password (OTP) code is ${otp}`;
  return baseTemplate(
    previewText,
    <Section>
      <Heading as="h2" style={headingStyle}>
        One-Time Password (OTP) Code
      </Heading>
      <Text>Hi there,</Text>

      <Text>
        You've requested a one-time password to access your account. Please use
        the code below to complete your authentication:
      </Text>

      <code style={codeStyle}>{otp}</code>

      <Text>
        This code is valid for a limited time and can only be used once. For
        your security, please do not share this code with anyone.
      </Text>

      <Text>
        If you didn't request this code, please ignore this email or contact our
        support team if you have concerns about your account security.
      </Text>

      <Text style={{}}>Best regards - Team Nano</Text>
    </Section>,
  );
};

OtpEmail.PreviewProps = {
  otp: "123456",
};

export default OtpEmail;
