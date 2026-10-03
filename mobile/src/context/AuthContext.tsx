import * as SecureStore from "expo-secure-store";
<<<<<<< HEAD
import { Platform } from "react-native";
import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiFetch } from "@/lib/api";
import { registerForPushNotifications } from "@/services/notifications";

/* =========================================================
   TYPES
========================================================= */

=======
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { registerForPushNotifications } from "@/services/notifications";

>>>>>>> caae93ef0c476314d07c125b77e624082713f232
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
<<<<<<< HEAD

  login: (username: string, password: string) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;

  register: (
    name: string,
    username: string,
    password: string
  ) => Promise<void>;

=======
  login: (username: string, password: string) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

<<<<<<< HEAD
/* =========================================================
   CONTEXT
========================================================= */

const AuthContext = createContext<AuthContextType | null>(null);

/* =========================================================
   STORAGE KEYS
========================================================= */

=======
const AuthContext = createContext<AuthContextType | null>(null);
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
const TOKEN_KEY = "sankat_mochan_token";
const ROLE_KEY = "sankat_mochan_role";
const USER_KEY = "sankat_mochan_user";

<<<<<<< HEAD
/* =========================================================
   CROSS-PLATFORM STORAGE
   Android/iOS -> Expo SecureStore
   Web          -> localStorage
========================================================= */

async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return null;
      }

      return window.localStorage.getItem(key);
    }

    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Storage get error for ${key}:`, error);
    return null;
  }
}

async function setStorageItem(
  key: string,
  value: string
): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, value);
      }

      return;
    }

    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Storage set error for ${key}:`, error);
    throw error;
  }
}

async function deleteStorageItem(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }

      return;
    }

    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Storage delete error for ${key}:`, error);
  }
}

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
=======
export function AuthProvider({ children }: { children: React.ReactNode }) {
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MemberUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD

  const segments = useSegments();
  const router = useRouter();

  /* =======================================================
     RESTORE LOGIN SESSION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const [savedToken, role, savedUser] =
          await Promise.all([
            getStorageItem(TOKEN_KEY),
            getStorageItem(ROLE_KEY),
            getStorageItem(USER_KEY),
          ]);

        if (!mounted) {
          return;
        }

        if (savedToken) {
          setToken(savedToken);
        } else {
          setToken(null);
        }

        if (role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }

        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);

            setUser(parsedUser);
          } catch (error) {
            console.error(
              "Invalid saved user data:",
              error
            );

            await deleteStorageItem(USER_KEY);

            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error(
          "Failed to restore session:",
          error
        );

        if (mounted) {
          setToken(null);
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     PUSH NOTIFICATIONS
  ======================================================= */

  useEffect(() => {
    if (loading || !token) {
      return;
    }

    /*
     * Do not block authentication if notification
     * registration fails.
     */
    void registerForPushNotifications(token);
  }, [loading, token]);

  /* =======================================================
     ROUTE PROTECTION
  ======================================================= */

  useEffect(() => {
    if (loading) {
      return;
    }

    const firstSegment = segments[0];

    const inAuth =
      firstSegment === "login" ||
      firstSegment === "register";

    const inAdmin = firstSegment === "admin";
    const inMember = firstSegment === "member";
    const inNotifications =
      firstSegment === "notifications";

    /* =====================================================
       NOT LOGGED IN
    ===================================================== */

    if (!token) {
      /*
       * Login/register pages are accessible
       */
      if (inAuth) {
        return;
      }

      /*
       * Allow admin login page.
       *
       * Example:
       * /admin/login
       */
      if (inAdmin && segments.length > 1) {
        return;
      }

      router.replace("/");

      return;
    }

    /* =====================================================
       ADMIN LOGGED IN
    ===================================================== */

    if (isAdmin) {
      if (!inAdmin && !inNotifications) {
        router.replace("/admin/dashboard");
      }

      return;
    }

    /* =====================================================
       MEMBER LOGGED IN
    ===================================================== */

    if (user) {
      if (!inMember && !inNotifications) {
        router.replace("/member");
      }

      return;
    }
  }, [
    token,
    user,
    isAdmin,
    loading,
    segments,
    router,
  ]);

  /* =======================================================
     SAVE SESSION
  ======================================================= */

  async function saveSession(
    newToken: string,
    newUser: MemberUser | null,
    admin: boolean
  ) {
    /*
     * Save authentication token
     */
    await setStorageItem(
      TOKEN_KEY,
      newToken
    );

    /*
     * Save role
     */
    await setStorageItem(
      ROLE_KEY,
      admin ? "admin" : "member"
    );

    /*
     * Save user
     */
    if (newUser) {
      await setStorageItem(
        USER_KEY,
        JSON.stringify(newUser)
      );
    } else {
      await deleteStorageItem(USER_KEY);
    }

    /*
     * Update React state
     */
=======
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
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
    setToken(newToken);
    setUser(newUser);
    setIsAdmin(admin);
  }

<<<<<<< HEAD
  /* =======================================================
     MEMBER LOGIN
  ======================================================= */

  async function login(
    username: string,
    password: string
  ) {
    const data = await apiFetch<{
      token: string;
      user: MemberUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
      }),
    });

    await saveSession(
      data.token,
      data.user,
      false
    );

    /*
     * Notification registration should not
     * prevent successful login.
     */
    void registerForPushNotifications(
      data.token
    );
  }

  /* =======================================================
     ADMIN LOGIN
  ======================================================= */

  async function adminLogin(
    username: string,
    password: string
  ) {
    const data = await apiFetch<{
      token: string;
      user: {
        username: string;
        role: string;
      };
    }>("/auth/admin-login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
      }),
    });

    await saveSession(
      data.token,
      null,
      true
    );

    /*
     * Notification registration should not
     * prevent successful login.
     */
    void registerForPushNotifications(
      data.token
    );
  }

  /* =======================================================
     REGISTER MEMBER
  ======================================================= */

  async function register(
    name: string,
    username: string,
    password: string
  ) {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        username,
        password,
      }),
    });
  }

  /* =======================================================
     REFRESH USER
  ======================================================= */

  async function refreshUser() {
    if (!token || isAdmin) {
      return;
    }

    const data = await apiFetch<{
      user: MemberUser;
    }>("/auth/me", {}, token);

    setUser(data.user);

    await setStorageItem(
      USER_KEY,
      JSON.stringify(data.user)
    );
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {
    try {
      await deleteStorageItem(TOKEN_KEY);
      await deleteStorageItem(ROLE_KEY);
      await deleteStorageItem(USER_KEY);
    } catch (error) {
      console.error(
        "Logout storage error:",
        error
      );
    }

    setToken(null);
    setUser(null);
    setIsAdmin(false);

    router.replace("/");
  }

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAdmin,
        loading,
        login,
        adminLogin,
        register,
        logout,
        refreshUser,
      }}
    >
=======
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
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
      {children}
    </AuthContext.Provider>
  );
}

<<<<<<< HEAD
/* =========================================================
   useAuth HOOK
========================================================= */

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return value;
}
=======
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
