import type messagesEn from "../messages/en.json";

import type { SupportedLocale } from "./lib/i18n/config";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messagesEn;
    Locale: SupportedLocale;
  }
}

export {};
