import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

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

  register: (
    name: string,
    username: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MemberUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /*
   * We intentionally DO NOT restore the login session
   * from SecureStore / AsyncStorage.
   *
   * Login exists only in React memory.
   *
   * Therefore:
   * - App running -> user stays logged in
   * - Navigate between screens -> user stays logged in
   * - Minimize app -> session remains while app process is alive
   * - Completely close/kill app -> session is lost
   * - Open app again -> login screen is shown
   */
  const [loading, setLoading] = useState(true);

  const segments = useSegments();
  const router = useRouter();

  /*
   * Initial authentication state
   *
   * There is no stored session to restore.
   */
  useEffect(() => {
    setLoading(false);
  }, []);

  /*
   * Register device for push notifications after login.
   *
   * Notification registration must never prevent the user
   * from logging in.
   */
  useEffect(() => {
    if (loading || !token) {
      return;
    }

    void registerForPushNotifications(token);
  }, [loading, token]);

  /*
   * Route protection
   */
  useEffect(() => {
    if (loading) {
      return;
    }

    const firstSegment = segments[0];
    const isRootRoute = firstSegment === undefined;
    const isAdminLoginRoute = segments.join("/") === "admin/login";

    const inAuth = firstSegment === "login";

    const inAdmin = firstSegment === "admin";
    const inMember = firstSegment === "member";
    const inNotifications = firstSegment === "notifications";

    /*
     * User is NOT logged in
     */
    if (!token) {
      /*
       * Root landing page and auth pages are allowed.
       */
      if (isRootRoute || inAuth) {
        return;
      }

      /*
       * Allow admin login page.
       */
      if (inAdmin && isAdminLoginRoute) {
        return;
      }

      /*
       * Anything else requires authentication.
       */
      router.replace("/");
      return;
    }

    /*
     * Admin is logged in
     */
    if (isAdmin) {
      if (!inAdmin && !inNotifications) {
        router.replace("/admin/dashboard");
      }

      return;
    }

    /*
     * Member is logged in
     */
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

  /*
   * Save login session ONLY IN MEMORY.
   *
   * Nothing is written to SecureStore.
   * Nothing is written to AsyncStorage.
   */
  function saveSession(
    newToken: string,
    newUser: MemberUser | null,
    admin: boolean
  ) {
    setToken(newToken);
    setUser(newUser);
    setIsAdmin(admin);
  }

  /*
   * Member login
   */
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

    /*
     * Store only in React state.
     */
    saveSession(
      data.token,
      data.user,
      false
    );

    /*
     * Register push notification token.
     * Do not block login if notification registration fails.
     */
    void registerForPushNotifications(data.token);
  }

  /*
   * Admin login
   */
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

    /*
     * Admin user details do not need to be stored.
     * The token tells the backend that this is an admin.
     */
    saveSession(
      data.token,
      null,
      true
    );

    /*
     * Register push notification token.
     */
    void registerForPushNotifications(data.token);
  }

  /*
   * New member registration
   */
  async function register(
    name: string,
    username: string,
    password: string
  ) {
    if (!token || !isAdmin) {
      throw new Error("Only an administrator can register members.");
    }

    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        username,
        password,
      }),
    }, token);
  }

  /*
   * Refresh logged-in member information
   */
  async function refreshUser() {
    if (!token || isAdmin) {
      return;
    }

    const data = await apiFetch<{
      user: MemberUser;
    }>("/auth/me", {}, token);

    setUser(data.user);
  }

  /*
   * Logout
   *
   * Since there is no persistent storage,
   * clearing React state is enough.
   */
  async function logout() {
    setToken(null);
    setUser(null);
    setIsAdmin(false);

    router.replace("/");
  }

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
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return value;
}