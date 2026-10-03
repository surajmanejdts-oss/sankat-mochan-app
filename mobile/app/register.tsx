import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || !username || !password) {
      return Alert.alert("Missing details", "Please fill all fields.");
    }
    try {
      setLoading(true);
      await register(name, username, password);
      Alert.alert("Registration complete", "Your account is created. Please login.", [
        { text: "Go to Login", onPress: () => router.replace("/login") }
      ]);
    } catch (e: any) {
      Alert.alert("Registration failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page}>
        <LogoHeader compact />
        <Text style={styles.title}>Member Registration</Text>
        <Field label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Field label="Username" value={username} onChangeText={setUsername} placeholder="Choose a username" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secureTextEntry />
        <PrimaryButton title={loading ? "Creating..." : "Create Account"} onPress={submit} disabled={loading} />
        <PrimaryButton title="Back to Login" secondary onPress={() => router.replace("/login")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 22 },
  title: { fontSize: 27, fontWeight: "900", color: "#153E60", marginBottom: 20 }
});
