import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export function DataRequestStatus({
  loading,
  error,
  onRetry,
  message = "Loading information..."
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  message?: string;
}) {
  if (loading) {
    return (
      <View style={styles.container} accessibilityRole="progressbar">
        <ActivityIndicator size="large" color="#0D568B" />
        <Text style={styles.message}>{message}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 160, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { color: "#666", marginTop: 12, textAlign: "center" },
  error: { color: "#8A2727", textAlign: "center", marginBottom: 12 },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: "#1C5D93" },
  retryText: { color: "#fff", fontWeight: "800" }
});
