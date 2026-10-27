import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/*
  One button used everywhere, so every button feels the same:
  big, soft corners, easy to tap on a phone.

  - Give it `href` and it becomes a link (for moving between pages).
  - Leave out `href` and it is a normal <button> (for actions).
*/

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium text-center " +
  "transition-colors duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Filled sage: the one main action on a screen.
  primary: "bg-sage-600 text-white shadow-sm hover:bg-sage-700",
  // Outlined: a gentler, secondary choice.
  secondary: "border border-sage-200 bg-paper text-sage-800 hover:border-sage-400 hover:bg-sage-50",
  // Text only: for "back", "skip", small links.
  quiet: "text-sage-700 underline-offset-4 hover:underline",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 py-2.5 text-base",
  lg: "min-h-16 px-7 py-4 text-lg",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type LinkButtonProps = CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">;
type PlainButtonProps = CommonProps & { href?: undefined } & Omit<ComponentProps<"button">, "className">;

export function Button(props: LinkButtonProps | PlainButtonProps) {
  const { variant = "primary", size = "md", className = "", children } = props;
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (props.href !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variant: _v, size: _s, className: _c, children: _ch, ...linkProps } = props;
    return (
      <Link {...linkProps} className={classes}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, size: _s, className: _c, children: _ch, ...buttonProps } = props;
  return (
    <button type="button" {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
