import { baseTemplate } from "./base.tsx";

const InvitationEmail = (props: {
  workspaceName: string;
  invitationLink: string;
}) => {
  const previewText = `Invitation to join "${props.workspaceName}" on NanoAPI`;

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
            You're Invited!
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
            Join <strong>"{props.workspaceName}"</strong> on NanoAPI
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
            We're excited to have you as part of our team! To get started,
            simply click the button below to accept your invitation and set up
            your account.
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
                        href={props.invitationLink}
                        style={{
                          color: "#ffffff",
                          textDecoration: "none",
                          fontSize: "16px",
                          fontFamily: "Arial, Helvetica, sans-serif",
                          fontWeight: "bold",
                          display: "block",
                        }}
                      >
                        Accept Invitation
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <h3
            style={{
              margin: "30px 0 15px 0",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            What you'll get access to:
          </h3>
          <table
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ width: "100%" }}
          >
            <tr>
              <td
                style={{
                  padding: "0 0 10px 0",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#333333",
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                • Collaborate on software architecture projects
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "0 0 10px 0",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#333333",
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                • Access to shared workspaces and resources
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "0 0 10px 0",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#333333",
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                • Use powerful development tools and CLI
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "0 0 20px 0",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#333333",
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                • Team documentation and knowledge sharing
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
            This invitation link is unique to you and will expire after a period
            for security reasons. If you have any questions, please contact your
            team administrator.
          </p>
        </td>
      </tr>
    </table>
  );

  return baseTemplate(previewText, content);
};

InvitationEmail.PreviewProps = {
  workspaceName: "My Workspace",
  invitationLink: "https://nanoapi.io/invitation?token=exampleToken",
};

export default InvitationEmail;
