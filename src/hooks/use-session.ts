import { useSyncExternalStore } from "react";
import { services } from "@/services";

export function useSession() {
  return useSyncExternalStore(
    services.auth.subscribe,
    services.auth.getSession,
    () => null,
  );
}
