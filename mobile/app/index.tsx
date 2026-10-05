import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <LogoHeader showTagline={false} showOrganizationName={false} />
      <Text style={styles.hindiName}>श्री संकट मोचण सेवार्थ संस्था</Text>
      <Text style={styles.footer}>दर्द आपका - साथ हमारा • सहयोग हमारा संकल्प</Text>
      <Text style={styles.humanity}>Humanity • Cooperation • Service</Text>
      <Text style={styles.heading}>Welcome</Text>
      <Text style={styles.description}>
        Sign in to your member account, or contact an administrator to register as a member.
      </Text>

      <View style={styles.card}>
        <PrimaryButton title="Member Login" secondary onPress={() => router.push("/login")} />
        <PrimaryButton title="Admin Login" onPress={() => router.push("/admin/login")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 24, justifyContent: "center" },
  hindiName: { color: "#153E60", fontSize: 21, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  footer: { textAlign: "center", marginTop: 0, marginBottom: 5, color: "#C87800", fontWeight: "700", lineHeight: 22 },
  humanity: { textAlign: "center", color: "#6B4A18", fontWeight: "600", marginBottom: 10 },
  heading: { fontSize: 30, fontWeight: "900", color: "#153E60", textAlign: "center" },
  description: { textAlign: "center", color: "#5C5C5C", lineHeight: 23, marginVertical: 14 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 18, elevation: 3, shadowOpacity: 0.1 }
});
