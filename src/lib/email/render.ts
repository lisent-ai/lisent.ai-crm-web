import { getEmailI18n } from "./i18n";
import {
  renderPasswordReset,
  type PasswordResetData,
  type RenderedEmail,
} from "./templates/password-reset";
import { renderOtpCodeEmail } from "./templates/otp-code-email";

// Central renderer: (templateId, recipient locale, data) → subject/html/text.
// Add a template by extending the union + the switch — callers (the
// SuperTokens emailDelivery override) stay declarative.

export type OtpEmailData = { email: string; code: string };

export type EmailTemplate =
  | { id: "password-reset"; data: PasswordResetData }
  | { id: "verify-email-otp"; data: OtpEmailData }
  | { id: "signin-otp"; data: OtpEmailData };

export async function renderEmail(
  template: EmailTemplate,
  locale?: string,
): Promise<RenderedEmail> {
  const i18n = await getEmailI18n(locale);
  switch (template.id) {
    case "password-reset":
      return renderPasswordReset(i18n, template.data);
    case "verify-email-otp":
      return renderOtpCodeEmail(i18n, {
        ...template.data,
        prefix: "email.verifyEmail",
      });
    case "signin-otp":
      return renderOtpCodeEmail(i18n, {
        ...template.data,
        prefix: "email.signinOtp",
      });
    default: {
      // Exhaustiveness guard — a new template variant fails to compile here.
      const _never: never = template;
      throw new Error(`unknown email template: ${JSON.stringify(_never)}`);
    }
  }
}
