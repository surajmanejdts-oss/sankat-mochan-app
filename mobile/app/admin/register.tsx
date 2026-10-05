import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";

export default function AdminRegisterMember() {
  const router = useRouter();
  const { register } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !username.trim() || !password) {
      Alert.alert("Missing details", "Enter the member's name, username, and password.");
      return;
    }
    if (!/^\d{10}$/.test(username)) {
      Alert.alert("Invalid phone number", "Enter a 10-digit phone number to use as the member's username.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password too short", "Password must contain at least 6 characters.");
      return;
    }

    try {
      setSaving(true);
      await register(name.trim(), username.trim(), password);
      Alert.alert("Member registered", "The member account was created and is pending verification.", [
        { text: "Done", onPress: () => router.replace("/admin/members") }
      ]);
    } catch (error: any) {
      Alert.alert("Registration failed", error?.message || "Unable to register member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Register a Member</Text>
        <Text style={styles.subtitle}>New member accounts are created by administrators and begin as pending.</Text>
        <Field label="Full name *" value={name} onChangeText={setName} placeholder="Enter the member's full name" />
        <Field
          label="Phone number (username) *"
          value={username}
          onChangeText={(value) => setUsername(value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Enter 10-digit phone number"
          keyboardType="number-pad"
          maxLength={10}
        />
        <View style={styles.passwordField}>
          <Text style={styles.passwordLabel}>Password *</Text>
          <View style={styles.passwordInputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#8A8A8A"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
              }}
              style={styles.passwordInput}
              accessibilityLabel="Password"
            />
            <Pressable
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.passwordVisibility}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              hitSlop={8}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#526773" />
            </Pressable>
          </View>
        </View>
        <PrimaryButton title={saving ? "Creating..." : "Create Member Account"} onPress={submit} disabled={saving} loading={saving} />
        <PrimaryButton title="Back to Dashboard" secondary onPress={() => router.replace("/admin/dashboard")} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#F3F7FA", padding: 20, justifyContent: "center", paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: "900", color: "#173C5A", marginBottom: 8 },
  subtitle: { color: "#66737B", lineHeight: 21, marginBottom: 20 },
  passwordField: { marginBottom: 12 },
  passwordLabel: { color: "#173C5A", fontWeight: "700", marginBottom: 6 },
  passwordInputWrap: { position: "relative", justifyContent: "center" },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#A9C0D0",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingRight: 48,
    paddingVertical: 11,
    fontSize: 15,
    color: "#15212B"
  },
  passwordVisibility: { position: "absolute", right: 12, height: "100%", justifyContent: "center" }
});
