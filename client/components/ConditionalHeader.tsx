import { useLocation } from "react-router-dom";

import Header from "./Header";

const hiddenPaths = new Set(["/login", "/register"]);

export default function ConditionalHeader() {
  const location = useLocation();

  if (hiddenPaths.has(location.pathname)) {
    return null;
  }

  return <Header />;
}
