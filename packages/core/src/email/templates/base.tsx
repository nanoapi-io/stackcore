import type { ReactNode } from "react";
import type { CSSProperties } from "react";

export const baseTemplate = (previewText: string, children: ReactNode) => {
  const socialLinkStyle: CSSProperties = {
    display: "inline-block",
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    transition: "all 0.2s ease",
    textDecoration: "none",
  };

  const socialIconStyle: CSSProperties = {
    display: "block",
    width: "24px",
    height: "24px",
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={previewText} />
        <title>NanoAPI</title>
      </head>
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          margin: 0,
          padding: 0,
          backgroundColor: "#f9fafb",
          color: "#374151",
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <img
                alt="NanoAPI logo"
                height="32"
                src="https://raw.githubusercontent.com/nanoapi-io/napi/refs/heads/main/media/android-chrome-192x192.png"
                width="32"
                style={{ borderRadius: "6px" }}
              />
              <h1
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#111827",
                  letterSpacing: "-0.025em",
                }}
              >
                NanoAPI
              </h1>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#6b7280",
                fontWeight: "500",
              }}
            >
              Software Architecture for the AI Age
            </p>
          </div>

          {/* Content */}
          <div
            style={{
              padding: "32px 24px",
              backgroundColor: "#ffffff",
            }}
          >
            {children}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "24px",
              backgroundColor: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {/* Social Links */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "8px",
                }}
              >
                <a
                  href="https://discord.gg/dFWTtRvJdk"
                  style={socialLinkStyle}
                  title="Join our Discord Server"
                >
                  <img
                    alt="Discord Server"
                    src="https://cdn-icons-png.flaticon.com/512/5968/5968898.png"
                    style={socialIconStyle}
                  />
                </a>
                <a
                  href="https://www.youtube.com/@Nano-API"
                  style={socialLinkStyle}
                  title="Subscribe to our YouTube Channel"
                >
                  <img
                    alt="YouTube"
                    src="https://cdn-icons-png.flaticon.com/512/5968/5968975.png"
                    style={socialIconStyle}
                  />
                </a>
                <a
                  href="https://www.linkedin.com/company/nanoapi/"
                  style={socialLinkStyle}
                  title="Follow us on LinkedIn"
                >
                  <img
                    alt="LinkedIn"
                    src="https://cdn-icons-png.flaticon.com/512/5968/5968924.png"
                    style={socialIconStyle}
                  />
                </a>
                <a
                  href="https://github.com/nanoapi-io"
                  style={socialLinkStyle}
                  title="Follow us on GitHub"
                >
                  <img
                    alt="GitHub"
                    src="https://cdn-icons-png.flaticon.com/512/5968/5968866.png"
                    style={socialIconStyle}
                  />
                </a>
              </div>

              {/* Footer Text */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  NanoAPI
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    textAlign: "center",
                  }}
                >
                  <a
                    href="https://nanoapi.io"
                    style={{
                      color: "#6b7280",
                      textDecoration: "underline",
                    }}
                  >
                    https://nanoapi.io
                  </a>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    textAlign: "center",
                  }}
                >
                  Need help? Contact us at{" "}
                  <a
                    href="mailto:support@nanoapi.io"
                    style={{
                      color: "#6b7280",
                      textDecoration: "underline",
                    }}
                  >
                    support@nanoapi.io
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};
