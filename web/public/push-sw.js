// Notificação "cortes prontos". Carregado pelo service worker gerado no build.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data.json();
  } catch {
    /* mensagem sem conteúdo: usa o título padrão */
  }
  e.waitUntil(
    self.registration.showNotification(d.titulo || "Súmula Digital", {
      body: d.corpo || "",
      icon: "pwa-192.png",
      badge: "pwa-192.png",
      data: { url: d.url || "./" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(new URL(e.notification.data.url, self.registration.scope).href));
});
