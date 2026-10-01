import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
        placeholderTextColor="#8A8A8A"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { color: "#173C5A", fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#A9C0D0",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
    color: "#15212B"
  },
  multiline: { minHeight: 90, textAlignVertical: "top" }
});
