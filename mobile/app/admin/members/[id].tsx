import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<{ member: any; application: any }>(`/admin/members/${id}`, {}, token || undefined);
      setData(result);
    } catch (e: any) {
      Alert.alert("Error", e.message);
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

  if (!data) return <View style={styles.loading}><Text>Loading member...</Text></View>;

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

      <Section title="Account">
        <Info label="Name" value={member.name} />
        <Info label="Username" value={member.username} />
        <Info label="Password" value="Protected — plaintext passwords are never stored." />
        <Info label="Registered" value={new Date(member.createdAt).toLocaleString()} />
      </Section>

      {!application ? (
        <Section title="Application"><Text style={styles.muted}>Application not submitted.</Text></Section>
      ) : (
        <>
          <Section title="Personal Information">
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
          </Section>

          <Section title="Family Members">
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
          </Section>

          <Section title="Payment">
            <Info label="Membership Fee" value={`₹${application.membershipFee || 500}`} />
            <Info label="Cooperation Amount" value={`₹${application.cooperationAmount || 200}`} />
            <Info label="Payment Date" value={application.paymentDate} />
            <Info label="Payment Method" value={application.paymentMethod} />
            <Info label="Transaction Reference" value={application.transactionReference} />
            {application.receiptImageUrl ? <Image source={{ uri: application.receiptImageUrl }} style={styles.receipt} /> : null}
          </Section>

          <Section title="Declaration">
            <Text style={styles.declaration}>{application.declarationAccepted ? "Accepted by applicant." : "Not accepted."}</Text>
          </Section>
        </>
      )}

      {member.status !== "verified" && <PrimaryButton title="✓ Verify This Member" onPress={verify} />}
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
  declaration: { color: "#4A4A4A", lineHeight: 21 }
});
