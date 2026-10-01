import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      {disabled ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
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
