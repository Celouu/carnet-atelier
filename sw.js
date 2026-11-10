// Garde le carnet disponible sans connexion.
// Les projets, eux, ne passent jamais par ici : ils restent dans la mémoire de l'appareil.
const CACHE = "carnet-atelier-v1";
const FICHIERS = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function garder(requete, reponse) {
  if (reponse && (reponse.ok || reponse.type === "opaque")) {
    const copie = reponse.clone();
    caches.open(CACHE).then((c) => c.put(requete, copie));
  }
  return reponse;
}

self.addEventListener("fetch", (e) => {
  const requete = e.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  const police = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !police) return;

  if (police) {
    // Les polices ne changent pas : la copie gardée d'abord.
    e.respondWith(caches.match(requete).then((r) => r || fetch(requete).then((rep) => garder(requete, rep))));
    return;
  }
  // La page : le réseau d'abord, pour recevoir les mises à jour ; la copie gardée si on est hors connexion.
  e.respondWith(
    fetch(requete)
      .then((rep) => garder(requete, rep))
      .catch(() => caches.match(requete, { ignoreSearch: true })
        .then((r) => r || (requete.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
