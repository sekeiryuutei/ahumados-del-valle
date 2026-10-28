/** Preview must never retain an app-shell worker or stale deployment chunks. */
export function shouldRegisterWorker(
  production: boolean,
  hostname: string,
  inFrame: boolean,
  search: string,
) {
  const host = hostname.toLowerCase();
  const label = host.split(".")[0] ?? "";
  const preview =
    /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label) || /^project--.+-dev$/.test(label);
  return production && !inFrame && !preview && new URLSearchParams(search).get("sw") !== "off";
}

export async function initializePwa() {
  // GitHub Pages uses the static SPA build without a service worker.
  if (import.meta.env.MODE === "pages") return;
  if (!("serviceWorker" in navigator)) return;
  if (
    !shouldRegisterWorker(
      import.meta.env.PROD,
      window.location.hostname.toLowerCase(),
      window.self !== window.top,
      location.search,
    )
  ) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((r) =>
          [r.active, r.waiting, r.installing].some(
            (worker) =>
              worker &&
              new URL(worker.scriptURL).origin === location.origin &&
              new URL(worker.scriptURL).pathname.endsWith("/sw.js"),
          ),
        )
        .map((r) => r.unregister()),
    );
    return;
  }
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  await registration.update();
}
