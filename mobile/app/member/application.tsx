import { useRouter } from "expo-router";
import React, { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

type Family = { name: string; relation: string; mobile: string; email: string };

const emptyFamily = (): Family => ({ name: "", relation: "", mobile: "", email: "" });

export default function Application() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [family, setFamily] = useState<Family[]>([emptyFamily()]);

  const [form, setForm] = useState({
    fullName: "", fatherOrHusbandName: "", dob: "", mobile: "", whatsapp: "", email: "",
    address: "", city: "", district: "", state: "", pincode: "", occupation: "",
    paymentDate: "", paymentMethod: "", transactionReference: ""
  });

  const set = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }));

  async function chooseReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.75
    });
    if (!result.canceled) setReceipt(result.assets[0]);
  }

  function updateFamily(index: number, key: keyof Family, value: string) {
    setFamily((prev) => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }

  async function submit() {
    if (!form.fullName || !form.mobile || !form.address) {
      return Alert.alert("Required", "Full name, mobile number and address are required.");
    }

    try {
      setLoading(true);
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, String(value)));
      data.append("membershipFee", "500");
      data.append("cooperationAmount", "200");
      data.append("familyMembers", JSON.stringify(family.filter((x) => x.name.trim())));
      data.append("declarationAccepted", "true");

      if (receipt) {
        const ext = receipt.uri.split(".").pop() || "jpg";
        data.append("receipt", {
          uri: receipt.uri,
          name: `receipt.${ext}`,
          type: receipt.mimeType || "image/jpeg"
        } as any);
      }

      await apiFetch("/applications", { method: "POST", body: data }, token || undefined);
      Alert.alert(
        "Application submitted",
        "Your application is under review. Please wait up to 24 hours while it is verified.",
        [{ text: "OK", onPress: () => router.replace("/member") }]
      );
    } catch (e: any) {
      Alert.alert("Submission failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page}>
        <LogoHeader compact />
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Membership Application</Text>
          <Text style={styles.bannerText}>English version based on the supplied membership form.</Text>
        </View>

        <Text style={styles.section}>Personal Information</Text>
        <Field label="Full Name *" value={form.fullName} onChangeText={(v) => set("fullName", v)} />
        <Field label="Father's / Husband's Name" value={form.fatherOrHusbandName} onChangeText={(v) => set("fatherOrHusbandName", v)} />
        <Field label="Date of Birth" placeholder="DD/MM/YYYY" value={form.dob} onChangeText={(v) => set("dob", v)} />
        <Field label="Mobile Number *" keyboardType="phone-pad" value={form.mobile} onChangeText={(v) => set("mobile", v)} />
        <Field label="WhatsApp Number" keyboardType="phone-pad" value={form.whatsapp} onChangeText={(v) => set("whatsapp", v)} />
        <Field label="Email ID" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => set("email", v)} />
        <Field label="Full Address *" multiline value={form.address} onChangeText={(v) => set("address", v)} />
        <Field label="City" value={form.city} onChangeText={(v) => set("city", v)} />
        <Field label="District" value={form.district} onChangeText={(v) => set("district", v)} />
        <Field label="State" value={form.state} onChangeText={(v) => set("state", v)} />
        <Field label="PIN Code" keyboardType="number-pad" value={form.pincode} onChangeText={(v) => set("pincode", v)} />
        <Field label="Occupation / Profession" value={form.occupation} onChangeText={(v) => set("occupation", v)} />

        <Text style={styles.section}>Other Family Members (Optional)</Text>
        {family.map((item, index) => (
          <View key={index} style={styles.familyCard}>
            <Text style={styles.familyTitle}>Family Member {index + 1}</Text>
            <Field label="Name" value={item.name} onChangeText={(v) => updateFamily(index, "name", v)} />
            <Field label="Relation" value={item.relation} onChangeText={(v) => updateFamily(index, "relation", v)} />
            <Field label="Mobile" keyboardType="phone-pad" value={item.mobile} onChangeText={(v) => updateFamily(index, "mobile", v)} />
            <Field label="Email" value={item.email} onChangeText={(v) => updateFamily(index, "email", v)} />
          </View>
        ))}
        {family.length < 5 && (
          <PrimaryButton title="+ Add Family Member" secondary onPress={() => setFamily((p) => [...p, emptyFamily()])} />
        )}

        <Text style={styles.section}>Membership & Payment</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountBox}><Text style={styles.amountLabel}>Membership Fee</Text><Text style={styles.amount}>₹500</Text></View>
          <View style={styles.amountBox}><Text style={styles.amountLabel}>Cooperation</Text><Text style={styles.amount}>₹200</Text></View>
        </View>
        <Field label="Payment Date" placeholder="DD/MM/YYYY" value={form.paymentDate} onChangeText={(v) => set("paymentDate", v)} />
        <Field label="Payment Method" placeholder="UPI / Bank Transfer / Cash / Other" value={form.paymentMethod} onChangeText={(v) => set("paymentMethod", v)} />
        <Field label="Transaction Reference Number" value={form.transactionReference} onChangeText={(v) => set("transactionReference", v)} />
        <PrimaryButton title={receipt ? "Receipt Selected ✓" : "Attach Payment Receipt (Optional)"} secondary onPress={chooseReceipt} />

        <Text style={styles.section}>Declaration</Text>
        <Text style={styles.declaration}>
          I declare that the information provided by me is true and correct. I agree to follow the organization's rules and objectives. I understand that membership is subject to verification.
        </Text>

        <PrimaryButton title={loading ? "Submitting..." : "Submit Application"} onPress={submit} disabled={loading} />
        <PrimaryButton title="Cancel" danger onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#F7FBFD", padding: 15 },
  banner: { backgroundColor: "#0D568B", borderRadius: 14, padding: 15, marginBottom: 14 },
  bannerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  bannerText: { color: "#EAF6FF", marginTop: 4 },
  section: { fontSize: 20, fontWeight: "900", color: "#0D568B", marginTop: 10, marginBottom: 12 },
  familyCard: { backgroundColor: "#fff", padding: 13, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "#D5E1E8" },
  familyTitle: { fontWeight: "900", color: "#D88700", marginBottom: 8 },
  amountRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  amountBox: { flex: 1, backgroundColor: "#FFF1C9", borderRadius: 12, padding: 13, borderWidth: 1, borderColor: "#E6BA50" },
  amountLabel: { color: "#725016", fontWeight: "700" },
  amount: { fontSize: 24, fontWeight: "900", color: "#B3261E", marginTop: 4 },
  declaration: { backgroundColor: "#FFF8DD", borderRadius: 12, padding: 14, lineHeight: 21, color: "#4F4635", marginBottom: 8 }
});
