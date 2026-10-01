import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Field } from "@/components/Field";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!username || !password) return Alert.alert("Missing details", "Enter username and password.");
    try {
      setLoading(true);
      await login(username, password);
      router.replace("/member");
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page}>
        <LogoHeader compact />
        <Text style={styles.title}>Member Login</Text>
        <Field label="Username" value={username} onChangeText={setUsername} placeholder="Your username" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />
        <PrimaryButton title={loading ? "Logging in..." : "Login"} onPress={submit} disabled={loading} />
        <PrimaryButton title="New member? Register" secondary onPress={() => router.push("/register")} />
        <PrimaryButton title="Admin Login" onPress={() => router.push("/admin/login")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 22, justifyContent: "center" },
  title: { fontSize: 27, fontWeight: "900", color: "#153E60", marginBottom: 20 }
});
