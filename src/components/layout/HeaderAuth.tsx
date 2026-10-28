"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isRealAccount, signOut, useAuth } from "@/lib/auth";

/*
  THE ONE BIT OF THE HEADER THAT KNOWS WHO YOU ARE.

  Kept in its own small client component so SiteHeader — and with it
  every page in the app — can stay on the server.

  What it shows, and why:

  - LOADING: nothing at all. A header that says "Log in", thinks for
    half a second and then says "Log out" is unsettling in a way that
    an empty space is not.

  - A REAL ACCOUNT: "Log out". Logging out also wipes the answers kept
    on this device, which is the point of the control on a shared
    laptop — see signOut() in src/lib/auth.ts.

  - ANYTHING ELSE, including the invisible anonymous session the case
    store uses: "Log in / create account". Somebody mid-journey without
    an account is not logged in in any sense they would recognise, and
    offering to log them out would be nonsense.
*/

export function HeaderAuth() {
  const t = useTranslations("nav");
  const auth = useAuth();
  const router = useRouter();
  const [going, setGoing] = useState(false);

  if (auth.status === "loading") return null;

  if (isRealAccount(auth)) {
    return (
      <button
        type="button"
        disabled={going}
        onClick={() => {
          setGoing(true);
          void (async () => {
            await signOut();
            // Home, not back to where they were: the page they are on
            // may well be showing the case we have just cleared.
            router.push("/");
            router.refresh();
            setGoing(false);
          })();
        }}
        className="rounded-full px-3 py-2 text-base text-ink-soft transition-colors duration-300 hover:bg-sage-50 hover:text-sage-800 disabled:opacity-50"
      >
        {going ? t("loggingOut") : t("logOut")}
      </button>
    );
  }

  return (
    <Link
      href="/login"
      aria-label={t("logInFull")}
      className="rounded-full px-3 py-2 text-base text-ink-soft transition-colors duration-300 hover:bg-sage-50 hover:text-sage-800"
    >
      {/* The full wording on a laptop; just "Log in" where the header
          would otherwise wrap onto three lines on a phone. */}
      {t("logIn")}
      <span className="hidden sm:inline">{t("logInSuffix")}</span>
    </Link>
  );
}
