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

  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

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
    const resp = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
    return resp.json();
  };

  const card = (repo, tag) => {
    const langColor = LANG_COLORS[repo.language] || "var(--accent)";
    const lang = repo.language
      ? `<span class="lang"><span class="lang-dot" style="background:${esc(langColor)}"></span>${esc(repo.language)}</span>`
      : "";
    return `
      <a class="tile tile-link col-4" href="${esc(repo.html_url)}" target="_blank" rel="noopener">
        <div class="tile-head">
          <h3>${esc(repo.name)}</h3>
          ${tag ? `<span class="tile-tag">${esc(tag)}</span>` : ""}
        </div>
        <p>${esc(repo.description || "No description yet.")}</p>
        <div class="tile-meta">
          ${lang}
          <span>Updated ${esc(relTime(repo.pushed_at))}</span>
        </div>
      </a>`;
  };

  const load = async () => {
    // Pinned repos (metadata fetched individually so it stays current).
    const pinned = (
      await Promise.all(
        PINNED.map((name) => api(`/repos/${USER}/${name}`).catch(() => null)),
      )
    ).filter(Boolean);

    const shown = new Set(pinned.map((r) => r.name));
    const sections = [...pinned.map((r) => card(r, "Pinned"))];

    const [recentPushed, recentCreated] = await Promise.all([
      api(`/users/${USER}/repos?sort=pushed&direction=desc&per_page=30`),
      api(`/users/${USER}/repos?sort=created&direction=desc&per_page=30`),
    ]);

    const isShowable = (r) =>
      !r.fork && !r.archived && !shown.has(r.name) && !EXCLUDE.has(r.name);

    const newest = recentCreated
      .filter(
        (r) =>
          isShowable(r) &&
          Date.now() - new Date(r.created_at).getTime() < NEW_DAYS * 86400000,
      )
      .slice(0, MAX_NEW);
    sections.push(...newest.map((r) => card(r, "New")));
    newest.forEach((r) => shown.add(r.name));

    const active = recentPushed.filter(isShowable).slice(0, MAX_ACTIVE);
    sections.push(...active.map((r) => card(r, "Active")));

    GRID.innerHTML = sections.join("");
  };

  load().catch(() => {
    GRID.innerHTML = `
      <a class="tile tile-link col-4" href="https://github.com/${USER}" target="_blank" rel="noopener">
        <div class="tile-head"><h3>GitHub</h3></div>
        <p>Couldn’t load live repositories right now. Browse them on GitHub instead.</p>
      </a>`;
  });
})();
