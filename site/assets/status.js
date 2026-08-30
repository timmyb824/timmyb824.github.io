/* Homepage status badges: live data from the public homelab live-status API.
   Fails silently and keeps the static UI when the API is unreachable. */
(function () {
  var API = "https://status.timmybtech.com";

  function setBadgeText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function setDotState(dot, state) {
    if (!dot) return;
    var color = "var(--ok)";
    var glow = "rgba(34,197,94,.14)";

    if (state === "degraded") {
      color = "var(--warn)";
      glow = "rgba(245,158,11,.14)";
    }

    if (state === "down") {
      color = "var(--bad)";
      glow = "rgba(239,68,68,.14)";
    }

    dot.style.background = color;
    dot.style.boxShadow = "0 0 0 4px " + glow;
  }

  function overallLabel(state) {
    if (state === "degraded") return "Degraded";
    if (state === "down") return "Down";
    return "Operational";
  }

  fetch(API + "/api/v1/status", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("status fetch failed");
      return r.json();
    })
    .then(function (data) {
      var services = (data && data.services) || [];
      var hosts = (data && data.hosts) || [];
      var nodes = (data && data.nodes) || [];
      var all = services.concat(hosts, nodes);
      var up = all.filter(function (i) {
        return i.status === "up";
      }).length;
      var overall = up === all.length ? "operational" : "degraded";

      setBadgeText(
        document.getElementById("status-badge-text"),
        "Status: " + overallLabel(overall),
      );
      setDotState(document.getElementById("status-badge-dot"), overall);
      setBadgeText(
        document.getElementById("status-services-badge"),
        "Services: " +
          services.filter(function (s) {
            return s.status === "up";
          }).length +
          "/" +
          services.length +
          " up",
      );
    })
    .catch(function () {
      // Fail silently; keep the static UI.
    });
})();
