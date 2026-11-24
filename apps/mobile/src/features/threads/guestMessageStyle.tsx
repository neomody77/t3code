import { guestMessageColor } from "@t3tools/client-runtime/user-message";
import { useGT } from "gt-react-native";
import { View } from "react-native";

import { AppText as Text } from "../../components/ui/AppText";
import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";

/** The guest's name above their message, where "Sent by T3 Code" sits for server messages. */
export function GuestMessageName(props: { readonly name: string }) {
  const gt = useGT();
  const { themeAppearance } = useAppearancePreferences();
  const color = guestMessageColor(props.name);
  return (
    <Text
      accessibilityLabel={gt("{name} (guest)", { name: props.name })}
      className="mb-1 pr-1 font-t3-medium text-2xs"
      style={{ color: themeAppearance === "dark" ? color.dark : color.light }}
      numberOfLines={1}
    >
      {props.name}
    </Text>
  );
}

/**
 * First child of a sent guest bubble. Over the bubble color it gives the web's 14% guest mix,
 * which every theme gets without a per-theme token.
 */
export function GuestBubbleTint({ name }: { readonly name: string }) {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 rounded-[20px]"
      style={{ backgroundColor: `${guestMessageColor(name).accent}24` }}
    />
  );
}

/** A pending guest bubble has a dashed edge and no fill. */
export const GUEST_PENDING_BUBBLE_CLASS_NAME =
  "min-w-0 rounded-[20px] border border-dashed bg-transparent px-3.5 py-2.5";
