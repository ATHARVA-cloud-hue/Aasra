/*
  App-wide settings that are NOT secret.
*/

/*
  THE WHATSAPP CONTACT.

  ====================================================================
  WHAT USED TO BE HERE, AND WHY IT IS GONE
  ====================================================================
  This file held a hardcoded fake number, "910000000000", under a
  banner comment telling a future developer to replace it before
  launch. Every WhatsApp fallback in the app pointed at it. A family in
  distress who asked for a lawyer and hit that fallback opened WhatsApp
  to a number that does not exist, and got silence.

  A comment telling a future developer to fix it was not a fix. The
  trap is now gone, in two parts:

  1. The number comes from NEXT_PUBLIC_WHATSAPP_NUMBER.

  2. When that is not set, hasWhatsapp() is false and the app does not
     show a WhatsApp link at all. It offers the in-app consultation
     flow instead. No dead link can be rendered, because there is
     nothing to render it from.

  So an unconfigured deployment degrades to "contact us through the
  app", which works, rather than to a number that rings nowhere.
*/

/*
  wa.me needs the country code with no "+", spaces or dashes, so
  +91 98200 12345 becomes 919820012345. Anything else is discarded
  rather than used, because a malformed wa.me link fails silently in a
  way the family would read as being ignored.
*/
const configuredNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/[^\d]/g, "");

/*
  A plausible number is 10 to 15 digits (E.164 allows 15). The old
  placeholder, 910000000000, is explicitly rejected: it is the right
  length and would otherwise pass, and leaving the trap one typo away
  from returning is not worth the three lines it costs to close.
*/
const PLACEHOLDERS = new Set(["910000000000", "911234567890", "919999999999"]);

const looksReal =
  configuredNumber.length >= 10 &&
  configuredNumber.length <= 15 &&
  !PLACEHOLDERS.has(configuredNumber) &&
  // All one digit repeated is not a phone number.
  !/^(\d)\1+$/.test(configuredNumber);

export const WHATSAPP_NUMBER = looksReal ? configuredNumber : "";

/** How the number is shown to a person. Empty when there is none. */
export const WHATSAPP_DISPLAY = looksReal
  ? (process.env.NEXT_PUBLIC_WHATSAPP_DISPLAY ?? configuredNumber)
  : "";

/*
  Ask this BEFORE rendering any WhatsApp link or button. False means
  there is no contact number, and the caller should offer the in-app
  consultation route instead.
*/
export function hasWhatsapp(): boolean {
  return WHATSAPP_NUMBER !== "";
}

/*
  A wa.me link, or null when no number is configured.

  Returning null rather than a broken URL is the point: a caller has to
  handle the "no number" case to get anything out of this function, so
  a dead link cannot be produced by forgetting to check.

  The message is required, never defaulted. A default would be one
  English sentence that no dictionary covers, sent on behalf of
  somebody reading the page in Urdu.
*/
export function whatsappLink(message: string): string | null {
  if (!hasWhatsapp()) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
