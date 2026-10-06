import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import { DataRequestStatus } from "@/components/DataRequestStatus";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type ReportMember = {
  _id: string;
  name: string;
  username: string;
  status: "pending" | "verified";
  createdAt: string;
  application?: {
    fullName?: string;
    mobile?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
  } | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character] || character);
}

function memberContact(member: ReportMember) {
  const application = member.application;
  return application?.mobile || application?.whatsapp || application?.email || "Not provided";
}

function memberNumber(member: ReportMember) {
  return member.application?.mobile || member.application?.whatsapp || "Not provided";
}

function memberAddress(member: ReportMember) {
  const application = member.application;
  return [
    application?.address,
    application?.city,
    application?.district,
    application?.state,
    application?.pincode
  ].filter(Boolean).join(", ") || "Not provided";
}

function createReportHtml(members: ReportMember[], logoDataUri: string) {
  const rows = members.map((member, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(member.application?.fullName || member.name || "—")}</td>
      <td>${escapeHtml(memberNumber(member))}</td>
      <td>${escapeHtml(memberAddress(member))}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 18mm 14mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, "Noto Sans Devanagari", sans-serif; color: #243746; font-size: 10pt; }
          .report-header { text-align: center; margin-bottom: 22px; }
          h1 { margin: 0 0 10px; color: #0D568B; font-size: 22pt; }
          .logo { display: block; width: 90px; height: 90px; object-fit: contain; margin: 0 auto 8px; }
          .organization { margin: 0; color: #153E60; font-size: 15pt; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { background: #0D568B; color: white; text-align: left; }
          th:first-child, td:first-child { text-align: center; }
          th, td { border: 1px solid #D8E2E8; padding: 8px; vertical-align: top; overflow-wrap: anywhere; }
          th:nth-child(1) { width: 8%; }
          th:nth-child(2) { width: 25%; }
          th:nth-child(3) { width: 22%; }
          th:nth-child(4) { width: 45%; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <header class="report-header">
          <img class="logo" src="${logoDataUri}" alt="Sankat Mochan logo" />
          <h1>Members Report</h1>
          <p class="organization">श्री संकट मोचण सेवार्थ संस्था</p>
        </header>
        <table>
          <thead><tr><th>Sr. No.</th><th>Name</th><th>Number</th><th>Address</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
}

export default function AdminReports() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [members, setMembers] = useState<ReportMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const initialLoad = !hasLoadedRef.current;
    if (initialLoad) setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<{ members: ReportMember[] }>(
        "/admin/members",
        {},
        token || undefined
      );
      setMembers(data.members || []);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (error: any) {
      const message = error?.message || "Unable to load member report information.";
      setLoadError(message);
      Alert.alert("Reports", message);
    } finally {
      if (initialLoad) setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return members;
    return members.filter((member) => [
      member.name,
      member.username,
      member.application?.mobile,
      member.application?.whatsapp,
      member.application?.email,
      member.application?.city,
      member.application?.district
    ].some((value) => value?.toLocaleLowerCase().includes(query)));
  }, [members, search]);

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.includes(member._id)),
    [members, selectedIds]
  );
  const verifiedCount = members.filter((member) => member.status === "verified").length;
  const pendingCount = members.filter((member) => member.status === "pending").length;
  const filteredVerified = filteredMembers.filter((member) => member.status === "verified");
  const filteredPending = filteredMembers.filter((member) => member.status === "pending");
  const allFilteredVerifiedSelected = filteredVerified.length > 0 &&
    filteredVerified.every((member) => selectedIds.includes(member._id));
  const allFilteredPendingSelected = filteredPending.length > 0 &&
    filteredPending.every((member) => selectedIds.includes(member._id));

  function toggleMember(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((memberId) => memberId !== id)
      : [...current, id]);
  }

  function toggleFilteredStatus(status: ReportMember["status"]) {
    const matchingIds = filteredMembers
      .filter((member) => member.status === status)
      .map((member) => member._id);
    const allMatchingSelected = matchingIds.length > 0 &&
      matchingIds.every((id) => selectedIds.includes(id));

    if (allMatchingSelected) {
      setSelectedIds((current) => current.filter((id) => !matchingIds.includes(id)));
    } else {
      setSelectedIds((current) => [
        ...current,
        ...matchingIds.filter((id) => !current.includes(id))
      ]);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function downloadPdf() {
    if (!selectedMembers.length) {
      Alert.alert("Select members", "Select at least one member to create a report.");
      return;
    }
    try {
      setExporting(true);
      const logoAsset = Asset.fromModule(require("../../assets/logo.png"));
      await logoAsset.downloadAsync();
      if (!logoAsset.localUri) {
        throw new Error("The app logo could not be loaded for the report.");
      }
      const logoBase64 = await FileSystem.readAsStringAsync(
        logoAsset.localUri,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      const file = await Print.printToFileAsync({
        html: createReportHtml(selectedMembers, `data:image/png;base64,${logoBase64}`),
        base64: true
      });
      if (!file.base64) {
        throw new Error("The PDF was created without readable file data.");
      }
      if (!FileSystem.documentDirectory) {
        throw new Error("The app's document storage is unavailable.");
      }

      const reportUri = `${FileSystem.documentDirectory}member-report-${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(
        reportUri,
        file.base64,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("PDF created", `The report was saved in app storage at ${reportUri}, but sharing is not available on this device.`);
        return;
      }
      await Sharing.shareAsync(reportUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Download member report"
      });
    } catch (error: any) {
      Alert.alert("PDF export failed", error?.message || "Unable to create the member report PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
      <Text style={styles.title}>Member Reports</Text>
      <Text style={styles.subtitle}>Search members, select the accounts to include, and export one PDF.</Text>

      {!hasLoaded ? (
        <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading report data..." />
      ) : (
        <>
          <View style={styles.metrics}>
            <Metric label="Total members" value={members.length} />
            <Metric label="Verified" value={verifiedCount} />
            <Metric label="Pending" value={pendingCount} />
          </View>

          <View style={styles.listCard}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, username, phone, email, or city"
              placeholderTextColor="#82909A"
              style={styles.search}
              accessibilityLabel="Search members"
            />
            <View style={styles.selectionRow}>
              <Text style={styles.selectedCount}>{selectedIds.length} selected</Text>
            </View>
            <View style={styles.statusSelectionRow}>
              <Pressable
                onPress={() => toggleFilteredStatus("verified")}
                disabled={!filteredVerified.length}
                style={[styles.statusSelection, styles.verifiedSelection, !filteredVerified.length && styles.disabled]}
              >
                <Text style={[styles.statusSelectionText, styles.verifiedSelectionText]}>
                  {allFilteredVerifiedSelected ? "Clear verified" : `Select verified (${filteredVerified.length})`}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => toggleFilteredStatus("pending")}
                disabled={!filteredPending.length}
                style={[styles.statusSelection, styles.pendingSelection, !filteredPending.length && styles.disabled]}
              >
                <Text style={[styles.statusSelectionText, styles.pendingSelectionText]}>
                  {allFilteredPendingSelected ? "Clear pending" : `Select pending (${filteredPending.length})`}
                </Text>
              </Pressable>
            </View>

            {members.length === 0 ? (
              <Text style={styles.empty}>No member information was found.</Text>
            ) : filteredMembers.length === 0 ? (
              <Text style={styles.empty}>No members match your search.</Text>
            ) : filteredMembers.map((member) => {
              const selected = selectedIds.includes(member._id);
              return (
                <Pressable
                  key={member._id}
                  onPress={() => toggleMember(member._id)}
                  style={[styles.memberRow, selected && styles.memberSelected]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                    {selected && <Text style={styles.check}>✓</Text>}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberUsername}>@{member.username}</Text>
                    <Text style={styles.memberContact}>{memberContact(member)}</Text>
                  </View>
                  <Text style={[styles.status, member.status === "verified" ? styles.verified : styles.pending]}>
                    {member.status.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

        </>
      )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <PrimaryButton
          title="Back"
          secondary
          onPress={() => router.replace("/admin/dashboard")}
          style={styles.footerButton}
        />
        <PrimaryButton
          title={exporting ? "Preparing..." : `Download PDF (${selectedMembers.length})`}
          onPress={downloadPdf}
          disabled={!hasLoaded || exporting || !selectedMembers.length}
          loading={exporting}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F7FA" },
  scroll: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#F3F7FA", padding: 16, paddingBottom: 24 },
  footer: { flexDirection: "row", gap: 8, backgroundColor: "#F3F7FA", paddingHorizontal: 12, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#E1E8EC" },
  footerButton: { flex: 1, minWidth: 0, marginVertical: 2, paddingHorizontal: 8 },
  title: { color: "#173C5A", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#66737B", lineHeight: 20, marginTop: 4, marginBottom: 16 },
  metrics: { flexDirection: "row", gap: 9, marginBottom: 14 },
  metric: { flex: 1, minWidth: 0, backgroundColor: "#fff", borderRadius: 13, paddingVertical: 15, paddingHorizontal: 6, alignItems: "center", elevation: 2 },
  metricValue: { color: "#0D568B", fontSize: 25, fontWeight: "900" },
  metricLabel: { color: "#66737B", fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 3 },
  listCard: { backgroundColor: "#fff", borderRadius: 15, padding: 13, marginBottom: 14, elevation: 2 },
  search: { backgroundColor: "#F6F8F9", borderColor: "#D5E0E5", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: "#20333F" },
  selectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  selectedCount: { color: "#52616A", fontWeight: "700" },
  statusSelectionRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  statusSelection: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 6, borderRadius: 9 },
  statusSelectionText: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  verifiedSelection: { backgroundColor: "#E1F3E8" },
  verifiedSelectionText: { color: "#12663A" },
  pendingSelection: { backgroundColor: "#FFF0D2" },
  pendingSelectionText: { color: "#925600" },
  disabled: { opacity: 0.45 },
  memberRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#E9EEF0", paddingVertical: 12, gap: 10 },
  memberSelected: { backgroundColor: "#F1F8FC" },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: "#9AAAB3", borderRadius: 5, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#0D568B", borderColor: "#0D568B" },
  check: { color: "#fff", fontSize: 14, fontWeight: "900" },
  memberInfo: { flex: 1 },
  memberName: { color: "#20333F", fontSize: 15, fontWeight: "800" },
  memberUsername: { color: "#6C7B84", fontSize: 12, marginTop: 2 },
  memberContact: { color: "#6C7B84", fontSize: 11, marginTop: 3 },
  status: { overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontWeight: "900" },
  verified: { color: "#12663A", backgroundColor: "#D0F0DC" },
  pending: { color: "#925600", backgroundColor: "#FFE2AA" },
  empty: { color: "#77848B", textAlign: "center", paddingVertical: 24 }
});
