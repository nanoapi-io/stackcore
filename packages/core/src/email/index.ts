import settings from "../settings.ts";
import { ConsoleEmailService } from "./console/index.ts";

export function getEmailService() {
  return new ConsoleEmailService();
}

export function sendOtpEmail(email: string, otp: string) {
  const emailService = getEmailService();
  emailService.sendEmail(email, "OTP", `Your OTP is ${otp}`);
}

export function sendInvitationEmail(
  email: string,
  organizationName: string,
  invitationUuid: string,
) {
  const emailService = getEmailService();

  const invitationLink =
    `${settings.FRONTEND.URL}/invitations/${invitationUuid}/claim`;
  emailService.sendEmail(
    email,
    `Invitation to join ${organizationName}`,
    `You have been invited to join the organization "${organizationName}". Click here to accept: ${invitationLink}`,
  );
}
