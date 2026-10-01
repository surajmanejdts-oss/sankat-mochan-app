import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { registerForPushNotifications } from "@/services/notifications";

export type MemberUser = {
  id: string;
  name: string;
  username: string;
  status: "pending" | "verified";
};

type AuthContextType = {
  token: string | null;
  user: MemberUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = "sankat_mochan_token";
const ROLE_KEY = "sankat_mochan_role";
const USER_KEY = "sankat_mochan_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MemberUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, role, savedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(ROLE_KEY),
          SecureStore.getItemAsync(USER_KEY)
        ]);
        if (savedToken) setToken(savedToken);
        if (role === "admin") setIsAdmin(true);
        if (savedUser) setUser(JSON.parse(savedUser));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || !token) return;
    void registerForPushNotifications(token);
  }, [loading, token]);

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "login" || segments[0] === "register";
    const inAdmin = segments[0] === "admin";
    const inMember = segments[0] === "member";
    const inNotifications = segments[0] === "notifications";

    if (!token) {
      if (inAuth || inAdmin && segments.length > 1) return;
      router.replace("/");
      return;
    }

    if (isAdmin) {
      if (!inAdmin && !inNotifications) router.replace("/admin/dashboard");
    } else if (user) {
      if (!inMember && !inNotifications) router.replace("/member");
    }
  }, [token, user, isAdmin, loading, segments, router]);

  async function saveSession(newToken: string, newUser: MemberUser | null, admin: boolean) {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(ROLE_KEY, admin ? "admin" : "member");
    if (newUser) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
    else await SecureStore.deleteItemAsync(USER_KEY);
    setToken(newToken);
    setUser(newUser);
    setIsAdmin(admin);
  }

  async function login(username: string, password: string) {
    const data = await apiFetch<{ token: string; user: MemberUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    await saveSession(data.token, data.user, false);
    void registerForPushNotifications(data.token);
  }

  async function adminLogin(username: string, password: string) {
    const data = await apiFetch<{ token: string; user: { username: string; role: string } }>(
      "/auth/admin-login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    );
    await saveSession(data.token, null, true);
    void registerForPushNotifications(data.token);
  }

  async function register(name: string, username: string, password: string) {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, username, password })
    });
  }

  async function refreshUser() {
    if (!token || isAdmin) return;
    const data = await apiFetch<{ user: MemberUser }>("/auth/me", {}, token);
    setUser(data.user);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    router.replace("/");
  }

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, loading, login, adminLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
