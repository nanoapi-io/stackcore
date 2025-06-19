import { baseTemplate } from "./base.tsx";
import { sharedStyles } from "./sharedStyles.ts";

const OtpEmail = ({ otp }: {
  otp: string;
}) => {
  const previewText = `Your one-time password (OTP) code is ${otp}`;

  return baseTemplate(
    previewText,
    <>
      {/* Header */}
      <div style={{ ...sharedStyles.centerText, ...sharedStyles.section }}>
        <div style={{ ...sharedStyles.iconCircle, backgroundColor: "#4f46e5" }}>
          🔐
        </div>
        <h1 style={sharedStyles.heading}>One-Time Password</h1>
        <p style={sharedStyles.body}>
          Use the code below to complete your authentication
        </p>
      </div>

      {/* OTP Code */}
      <div
        style={{
          ...sharedStyles.card,
          ...sharedStyles.centerText,
          ...sharedStyles.contentSpacing,
        }}
      >
        <div
          style={{
            ...sharedStyles.small,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Your One-Time Password
        </div>
        <div
          style={{
            fontSize: "36px",
            fontWeight: "700",
            color: "#111827",
            letterSpacing: "4px",
            fontFamily: "'Courier New', monospace",
            backgroundColor: "#ffffff",
            borderRadius: "6px",
            padding: "16px",
            border: "1px solid #e5e7eb",
            margin: "16px 0",
          }}
        >
          {otp}
        </div>
      </div>

      {/* Security Notice */}
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
          Security Notice
        </h3>
        <p style={{ ...sharedStyles.small, color: "#92400e", margin: 0 }}>
          This code is valid for a limited time and can only be used once. For
          your security, please do not share this code with anyone.
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
          Didn't request this code? Please ignore this email or contact our{" "}
          <a href="mailto:support@nanoapi.io" style={sharedStyles.link}>
            support team
          </a>{" "}
          if you have concerns about your account security.
        </p>
      </div>

      {/* Footer */}
      <div style={{ ...sharedStyles.divider, ...sharedStyles.centerText }}>
        <p style={sharedStyles.small}>
          Stay secure,<br />
          The NanoAPI Team
        </p>
      </div>
    </>,
  );
};

OtpEmail.PreviewProps = {
  otp: "123456",
};

export default OtpEmail;
