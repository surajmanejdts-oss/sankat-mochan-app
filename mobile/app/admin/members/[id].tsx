import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataRequestStatus } from "@/components/DataRequestStatus";
import { SignaturePad } from "@/components/SignaturePad";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type FamilyMemberForm = { name: string; relation: string; mobile: string; email: string };
type ApplicationForm = {
  fullName: string;
  fatherOrHusbandName: string;
  dob: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  occupation: string;
  familyMembers: FamilyMemberForm[];
  membershipFee: string;
  cooperationAmount: string;
  paymentDate: string;
  paymentMethod: string;
  transactionReference: string;
};

function emptyApplicationForm(): ApplicationForm {
  return {
    fullName: "", fatherOrHusbandName: "", dob: "", mobile: "", whatsapp: "",
    email: "", address: "", city: "", district: "", state: "", pincode: "",
    occupation: "", familyMembers: [], membershipFee: "0", cooperationAmount: "0",
    paymentDate: "", paymentMethod: "", transactionReference: ""
  };
}

export default function MemberDetail() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string | string[] }>();
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const editRequested = Array.isArray(edit) ? edit[0] === "1" : edit === "1";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", application: emptyApplicationForm() });

  useEffect(() => {
    setEditing(editRequested && data?.member?.status === "verified");
  }, [editRequested, id, data?.member?.status]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiFetch<{ member: any; application: any }>(`/admin/members/${id}`, {}, token || undefined);
      setData(result);
      const application = result.application;
      setForm({
        name: result.member.name || "",
        username: result.member.username || "",
        application: {
          fullName: application?.fullName || "",
          fatherOrHusbandName: application?.fatherOrHusbandName || "",
          dob: application?.dob || "",
          mobile: application?.mobile || "",
          whatsapp: application?.whatsapp || "",
          email: application?.email || "",
          address: application?.address || "",
          city: application?.city || "",
          district: application?.district || "",
          state: application?.state || "",
          pincode: application?.pincode || "",
          occupation: application?.occupation || "",
          familyMembers: (application?.familyMembers || []).map((family: any) => ({
            name: family.name || "",
            relation: family.relation || "",
            mobile: family.mobile || "",
            email: family.email || ""
          })),
          membershipFee: String(application?.membershipFee || application?.cooperationAmount || 0),
          cooperationAmount: "0",
          paymentDate: application?.paymentDate || "",
          paymentMethod: application?.paymentMethod || "",
          transactionReference: application?.transactionReference || ""
        }
      });
    } catch (e: any) {
      const message = e?.message || "Unable to load member information.";
      setLoadError(message);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function verify() {
    try {
      await apiFetch(`/admin/members/${id}/verify`, { method: "PATCH" }, token || undefined);
      Alert.alert("Verified", "Member is now verified.");
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function resetMemberPassword() {
    if (data?.member?.status !== "verified") {
      Alert.alert("Password reset unavailable", "Only verified members can have their password reset.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Password too short", "Password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords do not match", "New password and confirm password must be the same.");
      return;
    }

    try {
      setResettingPassword(true);
      await apiFetch(`/admin/members/${id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword, confirmPassword })
      }, token || undefined);
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password reset", "The member's password has been updated.");
    } catch (error: any) {
      Alert.alert("Password reset failed", error?.message || "Unable to reset the member's password.");
    } finally {
      setResettingPassword(false);
    }
  }

  function updateAccount(field: "name" | "username", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateApplication<K extends Exclude<keyof ApplicationForm, "familyMembers">>(field: K, value: string) {
    setForm((current) => ({
      ...current,
      application: { ...current.application, [field]: value }
    }));
  }

  function updateFamilyMember(index: number, field: keyof FamilyMemberForm, value: string) {
    setForm((current) => ({
      ...current,
      application: {
        ...current.application,
        familyMembers: current.application.familyMembers.map((family, familyIndex) =>
          familyIndex === index ? { ...family, [field]: value } : family
        )
      }
    }));
  }

  function addFamilyMember() {
    setForm((current) => ({
      ...current,
      application: {
        ...current.application,
        familyMembers: [
          ...current.application.familyMembers,
          { name: "", relation: "", mobile: "", email: "" }
        ]
      }
    }));
  }

  function removeFamilyMember(index: number) {
    setForm((current) => ({
      ...current,
      application: {
        ...current.application,
        familyMembers: current.application.familyMembers.filter((_, familyIndex) => familyIndex !== index)
      }
    }));
  }

  async function saveChanges() {
    if (data?.member?.status !== "verified") {
      setEditing(false);
      Alert.alert("Editing unavailable", "Only verified members can be edited.");
      return;
    }

    if (!form.name.trim() || !form.username.trim()) {
      Alert.alert("Required details", "Member name and username are required.");
      return;
    }

    if (data.application && (!form.application.fullName.trim() || !form.application.mobile.trim() || !form.application.address.trim())) {
      Alert.alert("Required details", "Full name, mobile, and address are required.");
      return;
    }

    try {
      setSaving(true);
      const body: {
        name: string;
        username: string;
        application?: Omit<ApplicationForm, "membershipFee" | "cooperationAmount"> & {
          membershipFee: number;
          cooperationAmount: number;
        };
      } = {
        name: form.name.trim(),
        username: form.username.trim()
      };

      if (data.application) {
        body.application = {
          ...form.application,
          membershipFee: Number(form.application.membershipFee),
          cooperationAmount: Number(form.application.cooperationAmount)
        };
      }

      await apiFetch(`/admin/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      }, token || undefined);
      setEditing(false);
      await load();
      Alert.alert("Saved", "Member information has been updated.");
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Unable to update member information.");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <View style={styles.loading}>
        <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading member information..." />
      </View>
    );
  }

  const { member, application } = data;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Member Details</Text>
      <View style={styles.statusRow}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={[styles.status, member.status === "verified" ? styles.verified : styles.pending]}>
          {member.status.toUpperCase()}
        </Text>
      </View>
      {!editing && member.status === "verified" && (
        <PrimaryButton title="Edit Member Information" secondary onPress={() => setEditing(true)} />
      )}

      <Section title="Account">
        {editing ? (
          <>
            <Field label="Member Name *" value={form.name} onChangeText={(value) => updateAccount("name", value)} />
            <Field label="Username *" value={form.username} onChangeText={(value) => updateAccount("username", value)} autoCapitalize="none" />
          </>
        ) : (
          <>
            <Info label="Name" value={member.name} />
            <Info label="Username" value={member.username} />
          </>
        )}
        <Info label="Password" value="Protected — plaintext passwords are never stored." />
        <Info label="Registered" value={new Date(member.createdAt).toLocaleString()} />
        {member.status === "verified" && (
          <>
            <Text style={styles.passwordResetTitle}>Reset member password</Text>
            <Field
              label="New password *"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="At least 6 characters"
            />
            <Field
              label="Confirm password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter the same password again"
            />
            <PrimaryButton
              title={resettingPassword ? "Resetting..." : "Reset Password"}
              onPress={resetMemberPassword}
              disabled={resettingPassword || !newPassword || !confirmPassword}
              loading={resettingPassword}
            />
          </>
        )}
      </Section>

      {!application ? (
        <Section title="Application"><Text style={styles.muted}>Application not submitted.</Text></Section>
      ) : (
        <>
          <Section title="Personal Information">
            {editing ? (
              <>
                <Field label="Full Name *" value={form.application.fullName} onChangeText={(value) => updateApplication("fullName", value)} />
                <Field label="Father / Husband Name" value={form.application.fatherOrHusbandName} onChangeText={(value) => updateApplication("fatherOrHusbandName", value)} />
                <Field label="Date of Birth" value={form.application.dob} onChangeText={(value) => updateApplication("dob", value)} />
                <Field label="Mobile *" value={form.application.mobile} onChangeText={(value) => updateApplication("mobile", value)} keyboardType="phone-pad" />
                <Field label="WhatsApp" value={form.application.whatsapp} onChangeText={(value) => updateApplication("whatsapp", value)} keyboardType="phone-pad" />
                <Field label="Email" value={form.application.email} onChangeText={(value) => updateApplication("email", value)} keyboardType="email-address" autoCapitalize="none" />
                <Field label="Address *" value={form.application.address} onChangeText={(value) => updateApplication("address", value)} multiline />
                <Field label="City" value={form.application.city} onChangeText={(value) => updateApplication("city", value)} />
                <Field label="District" value={form.application.district} onChangeText={(value) => updateApplication("district", value)} />
                <Field label="State" value={form.application.state} onChangeText={(value) => updateApplication("state", value)} />
                <Field label="PIN Code" value={form.application.pincode} onChangeText={(value) => updateApplication("pincode", value)} keyboardType="number-pad" />
                <Field label="Occupation" value={form.application.occupation} onChangeText={(value) => updateApplication("occupation", value)} />
              </>
            ) : (
              <>
                <Info label="Full Name" value={application.fullName} />
                <Info label="Father / Husband" value={application.fatherOrHusbandName} />
                <Info label="Date of Birth" value={application.dob} />
                <Info label="Mobile" value={application.mobile} />
                <Info label="WhatsApp" value={application.whatsapp} />
                <Info label="Email" value={application.email} />
                <Info label="Address" value={application.address} />
                <Info label="City" value={application.city} />
                <Info label="District" value={application.district} />
                <Info label="State" value={application.state} />
                <Info label="PIN Code" value={application.pincode} />
                <Info label="Occupation" value={application.occupation} />
              </>
            )}
          </Section>

          <Section title="Family Members">
            {editing ? (
              <>
                {form.application.familyMembers.map((family, index) => (
                  <View style={styles.family} key={index}>
                    <Text style={styles.familyTitle}>Member {index + 1}</Text>
                    <Field label="Name" value={family.name} onChangeText={(value) => updateFamilyMember(index, "name", value)} />
                    <Field label="Relation" value={family.relation} onChangeText={(value) => updateFamilyMember(index, "relation", value)} />
                    <Field label="Mobile" value={family.mobile} onChangeText={(value) => updateFamilyMember(index, "mobile", value)} keyboardType="phone-pad" />
                    <Field label="Email" value={family.email} onChangeText={(value) => updateFamilyMember(index, "email", value)} keyboardType="email-address" autoCapitalize="none" />
                    <PrimaryButton title="Remove family member" danger onPress={() => removeFamilyMember(index)} />
                  </View>
                ))}
                <PrimaryButton title="Add family member" secondary onPress={addFamilyMember} />
              </>
            ) : (
              <>
                {(application.familyMembers || []).map((f: any, i: number) => (
                  <View style={styles.family} key={i}>
                    <Text style={styles.familyTitle}>Member {i + 1}</Text>
                    <Info label="Name" value={f.name} />
                    <Info label="Relation" value={f.relation} />
                    <Info label="Mobile" value={f.mobile} />
                    <Info label="Email" value={f.email} />
                  </View>
                ))}
                {(!application.familyMembers || application.familyMembers.length === 0) && <Text style={styles.muted}>None provided.</Text>}
              </>
            )}
          </Section>

          <Section title="Payment">
            {editing ? (
              <>
                <Field label="Membership Fee / Application Amount" value={form.application.membershipFee} onChangeText={(value) => updateApplication("membershipFee", value)} keyboardType="decimal-pad" />
                <Field label="Payment Date" value={form.application.paymentDate} onChangeText={(value) => updateApplication("paymentDate", value)} />
                <Field label="Payment Method" value={form.application.paymentMethod} onChangeText={(value) => updateApplication("paymentMethod", value)} />
                <Field label="UPI Transaction ID" value={form.application.transactionReference} onChangeText={(value) => updateApplication("transactionReference", value)} />
              </>
            ) : (
              <>
                <Info label="Membership Fee / Application Amount" value={`₹${application.membershipFee || application.cooperationAmount || 0}`} />
                <Info label="Payment Date" value={application.paymentDate} />
                <Info label="Payment Method" value={application.paymentMethod} />
                <Info label="UPI Transaction ID" value={application.transactionReference} />
              </>
            )}
            {application.receiptImageUrl ? <Image source={{ uri: application.receiptImageUrl }} style={styles.receipt} /> : null}
          </Section>

          <Section title="Declaration">
            <Text style={styles.declaration}>{application.declarationAccepted ? "Accepted by applicant." : "Not accepted."}</Text>
            <SignaturePad value={application.signatureData || ""} readOnly />
          </Section>
        </>
      )}

      {editing ? (
        <>
          <PrimaryButton title={saving ? "Saving..." : "Save Changes"} onPress={saveChanges} disabled={saving} loading={saving} />
          <PrimaryButton title="Cancel" secondary onPress={() => { setEditing(false); load(); }} disabled={saving} />
        </>
      ) : (
        <>
          {member.status !== "verified" && application && (
            <PrimaryButton title="✓ Verify This Member" onPress={verify} />
          )}
        </>
      )}
      <PrimaryButton title="Back to Members" secondary onPress={() => router.back()} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Info({ label, value }: { label: string; value?: string }) {
  return <View style={styles.info}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value || "—"}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#F3F7FA", padding: 15 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 29, fontWeight: "900", color: "#173C5A", marginBottom: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  memberName: { flex: 1, fontSize: 22, fontWeight: "900", color: "#222" },
  status: { fontSize: 12, fontWeight: "900", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, overflow: "hidden" },
  verified: { color: "#12663A", backgroundColor: "#D0F0DC" },
  pending: { color: "#925600", backgroundColor: "#FFE2AA" },
  section: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: "#0D568B", marginBottom: 9 },
  info: { marginBottom: 9 },
  label: { color: "#777", fontSize: 12, fontWeight: "700" },
  value: { color: "#222", fontSize: 15, marginTop: 2 },
  family: { borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10, marginTop: 5 },
  familyTitle: { fontWeight: "900", color: "#D88700", marginBottom: 7 },
  muted: { color: "#777" },
  receipt: { width: "100%", height: 260, borderRadius: 12, marginTop: 8 },
  declaration: { color: "#4A4A4A", lineHeight: 21 },
  passwordResetTitle: { color: "#0D568B", fontSize: 16, fontWeight: "800", marginTop: 10, marginBottom: 10 }
});
