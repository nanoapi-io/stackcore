import { baseTemplate } from "./base.tsx";
import { sharedStyles } from "./sharedStyles.ts";

const WelcomeEmail = () => {
  const previewText = "Welcome to NanoAPI - Your account has been created!";

  return baseTemplate(
    previewText,
    <>
      {/* Header */}
      <div style={{ ...sharedStyles.centerText, ...sharedStyles.section }}>
        <div style={{ ...sharedStyles.iconCircle, backgroundColor: "#4f46e5" }}>
          🎉
        </div>
        <h1 style={sharedStyles.heading}>Welcome to NanoAPI!</h1>
        <p style={sharedStyles.body}>
          Your account has been successfully created and you're ready to start
          building amazing software architecture.
        </p>
      </div>

      {/* Getting Started */}
      <div style={{ ...sharedStyles.section, ...sharedStyles.contentSpacing }}>
        <h2 style={sharedStyles.subheading}>Getting Started</h2>
        <div style={sharedStyles.card}>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li style={sharedStyles.body}>
              Read our documentation to learn the basics
            </li>
            <li style={sharedStyles.body}>
              Download the CLI for powerful local development:{" "}
              <a
                href="https://github.com/nanoapi-io/napi"
                style={sharedStyles.link}
              >
                github.com/nanoapi-io/napi
              </a>
            </li>
            <li style={sharedStyles.body}>
              Create your first workspace or join an existing one
            </li>
            <li style={sharedStyles.body}>
              Invite team members to collaborate with you
            </li>
          </ul>
        </div>
      </div>

      {/* Call to Action */}
      <div
        style={{
          ...sharedStyles.card,
          ...sharedStyles.centerText,
          ...sharedStyles.contentSpacing,
        }}
      >
        <h3 style={sharedStyles.subheading}>Ready to get started?</h3>
        <p style={sharedStyles.body}>
          Jump into the app or explore our documentation to begin your journey.
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a href="https://app.nanoapi.io" style={sharedStyles.primaryButton}>
            Open the App
          </a>
          <a
            href="https://docs.nanoapi.io/default-guide/welcome"
            style={sharedStyles.secondaryButton}
          >
            Read the Docs
          </a>
        </div>
      </div>

      {/* Support */}
      <div
        style={{
          ...sharedStyles.warningBox,
          ...sharedStyles.centerText,
          ...sharedStyles.contentSpacing,
        }}
      >
        <p style={{ ...sharedStyles.small, color: "#92400e", margin: 0 }}>
          Need help? Our support team is here for you! Contact us at{" "}
          <a
            href="mailto:support@nanoapi.io"
            style={{ ...sharedStyles.link, color: "#92400e" }}
          >
            support@nanoapi.io
          </a>
        </p>
      </div>

      {/* Footer */}
      <div style={{ ...sharedStyles.divider, ...sharedStyles.centerText }}>
        <p style={{ ...sharedStyles.body, margin: "0 0 8px 0" }}>
          We're excited to see what you'll build with NanoAPI! 🚀
        </p>
        <p style={sharedStyles.small}>
          Best regards,<br />
          The NanoAPI Team
        </p>
      </div>
    </>,
  );
};

export default WelcomeEmail;
