(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function render(container, data) {
    if (!container) return;

    var items = (data && data.items) || [];
    if (!items.length) {
      container.innerHTML =
        '<div class="tile"><p>No recent posts found. See <a class="mono" href="' +
        escapeHtml((data && data.profile_url) || "https://medium.com") +
        '">Medium</a>.</p></div>';
      return;
    }

    var html = '<div class="list">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      html +=
        '<a href="' +
        escapeHtml(it.url || "#") +
        '">' +
        '<div class="list-title"><strong>' +
        escapeHtml(it.title || "Untitled") +
        '</strong><span class="mono">' +
        escapeHtml(it.published || "") +
        '</span></div>';

      if (it.summary) {
        html += '<p>' + escapeHtml(it.summary) + '</p>';
      }

      html += "</a>";
    }
    html += "</div>";

    container.innerHTML = html;
  }

  fetch("./medium.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("medium.json fetch failed");
      return r.json();
    })
    .then(function (data) {
      render(document.getElementById("medium-feed"), data);
    })
    .catch(function () {
      var el = document.getElementById("medium-feed");
      if (!el) return;
      el.innerHTML =
        '<div class="tile"><p>Unable to load the Medium feed right now. See <a class="mono" href="https://medium.com/@timmyb824">medium.com/@timmyb824</a>.</p></div>';
    });
})();
