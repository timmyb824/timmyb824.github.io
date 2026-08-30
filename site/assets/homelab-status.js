/* Homelab status page: polls the public live-status API and renders the
   four tiers (nodes, hosts, services, events). Read-only, no-store. */
(function () {
  var API = window.HLS_API || "https://status.timmybtech.com";
  var REFRESH_MS = 60000;
  var MAX_EVENTS = 25;

  function el(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "";
    var mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + "h ago";
    return Math.round(hours / 24) + "d ago";
  }

  function dot(status) {
    var cls = status === "up" ? "up" : "down";
    return '<span class="stat-dot ' + cls + '" aria-hidden="true"></span>';
  }

  function upSince(entity) {
    return entity.up_since ? "up since " + timeAgo(entity.up_since) : "";
  }

  function serviceRow(s) {
    var meta = [];
    if (s.platform && s.platform.argocd) {
      meta.push(
        '<span class="pill">' +
          esc(s.platform.argocd.sync) +
          "/" +
          esc(s.platform.argocd.health) +
          "</span>",
      );
    }
    var since = upSince(s);
    if (since) meta.push('<span class="mono">' + esc(since) + "</span>");
    var name = esc(s.name);
    if (s.url) {
      name = '<a href="' + esc(s.url) + '" rel="noopener">' + name + "</a>";
    }
    return (
      '<div class="stat-row">' +
      dot(s.status) +
      '<span class="stat-name">' +
      name +
      "</span>" +
      '<span class="stat-meta">' +
      meta.join(" ") +
      "</span></div>"
    );
  }

  function hostRow(h) {
    var since = upSince(h);
    return (
      '<div class="stat-row">' +
      dot(h.status) +
      '<span class="stat-name">' +
      esc(h.name) +
      "</span>" +
      '<span class="stat-meta mono">' +
      esc(since) +
      "</span></div>"
    );
  }

  function nodeRow(n) {
    var meta = [];
    if (n.role) meta.push('<span class="pill">' + esc(n.role) + "</span>");
    meta.push(
      '<span class="pill">' +
        (n.type === "proxmox_node" ? "proxmox" : "k3s") +
        "</span>",
    );
    if (n.uptime_seconds != null) {
      meta.push(
        '<span class="mono">' +
          (n.uptime_seconds / 86400).toFixed(1) +
          "d uptime</span>",
      );
    }
    return (
      '<div class="stat-row">' +
      dot(n.status) +
      '<span class="stat-name">' +
      esc(n.name) +
      "</span>" +
      '<span class="stat-meta">' +
      meta.join(" ") +
      "</span></div>"
    );
  }

  function eventRow(e) {
    return (
      '<div class="stat-row">' +
      '<span class="pill">' +
      esc(e.type) +
      "</span>" +
      '<span class="stat-name">' +
      esc(e.summary) +
      "</span>" +
      '<span class="stat-meta mono">' +
      esc(timeAgo(e.timestamp)) +
      "</span></div>"
    );
  }

  function renderList(id, items, rowFn, emptyText) {
    var target = el(id);
    if (!target) return;
    target.innerHTML = items.length
      ? items.map(rowFn).join("")
      : "<p>" + esc(emptyText) + "</p>";
  }

  function upCount(items) {
    return items.filter(function (i) {
      return i.status === "up";
    }).length;
  }

  function setOverall(state) {
    var dotEl = el("overall-dot");
    var textEl = el("overall-text");
    if (textEl) {
      textEl.textContent =
        "Status: " +
        (state === "down"
          ? "Down"
          : state === "degraded"
            ? "Degraded"
            : "Operational");
    }
    if (!dotEl) return;
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
    dotEl.style.background = color;
    dotEl.style.boxShadow = "0 0 0 4px " + glow;
  }

  function render(snapshot, events) {
    var services = snapshot.services || [];
    var hosts = snapshot.hosts || [];
    var nodes = snapshot.nodes || [];

    var k8s = services.filter(function (s) {
      return s.group === "Kubernetes";
    });
    var ext = services.filter(function (s) {
      return s.group !== "Kubernetes";
    });

    renderList("services-kubernetes", k8s, serviceRow, "no services");
    renderList("services-external", ext, serviceRow, "no services");
    renderList("hosts-list", hosts, hostRow, "no hosts");
    renderList("nodes-list", nodes, nodeRow, "no nodes");
    renderList(
      "events-list",
      (events || []).slice(0, MAX_EVENTS),
      eventRow,
      "no recent changes",
    );

    var counts = {
      "count-k8s": "(" + upCount(k8s) + "/" + k8s.length + ")",
      "count-ext": "(" + upCount(ext) + "/" + ext.length + ")",
      "count-hosts": "(" + upCount(hosts) + "/" + hosts.length + ")",
      "count-nodes": "(" + upCount(nodes) + "/" + nodes.length + ")",
    };
    Object.keys(counts).forEach(function (id) {
      if (el(id)) el(id).textContent = counts[id];
    });

    var svcUp = upCount(services);
    var infra = hosts.concat(nodes);
    var infraUp = upCount(infra);
    if (el("services-summary"))
      el("services-summary").textContent =
        "Services: " + svcUp + "/" + services.length + " up";
    if (el("infra-summary"))
      el("infra-summary").textContent =
        "Infra: " + infraUp + "/" + infra.length + " up";

    setOverall(
      svcUp === services.length && infraUp === infra.length
        ? "operational"
        : "degraded",
    );

    var failed = Object.keys(snapshot.sources || {}).filter(function (name) {
      return !snapshot.sources[name].ok;
    });
    var note = el("sources-note");
    if (note) {
      note.textContent = failed.length
        ? "collector warning: " +
          failed.join(", ") +
          " poll failed — data may be stale"
        : "";
    }

    var gen = snapshot.generated_at ? timeAgo(snapshot.generated_at) : "";
    if (el("last-updated"))
      el("last-updated").textContent = "updated " + (gen || "unknown");
  }

  function renderUnreachable(err) {
    setOverall("down");
    if (el("overall-text"))
      el("overall-text").textContent = "Status: API unreachable";
    var note = el("sources-note");
    if (note) note.textContent = "could not reach " + API + " (" + err + ")";
  }

  function load() {
    Promise.all([
      fetch(API + "/api/v1/status", { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        return r.json();
      }),
      fetch(API + "/api/v1/events", { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("events " + r.status);
        return r.json();
      }),
    ])
      .then(function (results) {
        render(results[0], results[1]);
      })
      .catch(renderUnreachable);
  }

  load();
  setInterval(load, REFRESH_MS);
})();
