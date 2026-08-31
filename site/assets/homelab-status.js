/* Homelab status page: polls the public live-status API and renders the
   four tiers (nodes, hosts, services, events). Read-only, no-store.
   All API data is rendered via textContent — never innerHTML. */
(function () {
  var API = window.HLS_API || "https://status.timmybtech.com";
  var REFRESH_MS = 60000;
  var MAX_EVENTS = 25;
  var requestGen = 0;

  function el(id) {
    return document.getElementById(id);
  }

  function make(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
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
    return make("span", "stat-dot " + (status === "up" ? "up" : "down"));
  }

  function pill(text) {
    return make("span", "pill", text);
  }

  function upSince(entity) {
    return entity.up_since ? "up since " + timeAgo(entity.up_since) : "";
  }

  /* Only http(s) URLs become links — anything else renders as plain text
     so a malformed/compromised API value can't emit a javascript: URL. */
  function safeLink(url, name) {
    if (!/^https?:\/\//i.test(url || "")) return null;
    var a = make("a", null, name);
    a.href = url;
    a.rel = "noopener";
    return a;
  }

  function row(nameNode, status, metaNodes) {
    var div = make("div", "stat-row");
    if (status) div.appendChild(dot(status)); // events have no up/down dot
    var nameSpan = make("span", "stat-name");
    nameSpan.appendChild(nameNode);
    div.appendChild(nameSpan);
    var meta = make("span", "stat-meta");
    (metaNodes || []).forEach(function (n) {
      meta.appendChild(n);
    });
    div.appendChild(meta);
    return div;
  }

  function serviceRow(s) {
    var meta = [];
    if (s.platform && s.platform.argocd) {
      meta.push(pill(s.platform.argocd.sync + "/" + s.platform.argocd.health));
    }
    var since = upSince(s);
    if (since) meta.push(make("span", "mono", since));
    return row(
      safeLink(s.url, s.name) || make("span", null, s.name),
      s.status,
      meta,
    );
  }

  function hostRow(h) {
    return row(
      make("span", null, h.name),
      h.status,
      upSince(h) ? [make("span", "mono", upSince(h))] : [],
    );
  }

  function nodeRow(n) {
    var meta = [];
    if (n.role) meta.push(pill(n.role));
    meta.push(pill(n.type === "proxmox_node" ? "proxmox" : "k3s"));
    if (n.uptime_seconds != null) {
      meta.push(
        make(
          "span",
          "mono",
          (n.uptime_seconds / 86400).toFixed(1) + "d uptime",
        ),
      );
    }
    return row(make("span", null, n.name), n.status, meta);
  }

  function eventRow(e) {
    return row(make("span", null, e.summary), null, [
      pill(e.type),
      make("span", "mono", timeAgo(e.timestamp)),
    ]);
  }

  function renderList(id, items, rowFn, emptyText) {
    var target = el(id);
    if (!target) return;
    if (!items.length) {
      target.replaceChildren(make("p", null, emptyText));
      return;
    }
    target.replaceChildren.apply(target, items.map(rowFn));
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

    /* An empty snapshot (collector wrote nothing) is never "operational". */
    var allUp =
      svcUp === services.length &&
      infraUp === infra.length &&
      services.length + infra.length > 0;
    setOverall(allUp ? "operational" : "degraded");

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
    /* Generation guard: if a slower previous load resolves after a newer
       one, its stale snapshot is ignored instead of clobbering the page. */
    var gen = ++requestGen;
    var statusReq = fetch(API + "/api/v1/status", { cache: "no-store" }).then(
      function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        return r.json();
      },
    );
    /* Events are optional: a failed events fetch must not take down the
       whole page — render the snapshot without the feed. */
    var eventsReq = fetch(API + "/api/v1/events", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("events " + r.status);
        return r.json();
      })
      .catch(function () {
        return [];
      });
    statusReq
      .then(function (snapshot) {
        return eventsReq.then(function (events) {
          return [snapshot, events];
        });
      })
      .then(function (results) {
        if (gen !== requestGen) return; // a newer load already rendered
        render(results[0], results[1]);
      })
      .catch(function (err) {
        if (gen !== requestGen) return;
        renderUnreachable(err);
      });
  }

  load();
  setInterval(load, REFRESH_MS);
})();
