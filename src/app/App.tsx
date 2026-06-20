import { StoreProvider, useStore } from "./lib/store";
import { AppShell } from "./components/shell/AppShell";
import { Router } from "./components/Router";
import { Login } from "./components/Login";
import { Toaster } from "./components/ui/sonner";

function Root() {
  const { authed } = useStore();
  return authed ? (
    <AppShell>
      <Router />
    </AppShell>
  ) : (
    <Login />
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
      <Toaster position="top-center" richColors />
    </StoreProvider>
  );
}
