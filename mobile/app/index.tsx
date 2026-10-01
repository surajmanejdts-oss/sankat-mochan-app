import { useRouter } from "expo-router";
import React from "react";
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <LogoHeader />
      <Text style={styles.heading}>Welcome</Text>
      <Text style={styles.description}>
        Join our community of service, cooperation and humanity. Register first, then login to submit your member application.
      </Text>

      <View style={styles.card}>
        <PrimaryButton title="Member Registration" onPress={() => router.push("/register")} />
        <PrimaryButton title="Member Login" secondary onPress={() => router.push("/login")} />
        <PrimaryButton title="Admin Login" onPress={() => router.push("/admin/login")} />
      </View>

      <Text style={styles.footer}>दर्द आपका - साथ हमारा • सहयोग हमारा संकल्प</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 24, justifyContent: "center" },
  heading: { fontSize: 30, fontWeight: "900", color: "#153E60", textAlign: "center" },
  description: { textAlign: "center", color: "#5C5C5C", lineHeight: 23, marginVertical: 14 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 18, elevation: 3, shadowOpacity: 0.1 },
  footer: { textAlign: "center", marginTop: 22, color: "#C87800", fontWeight: "700" }
});
