/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
// deno-lint-ignore no-undef
// deno-lint-ignore verbatim-module-syntax
import React from "react";
import {
  Button,
  Column,
  Heading,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { baseTemplate } from "./base.tsx";
import { headingStyle } from "./styles.tsx";

const WelcomeEmail = () => {
  const previewText = "Welcome to NanoAPI - Your account has been created!";
  return baseTemplate(
    previewText,
    <>
      <Section>
        <Heading style={headingStyle}>
          Welcome to our platform! We're thrilled to have you join our
          community.
        </Heading>
        <Text>
          Your account has been successfully created and you're all set to get
          started. Here's what you can do next:
        </Text>
        <ul>
          {[
            "Explore the dashboard and familiarize yourself with the interface",
            "Set up your profile and preferences",
            "Create your first workspace or join an existing one",
            "Invite team members to collaborate with you",
          ].map((item, index) => (
            <li>
              <p key={index} style={{ fontSize: "14px" }}>{item}</p>
            </li>
          ))}
        </ul>
        <Text>
          We also recommend checking out our{" "}
          <Link href="https://docs.nanoapi.io/default-guide/welcome">
            documentation
          </Link>{" "}
          as well as{" "}
          <Link href="https://github.com/nanoapi-io/napi?tab=readme-ov-file#installation">
            downloading the CLI to get started
          </Link>.
        </Text>
        <Text>
          If you have any questions or need assistance getting started, our
          support team is here to help. Don't hesitate to reach out!
        </Text>
        <Text>
          We're excited to see what you'll accomplish with our platform.
        </Text>
        <Row>
          <Column align="center">
            <Row>
              <td
                align="center"
                colSpan={1}
                style={{ paddingRight: 16, width: "50%" }}
              >
                <Button
                  href="https://docs.nanoapi.io/default-guide/welcome"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingTop: 12,
                    paddingBottom: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "rgb(229,231,235)",
                    textAlign: "center",
                    backgroundColor: "rgb(255,255,255)",
                    fontWeight: 600,
                    color: "rgb(17,24,39)",
                  }}
                >
                  Read the docs
                </Button>
              </td>
              <td
                align="center"
                colSpan={1}
                style={{ paddingLeft: 16, width: "50%" }}
              >
                <Button
                  href="https://app.nanoapi.io"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingTop: 12,
                    paddingBottom: 12,
                    borderRadius: 8,
                    backgroundColor: "rgb(79,70,229)",
                    textAlign: "center",
                    fontWeight: 600,
                    color: "rgb(255,255,255)",
                  }}
                >
                  Open the app
                </Button>
              </td>
            </Row>
          </Column>
        </Row>
        <Text>Best regards - Team Nano</Text>
      </Section>
    </>,
  );
};

export default WelcomeEmail;
