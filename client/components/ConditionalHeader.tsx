import { useLocation } from "react-router-dom";

import Header from "./Header";
import { useAuth } from "@/context/AuthContext";

export default function ConditionalHeader() {
  const location = useLocation();
  const { isAuthEnabled } = useAuth();

  if (
    isAuthEnabled &&
    (location.pathname === "/login" ||
      location.pathname === "/register" ||
      location.pathname === "/profile")
  ) {
    return null;
  }

  return <Header />;
}
