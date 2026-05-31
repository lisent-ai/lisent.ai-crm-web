import { getEmailI18n } from "./i18n";
import {
  renderPasswordReset,
  type PasswordResetData,
  type RenderedEmail,
} from "./templates/password-reset";
import {
  renderVerifyEmailOtp,
  type VerifyEmailOtpData,
} from "./templates/verify-email-otp";

// Central renderer: (templateId, recipient locale, data) → subject/html/text.
// Add a template by extending the union + the switch — callers (the
// SuperTokens emailDelivery override) stay declarative.

export type EmailTemplate =
  | { id: "password-reset"; data: PasswordResetData }
  | { id: "verify-email-otp"; data: VerifyEmailOtpData };

export async function renderEmail(
  template: EmailTemplate,
  locale?: string,
): Promise<RenderedEmail> {
  const i18n = await getEmailI18n(locale);
  switch (template.id) {
    case "password-reset":
      return renderPasswordReset(i18n, template.data);
    case "verify-email-otp":
      return renderVerifyEmailOtp(i18n, template.data);
    default: {
      // Exhaustiveness guard — a new template variant fails to compile here.
      const _never: never = template;
      throw new Error(`unknown email template: ${JSON.stringify(_never)}`);
    }
  }
}
