import { guestMessageColor } from "@t3tools/client-runtime/user-message";
import { useGT } from "gt-react";

/** Bubble classes for a guest's message. A pending one has a dashed edge and no fill. */
export function guestBubbleClassName(pending: boolean): string {
  return pending ? "border border-dashed border-guest/50 bg-transparent" : "bg-guest-surface";
}

export function guestBubbleStyle(name: string, pending: boolean) {
  const color = guestMessageColor(name);
  return {
    borderColor: `${color.accent}80`,
    backgroundColor: pending
      ? "transparent"
      : `color-mix(in srgb, ${color.accent} 14%, var(--message-surface))`,
  };
}

/** The guest's name above their message, where "Sent by T3 Code" sits for server messages. */
export function GuestMessageName({ name }: { readonly name: string }) {
  const gt = useGT();
  const color = guestMessageColor(name);
  return (
    <p className="me-1 text-2xs" style={{ color: `light-dark(${color.light}, ${color.dark})` }}>
      {name}
      <span className="sr-only">
        {" "}
        {gt("(guest)", { $context: "marks the sender of a message as a guest" })}
      </span>
    </p>
  );
}
