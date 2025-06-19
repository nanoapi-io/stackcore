import { baseTemplate } from "./base.tsx";

const WelcomeEmail = () => {
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
            Welcome to NanoAPI!
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
            Your account has been successfully created and you're ready to start
            building better software architecture.
          </p>
          <h3
            style={{
              margin: "20px 0 15px 0",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Getting Started
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
                • Read our documentation to learn the basics
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
                • Download the CLI for powerful local development:{" "}
                <a
                  href="https://github.com/nanoapi-io/napi"
                  style={{
                    color: "#0066cc",
                    textDecoration: "underline",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  github.com/nanoapi-io/napi
                </a>
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
                • Create your first workspace or join an existing one
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
                • Invite team members to collaborate with you
              </td>
            </tr>
          </table>
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
                        Open the App
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
            Need help? Contact us at{" "}
            <a
              href="mailto:support@nanoapi.io"
              style={{
                color: "#0066cc",
                textDecoration: "underline",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              support@nanoapi.io
            </a>
          </p>
        </td>
      </tr>
    </table>
  );

  return baseTemplate(
    "Welcome to NanoAPI - Get started with better software architecture",
    content,
  );
};

export default WelcomeEmail;
