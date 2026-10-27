/*
  "OPEN THE ASSISTANT" — a one-line message bus.

  The chat panel is mounted once, in the root layout, so it is there on
  every page. But the things that should open it are scattered: a
  button on the landing page, and anything we add later.

  Passing an "open it" function down from the layout would mean turning
  the layout, and every page between it and the button, into a client
  component — for one boolean. So instead the panel listens for a
  window event and anybody can shout.

  Both functions are safe to call while rendering on the server: they
  simply do nothing when there is no window.
*/

const EVENT = "aasra:open-chat";

/** Open the assistant panel, from anywhere in the app. */
export function openChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

/** Listen for that. Returns the clean-up function a useEffect wants. */
export function onOpenChat(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
