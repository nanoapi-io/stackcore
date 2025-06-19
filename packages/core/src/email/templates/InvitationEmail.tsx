import { baseTemplate } from "./base.tsx";
import { sharedStyles } from "./sharedStyles.ts";

const InvitationEmail = (props: {
  workspaceName: string;
  invitationLink: string;
}) => {
  const previewText = `Invitation to join "${props.workspaceName}" on NanoAPI`;

  return baseTemplate(
    previewText,
    <>
      {/* Header */}
      <div style={{ ...sharedStyles.centerText, ...sharedStyles.section }}>
        <div style={{ ...sharedStyles.iconCircle, backgroundColor: "#4f46e5" }}>
          👥
        </div>
        <h1 style={sharedStyles.heading}>You're Invited!</h1>
        <p style={sharedStyles.body}>
          Join <strong>"{props.workspaceName}"</strong> on NanoAPI
        </p>
      </div>

      {/* Invitation Details */}
      <div
        style={{
          ...sharedStyles.card,
          ...sharedStyles.centerText,
          ...sharedStyles.contentSpacing,
        }}
      >
        <p style={sharedStyles.body}>
          We're excited to have you as part of our team! To get started, simply
          click the button below to accept your invitation and set up your
          account.
        </p>
        <a href={props.invitationLink} style={sharedStyles.primaryButton}>
          Accept Invitation
        </a>
      </div>

      {/* What you'll get */}
      <div style={{ ...sharedStyles.section, ...sharedStyles.contentSpacing }}>
        <h3 style={{ ...sharedStyles.subheading, ...sharedStyles.centerText }}>
          What you'll get access to:
        </h3>
        <div style={sharedStyles.card}>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li style={sharedStyles.body}>
              Collaborate on software architecture projects
            </li>
            <li style={sharedStyles.body}>
              Access to shared workspaces and resources
            </li>
            <li style={sharedStyles.body}>
              Use powerful development tools and CLI
            </li>
            <li style={sharedStyles.body}>
              Team documentation and knowledge sharing
            </li>
          </ul>
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
          Secure Invitation
        </h3>
        <p style={{ ...sharedStyles.small, color: "#92400e", margin: 0 }}>
          This invitation link is unique to you and will expire after a period
          for security reasons. If you have any questions, please contact your
          team administrator.
        </p>
      </div>

      {/* Footer */}
      <div style={{ ...sharedStyles.divider, ...sharedStyles.centerText }}>
        <p style={{ ...sharedStyles.body, margin: "0 0 8px 0" }}>
          We look forward to collaborating with you! 🚀
        </p>
        <p style={sharedStyles.small}>
          Best regards,<br />
          The NanoAPI Team
        </p>
      </div>
    </>,
  );
};

InvitationEmail.PreviewProps = {
  workspaceName: "My Workspace",
  invitationLink: "https://nanoapi.io/invitation?token=exampleToken",
};

export default InvitationEmail;
