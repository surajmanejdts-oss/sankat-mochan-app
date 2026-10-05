import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataRequestStatus } from "@/components/DataRequestStatus";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Member = {
  id: string;
  name: string;
  username: string;
  phone: string;
  status: "pending" | "verified";
};

export default function AdminReceipts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const membersLoadedRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const loadMembers = useCallback(async () => {
    const initialLoad = !membersLoadedRef.current;
    if (initialLoad) setLoadingMembers(true);
    setMembersError(null);
    try {
      const data = await apiFetch<{ members: Member[] }>(
        "/admin/receipt-recipients",
        {},
        token || undefined
      );
      setMembers((data.members || []).filter((member) => member.status === "verified"));
      membersLoadedRef.current = true;
      setMembersLoaded(true);
    } catch (e: any) {
      const message = e?.message || "Unable to load members.";
      setMembersError(message);
      Alert.alert("Members", message);
    } finally {
      if (initialLoad) setLoadingMembers(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const query = search.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const phoneQuery = search.replace(/\D/g, "");
  const filteredMembers = query
    ? members.filter((member) =>
        member.name.toLocaleLowerCase().replace(/\s+/g, " ").includes(query) ||
        member.username.toLocaleLowerCase().includes(query) ||
        (phoneQuery.length > 0 && member.phone.replace(/\D/g, "").includes(phoneQuery))
      )
    : members;

  const allVisibleSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((member) => selected.includes(member.id));

  function toggleMember(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleAllVisible() {
    const visibleIds = filteredMembers.map((member) => member.id);

    if (visibleIds.length === 0) return;

    if (visibleIds.every((id) => selected.includes(id))) {
      setSelected((current) =>
        current.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelected((current) => [
        ...current,
        ...visibleIds.filter((id) => !current.includes(id))
      ]);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await loadMembers();
    } finally {
      setRefreshing(false);
    }
  }

  async function sendReceipt() {
    if (!selected.length) {
      Alert.alert("Select members", "Select at least one member.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Receipt title", "Enter a title for the receipt.");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Receipt description", "Enter a description for the receipt.");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      Alert.alert("Receipt amount", "Enter a valid amount, for example 500.");
      return;
    }

    try {
      setSending(true);

      const data = await apiFetch<{ count: number; message: string }>(
        "/admin/receipts",
        {
          method: "POST",
          body: JSON.stringify({
            userIds: selected,
            title: title.trim(),
            description: description.trim(),
            amount: numericAmount,
          })
        },
        token || undefined
      );

      Alert.alert("Receipt sent", data.message);
      setSelected([]);
      setTitle("");
      setDescription("");
      setAmount("");
    } catch (e: any) {
      Alert.alert("Send receipt failed", e?.message || "Unable to send receipt.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
      <Text style={styles.title}>Send Receipt</Text>
      <Text style={styles.subtitle}>
        Create one receipt and send an individual copy to one or many members.
        Each selected member will receive a notification.
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Receipt Details</Text>

        <Field
          label="Title *"
          placeholder="Receipt title"
          value={title}
          onChangeText={setTitle}
        />

        <Field
          label="Description *"
          placeholder="Receipt description"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Field
          label="Amount (INR) *"
          placeholder="Example: 500"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Select Members</Text>
            <View style={styles.selectionRow}>
              <Text style={styles.selectionText}>
                {selected.length} selected of {members.length}
              </Text>
              <Pressable
                onPress={() => setSelected([])}
                disabled={sending || selected.length === 0}
                accessibilityRole="button"
              >
                <Text style={[styles.clearSelection, (sending || selected.length === 0) && styles.disabled]}>
                  Clear
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.selectAll} onPress={toggleAllVisible}>
            <View
              style={[
                styles.checkbox,
                allVisibleSelected && styles.checkboxSelected
              ]}
            >
              {allVisibleSelected ? (
                <Text style={styles.check}>✓</Text>
              ) : null}
            </View>
            <Text style={styles.selectAllText}>Select All</Text>
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by member name or phone number"
          placeholderTextColor="#8A8A8A"
          style={styles.search}
        />

        {membersLoaded && search.trim() ? (
          <Text style={styles.searchHint}>
            Showing {filteredMembers.length} matching member
            {filteredMembers.length === 1 ? "" : "s"}.
          </Text>
        ) : null}

        {!membersLoaded ? (
          <DataRequestStatus
            loading={loadingMembers}
            error={membersError}
            onRetry={loadMembers}
            message="Loading verified members..."
          />
        ) : filteredMembers.map((member) => {
          const checked = selected.includes(member.id);

          return (
            <Pressable
              key={member.id}
              onPress={() => toggleMember(member.id)}
              style={[styles.memberRow, checked && styles.memberSelected]}
            >
              <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
                {checked ? <Text style={styles.check}>✓</Text> : null}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta}>
                  @{member.username}
                  {member.phone ? ` • ${member.phone}` : " • Phone not provided"}
                </Text>
              </View>

              <Text
                style={[
                  styles.status,
                  member.status === "verified"
                    ? styles.verified
                    : styles.pending
                ]}
              >
                {member.status.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}

        {membersLoaded && filteredMembers.length === 0 && (
          <Text style={styles.empty}>
            {search.trim() ? "No members match your search." : "No verified member information was found."}
          </Text>
        )}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Ready to send</Text>
        <Text style={styles.summaryText}>
          {selected.length} receiver{selected.length === 1 ? "" : "s"} selected
          {amount ? ` • ₹${Number(amount || 0).toLocaleString("en-IN")} each` : ""}
        </Text>
        <Text style={styles.summaryNote}>
          Each selected member receives an individual receipt with their name.
        </Text>
      </View>

      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <PrimaryButton
          title="Back"
          secondary
          onPress={() => router.replace("/admin/dashboard")}
          disabled={sending}
          style={styles.footerButton}
        />
        <PrimaryButton
          title={sending ? "Sending..." : `Send (${selected.length})`}
          onPress={sendReceipt}
          disabled={sending || !membersLoaded || selected.length === 0}
          loading={sending}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F7FA"
  },
  scroll: {
    flex: 1
  },
  page: {
    flexGrow: 1,
    backgroundColor: "#F3F7FA",
    padding: 15,
    paddingBottom: 24
  },
  title: {
    fontSize: 29,
    fontWeight: "900",
    color: "#173C5A"
  },
  subtitle: {
    color: "#777",
    lineHeight: 20,
    marginTop: 3,
    marginBottom: 14
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 13
  },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 13
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#173C5A"
  },
  fieldLabel: {
    color: "#173C5A",
    fontWeight: "700",
    marginBottom: 8
  },
  paymentModes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  paymentMode: {
    minHeight: 40,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A9C0D0",
    backgroundColor: "#F9FCFD",
    paddingHorizontal: 12,
    borderRadius: 8
  },
  paymentModeSelected: {
    borderColor: "#0D568B",
    backgroundColor: "#E7F2F8"
  },
  paymentModeText: { color: "#354B5A", fontWeight: "700" },
  paymentModeTextSelected: { color: "#0D568B" },
  selectionText: {
    color: "#777",
    marginTop: 2,
    fontSize: 12
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  clearSelection: {
    color: "#0D568B",
    fontSize: 12,
    fontWeight: "800",
    padding: 8
  },
  disabled: {
    opacity: 0.45
  },
  selectAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 8
  },
  selectAllText: {
    color: "#0D568B",
    fontWeight: "900",
    fontSize: 13
  },
  search: {
    borderWidth: 1,
    borderColor: "#A9C0D0",
    backgroundColor: "#F9FCFD",
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: "#15212B",
    marginBottom: 8
  },
  searchHint: {
    color: "#777",
    fontSize: 12,
    marginBottom: 7
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
    paddingVertical: 12,
    gap: 10
  },
  memberSelected: {
    backgroundColor: "#F0F8FF",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CB1BE",
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxSelected: {
    backgroundColor: "#0D568B",
    borderColor: "#0D568B"
  },
  check: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16
  },
  memberName: {
    color: "#222",
    fontSize: 15,
    fontWeight: "900"
  },
  memberMeta: {
    color: "#777",
    fontSize: 11,
    marginTop: 3
  },
  status: {
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden"
  },
  verified: {
    color: "#12663A",
    backgroundColor: "#D9F4E5"
  },
  pending: {
    color: "#925600",
    backgroundColor: "#FFE8BD"
  },
  empty: {
    textAlign: "center",
    color: "#777",
    paddingVertical: 25
  },
  summary: {
    backgroundColor: "#FFF4D6",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8C56D",
    marginBottom: 5
  },
  summaryTitle: {
    color: "#7B5200",
    fontWeight: "900"
  },
  summaryText: {
    color: "#6A5A35",
    marginTop: 3
  },
  summaryNote: {
    color: "#6A5A35",
    fontSize: 12,
    marginTop: 7
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F3F7FA",
    paddingHorizontal: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E1E8EC"
  },
  footerButton: {
    flex: 1,
    minWidth: 0,
    marginVertical: 2,
    paddingHorizontal: 8
  }
});
