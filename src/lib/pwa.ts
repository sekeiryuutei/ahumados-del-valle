/** Preview must never retain an app-shell worker or stale deployment chunks. */
export function shouldRegisterWorker(production: boolean, hostname: string, inFrame: boolean, search: string) {
  const host = hostname.toLowerCase();
  const label = host.split(".")[0] ?? "";
  const managed = ["lovable.app", "gpt-eng.com", "gptengineer.run"].some(domain => host.endsWith(`.${domain}`));
  const preview = (managed && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label) || /^project--.+-dev$/.test(label))) || ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(domain => host === domain || host.endsWith(`.${domain}`));
  return production && !inFrame && !preview && new URLSearchParams(search).get("sw") !== "off";
}

export async function initializePwa() {
  if (!("serviceWorker" in navigator)) return;
  if (!shouldRegisterWorker(import.meta.env.PROD, window.location.hostname.toLowerCase(), window.self !== window.top, location.search)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r => [r.active, r.waiting, r.installing].some(worker => worker && new URL(worker.scriptURL).origin === location.origin && new URL(worker.scriptURL).pathname === "/sw.js")).map(r => r.unregister()));
    return;
  }
  const registration = await navigator.serviceWorker.register("/sw.js");
  await registration.update();
}