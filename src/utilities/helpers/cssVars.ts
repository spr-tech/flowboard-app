import type { CSSProperties } from "react";

/**
 * Typed inline CSS variables: style={cssVars({ "--r": "-8deg" })}.
 * React's style type doesn't know custom properties, so this is the one place we cast.
 */
export function cssVars(vars: Record<`--${string}`, string>): CSSProperties {
  return vars as CSSProperties;
}
