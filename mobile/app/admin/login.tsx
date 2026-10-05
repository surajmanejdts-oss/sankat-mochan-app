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
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";

export default function AdminLogin() {
  const router = useRouter();
  const { adminLogin } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <LogoHeader compact />
        <Text style={styles.title}>Administrator Login</Text>
        <Text style={styles.note}>Admin credentials are configured on the server, not in the mobile app.</Text>
        <Field label="Admin Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <View style={styles.passwordField}>
          <Text style={styles.passwordLabel}>Admin Password</Text>
          <View style={styles.passwordInputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Admin password"
              placeholderTextColor="#8A8A8A"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
              }}
              style={styles.passwordInput}
              accessibilityLabel="Admin Password"
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
        <PrimaryButton title={loading ? "Checking..." : "Login as Admin"} onPress={submit} disabled={loading} loading={loading} />
        <PrimaryButton title="Back" secondary onPress={() => router.replace("/")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 22, justifyContent: "center", paddingBottom: 32 },
  title: { fontSize: 27, fontWeight: "900", color: "#153E60", marginBottom: 12 },
  note: { color: "#6B5A45", marginBottom: 18, lineHeight: 20 },
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
