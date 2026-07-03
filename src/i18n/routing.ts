import { defineRouting } from "next-intl/routing";
import { routingLocales, defaultLocale } from "@/config/locales";

export const routing = defineRouting({
  locales: routingLocales,
  defaultLocale,
  localePrefix: "always",
});
