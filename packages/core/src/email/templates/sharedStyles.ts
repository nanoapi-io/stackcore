// Shared styles for email templates
export const sharedStyles = {
  // Typography
  heading: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 16px 0",
    letterSpacing: "-0.025em",
  },

  subheading: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 16px 0",
  },

  body: {
    fontSize: "16px",
    color: "#374151",
    margin: "0 0 16px 0",
    lineHeight: "1.6",
  },

  small: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 12px 0",
    lineHeight: "1.5",
  },

  // Layout
  section: {
    marginBottom: "32px",
  },

  centerText: {
    textAlign: "center" as const,
  },

  // Buttons
  primaryButton: {
    display: "inline-block",
    padding: "12px 24px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
    textAlign: "center" as const,
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "none",
  },

  secondaryButton: {
    display: "inline-block",
    padding: "12px 24px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
    textAlign: "center" as const,
    backgroundColor: "#ffffff",
    color: "#374151",
    border: "2px solid #e5e7eb",
  },

  // Cards and containers
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    marginBottom: "24px",
  },

  infoBox: {
    backgroundColor: "#dbeafe",
    borderRadius: "6px",
    padding: "16px",
    border: "1px solid #3b82f6",
    marginBottom: "24px",
  },

  warningBox: {
    backgroundColor: "#fef3c7",
    borderRadius: "6px",
    padding: "16px",
    border: "1px solid #f59e0b",
    marginBottom: "24px",
  },

  // Icons
  iconCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px auto",
    fontSize: "24px",
    color: "#ffffff",
  },

  // Links
  link: {
    color: "#4f46e5",
    textDecoration: "underline",
    fontWeight: "500",
  },

  // Divider
  divider: {
    borderTop: "1px solid #e5e7eb",
    marginTop: "32px",
    paddingTop: "24px",
  },

  // Content spacing
  contentSpacing: {
    marginBottom: "24px",
  },
};
