import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authApi } from "@/services/api";
import { getAccessToken, setAccessToken, setUnauthorizedHandler } from "@/services/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true so routes render a skeleton instead of bouncing through the
  // login screen before the session has been resolved.
  const [loading, setLoading] = useState(true);
  const onUnauthorized = useRef(() => {});

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.me();
      setUser({ sub: data.sub, email: data.email });
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      onUnauthorized.current();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const authenticate = useCallback(
    async (request) => {
      const data = await request();
      setAccessToken(data.access_token, data.expires_in);
      const me = await authApi.me();
      setUser({ sub: me.sub, email: me.email });
      setLoading(false);
      return me;
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login: (email, password) => authenticate(() => authApi.login(email, password)),
      register: (email, password) => authenticate(() => authApi.register(email, password)),
      loginWithGoogle: (idToken) => authenticate(() => authApi.google(idToken)),
      logout: clearSession,
      refresh,
      /** The router registers where to send the user when a 401 arrives. */
      registerUnauthorizedRedirect: (handler) => {
        onUnauthorized.current = handler;
      },
    }),
    [user, loading, authenticate, clearSession, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
