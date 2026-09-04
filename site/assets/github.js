/* Featured projects: pinned repos first, then recently created, then recently
   updated — fetched live from the GitHub REST API. */
(function () {
  const USER = "timmyb824";
  const GRID = document.getElementById("featured-repos");
  if (!GRID) return;

  /* Keep in sync with the repos pinned on the GitHub profile.
     (The REST API cannot read profile pins, so the list lives here.) */
  const PINNED = [
    "PingPulse",
    "homelab-tool-notifiq",
    "homelab-kubernetes-apps",
    "homelab-podman-apps",
    "dotfiles",
    "one-updater",
    "sysinformer",
    "sops-file-encryption-check",
  ];

  // Never show these, even if they surface as "recent".
  const EXCLUDE = new Set(["timmyb824", "timmyb824.github.io"]);

  const MAX_NEW = 2; // recently created (last NEW_DAYS days)
  const MAX_ACTIVE = 2; // recently updated, not already shown
  const NEW_DAYS = 90;
  const REQUEST_TIMEOUT_MS = 10000;

  const LANG_COLORS = {
    Python: "#88c0d0",
    Go: "#81a1c1",
    Rust: "#d08770",
    Lua: "#5e81ac",
    HCL: "#b48ead",
    Shell: "#a3be8c",
    JavaScript: "#ebcb8b",
    TypeScript: "#81a1c1",
    Dockerfile: "#8fbcbb",
    HTML: "#d08770",
    CSS: "#81a1c1",
  };

  // Small DOM builder — text is always set via textContent, never parsed as HTML.
  const el = (tag, props, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null) continue;
      if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.append(child); // strings become text nodes; nodes are appended as-is
    }
    return node;
  };

  const relTime = (dateStr) => {
    const seconds = (Date.now() - new Date(dateStr).getTime()) / 1000;
    const ranges = [
      ["month", 2592000],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ];
    const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    for (const [unit, secs] of ranges) {
      if (seconds >= secs) return fmt.format(-Math.floor(seconds / secs), unit);
    }
    return "just now";
  };

  const api = async (path) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const resp = await fetch(`https://api.github.com${path}`, {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
      return await resp.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const card = (repo, tag) => {
    const head = el(
      "div",
      { class: "tile-head" },
      el("h3", null, repo.name),
      tag ? el("span", { class: "tile-tag" }, tag) : null,
    );

    const meta = [];
    if (repo.language) {
      const dot = el("span", { class: "lang-dot" });
      dot.style.background = LANG_COLORS[repo.language] || "var(--accent)";
      meta.push(el("span", { class: "lang" }, dot, repo.language));
    }
    meta.push(el("span", null, `Updated ${relTime(repo.pushed_at)}`));

    return el(
      "a",
      {
        class: "tile tile-link col-4",
        href: repo.html_url,
        target: "_blank",
        rel: "noopener",
      },
      head,
      el("p", null, repo.description || "No description yet."),
      el("div", { class: "tile-meta" }, meta),
    );
  };

  const load = async () => {
    /* One request for every owned repo (51 today, API cap is 100) instead of a
       per-pin lookup plus two list calls — keeps well under the 60/hr
       unauthenticated limit while still using live metadata for each card. */
    const repos = await api(
      `/users/${USER}/repos?per_page=100&sort=pushed&direction=desc`,
    );

    const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
    const pinned = PINNED.map((name) => byName.get(name.toLowerCase())).filter(
      Boolean,
    );

    const shown = new Set(pinned.map((r) => r.name));
    const sections = pinned.map((r) => card(r, "Pinned"));

    const isShowable = (r) =>
      !r.fork && !r.archived && !shown.has(r.name) && !EXCLUDE.has(r.name);

    const newest = repos
      .filter(
        (r) =>
          isShowable(r) &&
          Date.now() - new Date(r.created_at).getTime() < NEW_DAYS * 86400000,
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, MAX_NEW);
    sections.push(...newest.map((r) => card(r, "New")));
    newest.forEach((r) => shown.add(r.name));

    // repos is already sorted by pushed desc, so this stays in recency order.
    const active = repos.filter(isShowable).slice(0, MAX_ACTIVE);
    sections.push(...active.map((r) => card(r, "Active")));

    GRID.replaceChildren(...sections);
  };

  load().catch(() => {
    GRID.replaceChildren(
      el(
        "a",
        {
          class: "tile tile-link col-4",
          href: `https://github.com/${USER}`,
          target: "_blank",
          rel: "noopener",
        },
        el("div", { class: "tile-head" }, el("h3", null, "GitHub")),
        el(
          "p",
          null,
          "Couldn’t load live repositories right now. Browse them on GitHub instead.",
        ),
      ),
    );
  });
})();
