"use client";

import { Button } from "@/components/ui/Button";
import { openChat } from "@/lib/chatBus";

/*
  A button, anywhere on any page, that opens the assistant already
  mounted in the root layout.

  It exists so a server-rendered page can offer the chat without the
  page itself becoming a client component — this tiny file is the only
  thing that ships to the browser.
*/
export function AskButton({
  children = "Ask our assistant",
  variant = "secondary",
  size,
  className = "",
}: {
  children?: string;
  variant?: "primary" | "secondary" | "quiet";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Button variant={variant} size={size} className={className} onClick={openChat}>
      {children}
    </Button>
  );
}
