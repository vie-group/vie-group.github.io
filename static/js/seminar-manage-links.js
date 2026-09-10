(function () {
  var manageParam = "manage";
  var managedPaths = {
    "/": true,
    "/home": true,
    "/team": true,
    "/publication": true,
    "/presentation": true,
    "/activity": true,
    "/daily": true,
    "/upload-seminar": true,
    "/edit-seminar": true
  };

  function hasManageFlag() {
    try {
      var params = new URLSearchParams(window.location.search);
      return /^(1|true|yes)$/i.test(params.get(manageParam) || "") ||
        /^(1|true|yes)$/i.test(params.get("seminar_manage") || "");
    } catch (error) {
      return false;
    }
  }

  function normalizedPath(pathname) {
    var path = String(pathname || "/").replace(/\/+$/, "");
    return path || "/";
  }

  function withManageFlag(href) {
    if (!href || /^(https?:|mailto:|#)/i.test(href)) return href;
    try {
      var url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return href;
      if (!managedPaths[normalizedPath(url.pathname)]) return href;
      url.searchParams.set(manageParam, "1");
      return url.pathname + url.search + url.hash;
    } catch (error) {
      return href;
    }
  }

  function applyManageMode() {
    if (!hasManageFlag()) return;
    document.body.classList.add("seminar-manage-enabled");
    Array.prototype.forEach.call(document.querySelectorAll("[data-seminar-manage]"), function (node) {
      node.style.display = "";
    });
    Array.prototype.forEach.call(document.querySelectorAll("a[href]"), function (link) {
      link.setAttribute("href", withManageFlag(link.getAttribute("href")));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyManageMode);
  } else {
    applyManageMode();
  }
})();
