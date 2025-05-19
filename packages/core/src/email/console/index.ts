export class ConsoleEmailService {
  public sendEmail(email: string, subject: string, body: string) {
    console.info(`Sending email to ${email}: ${subject}`);
    console.info(body);
  }
}
