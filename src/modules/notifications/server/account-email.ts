import "server-only";
import { sendTransactionalEmail } from "@/src/integrations/resend/server";
import { registrationWelcomeEmail } from "@/src/modules/notifications/domain/email-content";
import { publicAppUrl } from "@/src/modules/auth/server/request-security";

export async function sendRegistrationWelcome(input: { userId: string; email: string; name: string }) {
  const content = registrationWelcomeEmail({ name: input.name, accountUrl: publicAppUrl("/account").toString() });
  return sendTransactionalEmail({
    to: input.email,
    ...content,
    idempotencyKey: `registration-welcome-${input.userId}`
  });
}
