export type LegalSection = { heading: string; body: string };

/** Public static pages on Netlify (also used for Meta / business verification URLs). */
export const LEGAL_PAGE_URLS = {
  privacy: "/privacy-policy.html",
  terms: "/terms-and-conditions.html",
} as const;

export const LEGAL_CONTACT_EMAIL = "yogi2324@gmail.com";

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: "Information we collect",
    body:
      "We collect information from business cards scanned by users, including names, phone numbers, email addresses, company names, and job titles.",
  },
  {
    heading: "How we use information",
    body:
      "This information is used to extract contact details, save contacts to CRM systems such as Zoho CRM, and send communications through services such as WhatsApp.",
  },
  {
    heading: "No sale of personal data",
    body: "We do not sell personal information to third parties.",
  },
  {
    heading: "Security and purpose",
    body: "Data is processed securely and only for the purposes requested by the user.",
  },
  {
    heading: "Contact",
    body: `Users may contact us regarding data-related requests at: ${LEGAL_CONTACT_EMAIL}`,
  },
];

export const TERMS_AND_CONDITIONS_SECTIONS: LegalSection[] = [
  {
    heading: "Agreement",
    body:
      "By using CardSync AI you agree to these Terms and Conditions. If you do not agree, do not use the application.",
  },
  {
    heading: "Service description",
    body:
      "CardSync AI lets you scan business cards, extract contact details, save leads to Zoho CRM, and send follow-up communications through email and WhatsApp.",
  },
  {
    heading: "Your responsibilities",
    body:
      "You are responsible for the accuracy of data you save, obtaining consent before storing others’ personal information, and complying with applicable privacy and marketing laws.",
  },
  {
    heading: "Privacy",
    body:
      "We do not sell personal information to third parties. Data is processed securely and only for the purposes you request.",
  },
  {
    heading: "Disclaimer",
    body:
      "The app is provided “as is”. Always review extracted fields before saving or sending messages.",
  },
  {
    heading: "Contact",
    body: `Questions about these terms or data requests: ${LEGAL_CONTACT_EMAIL}`,
  },
];

export const COOKIE_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: "What are cookies?",
    body:
      "Cookies and similar technologies are small files stored in your browser. CardSync uses them to remember layout preferences and optional analytics choices.",
  },
  {
    heading: "Essential cookies",
    body:
      "Required for the app to function. Includes sidebar open/collapsed state (sidebar_state) so navigation stays consistent between visits. These cannot be disabled while using the app.",
  },
  {
    heading: "Preference storage",
    body:
      "We store your profile, notification toggles, and consent choices in local storage (cs-user-settings, cs-cookie-consent). This is not shared with third parties in this build.",
  },
  {
    heading: "Optional analytics",
    body:
      "If enabled in Preferences, anonymous usage events may be stored locally to improve the product. No advertising cookies are used.",
  },
  {
    heading: "Managing cookies",
    body:
      "Use the cookie icon at the bottom-right or open Preferences → Legal & cookies to update choices. Clearing browser data removes all stored cookies and local app data.",
  },
];
