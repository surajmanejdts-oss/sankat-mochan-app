import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export function LogoHeader({
  compact = false,
  showTagline = true,
  showOrganizationName = true
}: {
  compact?: boolean;
  showTagline?: boolean;
  showOrganizationName?: boolean;
}) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Image source={require("../../assets/logo.png")} style={compact ? styles.logoSmall : styles.logo} />
      {!compact && (
        <>
          {showOrganizationName && (
            <>
              <Text style={styles.title}>Shri Sankat Mochan</Text>
              <Text style={styles.subtitle}>Sevarth Sanstha</Text>
            </>
          )}
          {showTagline && <Text style={styles.tagline}>Humanity • Cooperation • Service</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: 18 },
  compact: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logo: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  logoSmall: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  title: { fontSize: 27, fontWeight: "800", color: "#D88700", textAlign: "center" },
  subtitle: { fontSize: 21, fontWeight: "800", color: "#1C5D93", textAlign: "center" },
  tagline: { marginTop: 6, color: "#6B4A18", fontWeight: "600" }
});
