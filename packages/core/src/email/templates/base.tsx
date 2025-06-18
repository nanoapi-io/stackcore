/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React from "react";
import ReactDOM from "react-dom/server";
import type { ReactNode } from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

const bodyStyle = {
  fontFamily: "Arial, sans-serif",
};

const sectionStyle = {
  // deno-lint-ignore no-explicit-any
  textAlign: "center" as any,
};

const tableStyle = {
  width: "100%",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

export const baseTemplate = (previewText: string, children: ReactNode) => {
  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Preview>{previewText}</Preview>
        <Container style={containerStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              alt="NanoAPI logo"
              height="48"
              src="https://raw.githubusercontent.com/nanoapi-io/napi/refs/heads/main/media/android-chrome-192x192.png"
              width="48"
              style={{ marginRight: 8 }}
            />
            <Heading
              style={{
                marginTop: 8,
                marginBottom: 8,
                fontSize: 24,
                lineHeight: "32px",
                fontWeight: 600,
                color: "rgb(17,24,39)",
              }}
            >
              NanoAPI
            </Heading>
          </div>
          <Hr />
          {children}
          <Hr />
          <Section style={sectionStyle}>
            <table style={tableStyle}>
              <tr style={tableStyle}>
                <td align="center">
                  <Img
                    alt="React Email logo"
                    height="48"
                    src="https://raw.githubusercontent.com/nanoapi-io/napi/refs/heads/main/media/android-chrome-192x192.png"
                  />
                </td>
              </tr>
              <tr style={tableStyle}>
                <td align="center">
                  <Text
                    style={{
                      marginTop: 8,
                      marginBottom: 8,
                      fontSize: 16,
                      lineHeight: "24px",
                      fontWeight: 600,
                      color: "rgb(17,24,39)",
                    }}
                  >
                    NanoAPI
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      marginBottom: "0px",
                      fontSize: 16,
                      lineHeight: "24px",
                      color: "rgb(107,114,128)",
                    }}
                  >
                    Software Architecture for the AI Age
                  </Text>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <Row
                    style={{
                      display: "table-cell",
                      height: 44,
                      width: 56,
                      verticalAlign: "bottom",
                    }}
                  >
                    <Column style={{ paddingRight: 8 }}>
                      <Link href="https://discord.gg/dFWTtRvJdk">
                        <Img
                          alt="Discord Server"
                          height="36"
                          src="https://cdn-icons-png.flaticon.com/512/5968/5968898.png"
                          width="36"
                        />
                      </Link>
                    </Column>
                    <Column style={{ paddingRight: 8 }}>
                      <Link href="https://www.youtube.com/@Nano-API">
                        <Img
                          alt="YouTube"
                          height="36"
                          src="https://cdn-icons-png.flaticon.com/512/5968/5968975.png"
                          width="36"
                        />
                      </Link>
                    </Column>
                    <Column>
                      <Link href="https://www.linkedin.com/company/nanoapi/">
                        <Img
                          alt="Linkedin"
                          height="36"
                          src="https://cdn-icons-png.flaticon.com/512/5968/5968924.png"
                          width="36"
                        />
                      </Link>
                    </Column>
                  </Row>
                </td>
              </tr>
            </table>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
