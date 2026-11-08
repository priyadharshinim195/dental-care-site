import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest, AUTH_EXPIRED_EVENT, refreshSession, setAccessToken } from "../lib/api";

const AuthContext = createContext(null);

/* Session restore: a page reload exchanges the HttpOnly refresh cookie for a new access token.
   The access token itself is never written to localStorage or sessionStorage. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((data) => active && setUser(data.user))
      .catch(() => active && setUser(null))
      .finally(() => active && setStatus("ready"));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const expire = () => {
      setAccessToken(null);
      setUser(null);
      setStatus("ready");
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiRequest("/auth/login/", { method: "POST", json: { username, password } });
    setAccessToken(data.access);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/auth/logout/", { method: "POST" });
    } catch {
      // Even if the server is unreachable, drop the local session.
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, status, login, logout, setUser }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useCanEdit() {
  const { user } = useAuth();
  return Boolean(user && user.role !== "viewer");
}

export function RequireAuth({ children }) {
  const { user, status } = useAuth();
  if (status === "checking") {
    return <div className="adm-loading" role="status">Checking your session…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
