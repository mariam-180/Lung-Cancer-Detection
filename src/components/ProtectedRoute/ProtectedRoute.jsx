import { Navigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, token } = useAuth();

  // Still loading from localStorage → wait
  if (token === undefined || user === undefined) {
    return null;
  }

  // Not logged in → go to login
  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  // Wrong role → go to notfound
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/notfound" />;
  }

  // ✅ Authorized
  return children;
}