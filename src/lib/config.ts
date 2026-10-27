/*
  App-wide settings that are NOT secret.
  Change the product name or contact details here and they
  update everywhere in the app.
*/

export const APP_NAME = "Aasra";

export const APP_TAGLINE = "Gentle help for families claiming what a loved one left behind.";

/*
  ⚠️  REPLACE BEFORE LAUNCH  ⚠️

  This is a FAKE placeholder number. Every "Talk to a person" button in
  the app points at it, including the one inside the chat panel and the
  one at the end of the case tracker.

  Right now, a family in real distress who taps "Talk to a person" opens
  WhatsApp to a number that does not exist. That is the single worst
  thing in this codebase to leave unfixed, because the people most
  likely to tap it are the ones least able to cope with being ignored.

  To fix: put the real helpline below in both places. wa.me links need
  the country code, with no "+", spaces or dashes — so a Mumbai number
  +91 98200 12345 becomes "919820012345". Keep WHATSAPP_DISPLAY in the
  format a person would recognise, and drop the "(demo)" from it.

  Then search the project for "REPLACE BEFORE LAUNCH" to be sure this is
  the only placeholder left.
*/
export const WHATSAPP_NUMBER = "910000000000";
export const WHATSAPP_DISPLAY = "+91 00000 00000 (demo)";

export function whatsappLink(message = "Hello, I need some help with my family's case.") {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// The footer line the brief asks for, kept in one place.
export const LEGAL_LINE =
  "We are a technology and service platform, not a law firm. What you see here is guidance, not legal advice — a lawyer reviews anything legal before it is filed.";
