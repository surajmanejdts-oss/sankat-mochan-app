import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Field } from "@/components/Field";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";

export default function AdminLogin() {
  const router = useRouter();
  const { adminLogin } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);
      await adminLogin(username, password);
      router.replace("/admin/dashboard");
    } catch (e: any) {
      Alert.alert("Admin login failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page}>
        <LogoHeader compact />
        <Text style={styles.title}>Administrator Login</Text>
        <Text style={styles.note}>Admin credentials are configured on the server, not in the mobile app.</Text>
        <Field label="Admin Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Field label="Admin Password" value={password} onChangeText={setPassword} secureTextEntry />
        <PrimaryButton title={loading ? "Checking..." : "Login as Admin"} onPress={submit} disabled={loading} />
        <PrimaryButton title="Back" secondary onPress={() => router.replace("/")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 22, justifyContent: "center" },
  title: { fontSize: 27, fontWeight: "900", color: "#153E60", marginBottom: 12 },
  note: { color: "#6B5A45", marginBottom: 18, lineHeight: 20 }
});
