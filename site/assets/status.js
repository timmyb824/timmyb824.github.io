/* Homepage reliability snapshot card: live data from the public homelab
   live-status API. Shows an explicit "Unavailable" state on fetch failure
   instead of leaving stale placeholders. */
(function () {
  var API = "https://status.timmybtech.com";

  function el(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var node = el(id);
    if (node) node.textContent = text;
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

  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "unknown";
    var mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + "h ago";
    return Math.round(hours / 24) + "d ago";
  }

  function renderUnavailable() {
    setDotState(el("metric-status-dot"), "down");
    setText("metric-status-text", "Unavailable");
    setText("metric-fleet", "--/-- up");
    setText("metric-last-updated", "unknown");
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
      /* An empty snapshot (collector wrote nothing) is never "operational". */
      var overall =
        all.length > 0 && up === all.length ? "operational" : "degraded";

      setDotState(el("metric-status-dot"), overall);
      setText("metric-status-text", overallLabel(overall));
      setText("metric-fleet", up + "/" + all.length + " up");
      setText(
        "metric-last-updated",
        data && data.generated_at ? timeAgo(data.generated_at) : "unknown",
      );
    })
    .catch(function () {
      renderUnavailable();
    });
})();
