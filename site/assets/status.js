(function () {
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

  fetch("./status.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("status.json fetch failed");
      return r.json();
    })
    .then(function (data) {
      var overall = (data && data.overall) || "operational";

      setBadgeText(
        document.getElementById("status-badge-text"),
        "Status: " + overallLabel(overall)
      );
      setDotState(document.getElementById("status-badge-dot"), overall);

      if (data && data.summary) {
        if (typeof data.summary.target_availability_pct === "number") {
          setBadgeText(
            document.getElementById("metric-availability-target"),
            data.summary.target_availability_pct.toFixed(2) + "%"
          );
        }

        if (data.summary.error_budget) {
          setBadgeText(
            document.getElementById("metric-error-budget"),
            String(data.summary.error_budget)
          );
        }

        if (
          typeof data.summary.up === "number" &&
          typeof data.summary.total === "number"
        ) {
          setBadgeText(
            document.getElementById("status-services-badge"),
            "Services: " + data.summary.up + "/" + data.summary.total + " up"
          );
        }
      }
    })
    .catch(function () {
      // Fail silently; keep the static UI.
    });
})();
