// Group Shopping — service worker.
//
// The whole app is one index.html talking to Supabase, so the caching rules are simple:
//
//   index.html / navigations : network first, cache only as the offline fallback.
//                              Deploy = push to main, and nobody should be stuck on old
//                              code just because a worker cached it.
//   icons, manifest, the supabase-js bundle : cache first, refreshed in the background.
//   anything on supabase.co  : never touched — that's live data and the realtime socket.
//
// Bump VERSION when the shell list changes; activate() drops every older cache.

var VERSION = "gs-v1";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  // the app is dead without this one, and jsdelivr only sends a 7-day max-age, so it
  // gets precached rather than left to the browser's HTTP cache
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION)
      // addAll is all-or-nothing; a single 404 would leave us with no cache at all
      .then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function putIn(req, res) {
  if (!res || res.status !== 200 || (res.type !== "basic" && res.type !== "cors")) return res;
  var copy = res.clone();
  caches.open(VERSION).then(function (c) { c.put(req, copy); });
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.hostname.indexOf("supabase.co") >= 0) return;   // live data + realtime

  var isShell = req.mode === "navigate" ||
    url.pathname.slice(-1) === "/" ||
    url.pathname.slice(-11) === "/index.html";

  if (isShell) {
    e.respondWith(
      fetch(req)
        .then(function (res) { return putIn(req, res); })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match("./index.html") || caches.match("./");
          });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req)
        .then(function (res) { return putIn(req, res); })
        .catch(function () { return hit; });
      return hit || net;
    })
  );
});
