// 关联业务：组装管理端工作台，以及未登录状态下的登录、供应商激活和小区注册入口。
import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { AppShell } from "./components/shell/AppShell";
import { Router } from "./components/Router";
import { Login } from "./components/Login";
import { Toaster } from "./components/ui/sonner";
import { CommunityRegistrationEntry } from "./components/CommunityRegistrationEntry";

const COMMUNITY_REGISTRATION_HASH = "#/community-registration";

function Root() {
  const { authed } = useStore();
  const [publicPage, setPublicPage] = useState(window.location.hash);

  useEffect(() => {
    const syncHash = () => setPublicPage(window.location.hash);
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  if (authed) {
    return (
      <AppShell>
        <Router />
      </AppShell>
    );
  }
  if (publicPage === COMMUNITY_REGISTRATION_HASH) {
    return <CommunityRegistrationEntry onBack={() => { window.location.hash = ""; }} />;
  }
  return <Login onCommunityRegistration={() => { window.location.hash = COMMUNITY_REGISTRATION_HASH; }} />;
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
      <Toaster position="top-center" richColors />
    </StoreProvider>
  );
}
