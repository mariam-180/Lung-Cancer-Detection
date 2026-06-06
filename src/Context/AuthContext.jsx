import { createContext, useState, useContext } from "react";
import axios from "axios";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );
  const [token, setToken] = useState(
    localStorage.getItem("token") || null
  );

  function login(data) {
    const userData = {
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
    };

    setUser(userData);
    setToken(data.token);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
  }

  async function logout() {
    const currentRefreshToken = localStorage.getItem("refreshToken");
    const currentToken = localStorage.getItem("token");

    // Tell the API to invalidate the refresh token so it can never be reused
    if (currentRefreshToken && currentToken) {
      try {
        await axios.post(
          "https://lungcancer.runasp.net/api/Auth/revoke-token",
          JSON.stringify(currentRefreshToken), // API expects a raw string body
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (err) {
        // Even if revoke fails, we still clear everything locally
        console.warn("Revoke token failed:", err?.response?.status);
      }
    }

    // Always clear local state regardless of API result
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }

  function updateUser(updatedFields) {
    setUser(prev => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }

  async function refreshAccessToken() {
    const currentToken = localStorage.getItem("token");
    const currentRefreshToken = localStorage.getItem("refreshToken");

    if (!currentToken || !currentRefreshToken) {
      logout();
      return null;
    }

    try {
      const response = await axios.post(
        "https://lungcancer.runasp.net/api/Auth/refresh-token",
        {
          token: currentToken,
          refreshToken: currentRefreshToken,
        }
      );

      const data = response.data.data;

      setToken(data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);

      return data.token;
    } catch (err) {
      logout();
      return null;
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}