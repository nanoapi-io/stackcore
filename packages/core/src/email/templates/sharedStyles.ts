// Email-compatible shared styles for transactional emails
export const sharedStyles = {
  // Basic typography
  heading: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333333",
    margin: "0 0 15px 0",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  subheading: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333333",
    margin: "0 0 10px 0",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  body: {
    fontSize: "14px",
    color: "#333333",
    margin: "0 0 10px 0",
    lineHeight: "1.4",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  small: {
    fontSize: "12px",
    color: "#666666",
    margin: "0 0 8px 0",
    lineHeight: "1.3",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  // Email-compatible button (table-based)
  button: {
    display: "inline-block",
    padding: "10px 20px",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "14px",
    textAlign: "center" as const,
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "1px solid #4f46e5",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  // Mobile-responsive button container
  buttonContainer: {
    width: "100%",
    maxWidth: "200px",
  },

  // Simple link
  link: {
    color: "#4f46e5",
    textDecoration: "underline",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  // Simple divider
  divider: {
    borderTop: "1px solid #cccccc",
    marginTop: "15px",
    paddingTop: "15px",
  },
};
