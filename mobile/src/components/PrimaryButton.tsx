import React from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  danger = false,
  style
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && styles.danger,
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#D88900",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginVertical: 6
  },
  secondary: { backgroundColor: "#1C5D93" },
  danger: { backgroundColor: "#B52A2A" },
  disabled: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.98 }] },
  text: { color: "#fff", fontWeight: "800", fontSize: 16 }
});
