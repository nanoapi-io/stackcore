import { baseTemplate } from "./base.tsx";

const OtpEmail = ({ otp }: { otp: string }) => {
  const previewText = `Your one-time password (OTP) code is ${otp}`;

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
            One-Time Password
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
            Use the code below to complete your authentication
          </p>
          <table
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ width: "100%", margin: "30px 0" }}
          >
            <tr>
              <td
                align="center"
                style={{
                  padding: "15px",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <p
                  style={{
                    margin: "0",
                    fontSize: "24px",
                    fontFamily: "monospace, Arial, Helvetica, sans-serif",
                    letterSpacing: "2px",
                    fontWeight: "bold",
                    color: "#333333",
                  }}
                >
                  {otp}
                </p>
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
            This code is valid for a limited time and can only be used once. For
            your security, please do not share this code with anyone.
          </p>
          <p
            style={{
              margin: "20px 0 0 0",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#666666",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Didn't request this code? Please ignore this email or contact our
            {" "}
            <a
              href="mailto:support@nanoapi.io"
              style={{
                color: "#0066cc",
                textDecoration: "underline",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              support team
            </a>{" "}
            if you have concerns about your account security.
          </p>
        </td>
      </tr>
    </table>
  );

  return baseTemplate(previewText, content);
};

OtpEmail.PreviewProps = {
  otp: "123456",
};

export default OtpEmail;
