import type { ReactNode } from "react";

export const baseTemplate = (previewText: string, children: ReactNode) => {
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
          margin: "0",
          padding: "0",
          backgroundColor: "#f5f5f5",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "14px",
          lineHeight: "1.4",
          color: "#333333",
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
        }}
      >
        <table
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{
            backgroundColor: "#f5f5f5",
            width: "100%",
          }}
        >
          <tr>
            <td align="center" style={{ padding: "10px" }}>
              <table
                cellPadding={0}
                cellSpacing={0}
                border={0}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #cccccc",
                  width: "100%",
                  maxWidth: "600px",
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    align="center"
                    style={{
                      padding: "20px",
                      borderBottom: "1px solid #cccccc",
                    }}
                  >
                    <img
                      alt="NanoAPI logo"
                      src="https://raw.githubusercontent.com/nanoapi-io/napi/refs/heads/main/media/android-chrome-192x192.png"
                      width={32}
                      height={32}
                      style={{ border: "0", display: "inline-block" }}
                    />
                    <h1
                      style={{
                        margin: "10px 0 5px 0",
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#333333",
                        fontFamily: "Arial, Helvetica, sans-serif",
                      }}
                    >
                      NanoAPI
                    </h1>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "14px",
                        color: "#666666",
                        fontFamily: "Arial, Helvetica, sans-serif",
                      }}
                    >
                      Software Architecture for the AI Age
                    </p>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: "20px" }}>
                    {children}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    align="center"
                    style={{
                      padding: "20px",
                      backgroundColor: "#f9f9f9",
                      borderTop: "1px solid #cccccc",
                    }}
                  >
                    <table
                      cellPadding={0}
                      cellSpacing={0}
                      border={0}
                      style={{ width: "100%" }}
                    >
                      <tr>
                        <td align="center" style={{ paddingBottom: "15px" }}>
                          <table cellPadding={0} cellSpacing={0} border={0}>
                            <tr>
                              <td style={{ padding: "0 5px" }}>
                                <a href="https://discord.gg/dFWTtRvJdk">
                                  <img
                                    alt="Join us on Discord"
                                    src="https://cdn-icons-png.flaticon.com/512/5968/5968898.png"
                                    width={24}
                                    height={24}
                                    style={{ border: "0" }}
                                  />
                                </a>
                              </td>
                              <td style={{ padding: "0 5px" }}>
                                <a href="https://www.youtube.com/@Nano-API">
                                  <img
                                    alt="Watch us on YouTube"
                                    src="https://cdn-icons-png.flaticon.com/512/5968/5968975.png"
                                    width={24}
                                    height={24}
                                    style={{ border: "0" }}
                                  />
                                </a>
                              </td>
                              <td style={{ padding: "0 5px" }}>
                                <a href="https://www.linkedin.com/company/nanoapi/">
                                  <img
                                    alt="Connect with us on LinkedIn"
                                    src="https://cdn-icons-png.flaticon.com/512/5968/5968924.png"
                                    width={24}
                                    height={24}
                                    style={{ border: "0" }}
                                  />
                                </a>
                              </td>
                              <td style={{ padding: "0 5px" }}>
                                <a href="https://github.com/nanoapi-io">
                                  <img
                                    alt="View our code on GitHub"
                                    src="https://cdn-icons-png.flaticon.com/512/5968/5968866.png"
                                    width={24}
                                    height={24}
                                    style={{ border: "0" }}
                                  />
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <p
                            style={{
                              margin: "0 0 5px 0",
                              fontSize: "14px",
                              fontWeight: "bold",
                              color: "#333333",
                              fontFamily: "Arial, Helvetica, sans-serif",
                            }}
                          >
                            NanoAPI
                          </p>
                          <p
                            style={{
                              margin: "0 0 5px 0",
                              fontSize: "12px",
                              color: "#666666",
                              fontFamily: "Arial, Helvetica, sans-serif",
                            }}
                          >
                            <a
                              href="https://nanoapi.io"
                              style={{
                                color: "#666666",
                                textDecoration: "underline",
                                fontFamily: "Arial, Helvetica, sans-serif",
                              }}
                            >
                              https://nanoapi.io
                            </a>
                          </p>
                          <p
                            style={{
                              margin: "0",
                              fontSize: "12px",
                              color: "#666666",
                              fontFamily: "Arial, Helvetica, sans-serif",
                            }}
                          >
                            Need help? Contact us at{" "}
                            <a
                              href="mailto:support@nanoapi.io"
                              style={{
                                color: "#666666",
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
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
};
