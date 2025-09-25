import Header from "./Header";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function ConditionalHeader() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();

  // Never show header on login or register pages
  const isAuthPage =
    location.pathname === "/" || location.pathname === "/register";

  // Protected pages that require authentication
  const isProtectedPage =
    location.pathname === "/home" ||
    location.pathname === "/bienestar" ||
    location.pathname === "/formacion" ||
    location.pathname === "/politica-cookies" ||
    location.pathname === "/aviso-privacidad";

  // Auto-login if user is on a protected page (simulates successful login)
  useEffect(() => {
    if (isProtectedPage && !isAuthenticated) {
      login();
    }
  }, [isProtectedPage, isAuthenticated, login]);

  // Show header if authenticated and not on auth pages, OR if on protected pages
  const shouldShowHeader = (isAuthenticated && !isAuthPage) || isProtectedPage;

  return shouldShowHeader ? <Header /> : null;
}
