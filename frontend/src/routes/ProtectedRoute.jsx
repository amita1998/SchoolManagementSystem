import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function FullScreenMessage({ text }) {
  return (
    <div className="app-loading">
      <div className="app-loading__spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Client-side gate only. Every endpoint it protects is also protected on the
 * server; hiding a route is convenience, never security.
 */
export default function ProtectedRoute({ roles, children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenMessage text="Checking your session…" />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
