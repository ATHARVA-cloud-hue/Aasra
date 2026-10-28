/*
  App-wide settings that are NOT secret.
  Change the product name or contact details here and they
  update everywhere in the app.
*/

/*
  ⚠️  REPLACE BEFORE LAUNCH  ⚠️

  This is a FAKE placeholder number. Every WhatsApp fallback in the app
  points at it: the "I would rather just talk to someone" link on the
  lawyers page, and — more importantly — the fallback that fires when a
  consultation request cannot be recorded.

  Right now, a family in real distress who asks for a lawyer and hits
  that fallback opens WhatsApp to a number that does not exist. That is
  the single worst thing in this codebase to leave unfixed, because the
  people most likely to tap it are the ones least able to cope with
  being ignored.

  To fix: put the real helpline below in both places. wa.me links need
  the country code, with no "+", spaces or dashes — so a Mumbai number
  +91 98200 12345 becomes "919820012345". Keep WHATSAPP_DISPLAY in the
  format a person would recognise, and drop the "(demo)" from it.

  Then search the project for "REPLACE BEFORE LAUNCH" to be sure this is
  the only placeholder left.
*/
export const WHATSAPP_NUMBER = "910000000000";
export const WHATSAPP_DISPLAY = "+91 00000 00000 (demo)";

/*
  The message is required, never defaulted. A default would be one
  English sentence that no dictionary covers, sent on behalf of
  somebody reading the page in Urdu.
*/
export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

