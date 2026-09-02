(function () {
  const dataFiles = {
    site: "data/site.json",
    news: "data/news.json",
    team: "data/team.json",
    publications: "data/publications.json",
    seminars: "data/seminars.json",
    activities: "data/activities.json"
  };

  const state = {
    filter: "all",
    query: "",
    publications: [],
    homeNewsExpanded: false,
    theme: "classic",
    copy: {}
  };

  const themeKey = "vie-site-theme";

  const monthFormat = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });

  function byDateDesc(a, b) {
    return String(b.date || "").localeCompare(String(a.date || ""));
  }

  function byYearDesc(a, b) {
    return Number(b.year || 0) - Number(a.year || 0);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? value : monthFormat.format(date);
  }

  function initials(name) {
    return String(name || "VIE")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function resolveHref(href) {
    if (!href) return "";
    if (/^(https?:|mailto:)/i.test(href)) return href;
    return href;
  }

  function renderLinks(links) {
    const row = el("div", "link-row");
    Object.entries(links || {}).forEach(([label, href]) => {
      if (!href) return;
      const a = el("a", "resource-link", label.toUpperCase());
      a.href = resolveHref(href);
      a.target = "_blank";
      a.rel = "noreferrer";
      row.appendChild(a);
    });
    return row;
  }

  function renderTags(tags) {
    const row = el("div", "tag-row");
    (tags || []).forEach((tag) => row.appendChild(el("span", "tag", tag)));
    return row;
  }

  function renderHeroSnapshot(publications, seminars) {
    const latestPublication = publications
      .slice()
      .sort((a, b) => byYearDesc(a, b) || String(a.title).localeCompare(String(b.title)))[0];
    const latestSeminar = seminars.slice().sort(byDateDesc)[0];
    const pubTitle = document.querySelector("[data-hero-field='latestPublication']");
    const pubMeta = document.querySelector("[data-hero-field='latestPublicationMeta']");
    const seminarTitle = document.querySelector("[data-hero-field='latestSeminar']");
    const seminarMeta = document.querySelector("[data-hero-field='latestSeminarMeta']");

    if (latestPublication) {
      pubTitle.textContent = latestPublication.title;
      pubMeta.textContent = [latestPublication.venue, latestPublication.year].filter(Boolean).join(" · ");
    }
    if (latestSeminar) {
      seminarTitle.textContent = latestSeminar.title;
      seminarMeta.textContent = [formatDate(latestSeminar.date), latestSeminar.speaker].filter(Boolean).join(" · ");
    }
  }

  function renderArchiveTimeline(publications) {
    const root = document.querySelector("#archive-year-bars");
    if (!root) return;
    clear(root);

    const years = publications
      .map((item) => Number(item.year))
      .filter((year) => Number.isFinite(year) && year > 1900);

    if (!years.length) return;

    const start = Math.min(...years);
    const end = Math.max(...years);
    const counts = new Map();
    years.forEach((year) => counts.set(year, (counts.get(year) || 0) + 1));
    const maxCount = Math.max(...counts.values(), 1);

    for (let year = start; year <= end; year += 1) {
      const count = counts.get(year) || 0;
      const isRecent = year >= end - 3;
      const bar = count
        ? el("i", `archive-year-bar${isRecent ? " recent" : ""}`)
        : el("i", "archive-year-gap");
      if (count) {
        bar.style.height = `${Math.max(8, Math.round((count / maxCount) * 42) + 6)}px`;
        bar.title = `${year}: ${count} publication${count === 1 ? "" : "s"}`;
        bar.setAttribute("aria-label", bar.title);
      } else {
        bar.setAttribute("aria-hidden", "true");
      }
      root.appendChild(bar);
    }

    const range = `${start}-${end}`;
    const rangeNode = document.querySelector("[data-archive-field='range']");
    const startNode = document.querySelector("[data-archive-field='start']");
    const endNode = document.querySelector("[data-archive-field='end']");
    if (rangeNode) rangeNode.textContent = range;
    if (startNode) startNode.textContent = String(start);
    if (endNode) endNode.textContent = String(end);
  }

  function renderResearch(items) {
    const root = document.querySelector("#research-list");
    clear(root);
    items.forEach((item, index) => {
      const card = el("article", "research-item");
      card.appendChild(el("span", "axis-index", `${state.copy.researchAxisPrefix || "Axis"} ${String(index + 1).padStart(2, "0")}`));
      card.appendChild(el("h3", "", item));
      root.appendChild(card);
    });
  }

  function renderHomeNews(news) {
    const homeRoot = document.querySelector("#home-news-list");
    if (!homeRoot) return;

    const limit = 3;
    const toggle = document.querySelector("#home-news-toggle");
    const box = homeRoot.closest(".home-news-box");
    const visibleItems = state.homeNewsExpanded ? news : news.slice(0, limit);

    clear(homeRoot);
    visibleItems.forEach((item) => {
      const row = el("article", "home-news-item");
      row.appendChild(el("time", "", formatDate(item.date)));
      row.appendChild(el("p", "", item.text));
      homeRoot.appendChild(row);
    });

    if (box) box.classList.toggle("expanded", state.homeNewsExpanded);
    if (toggle) {
      const hasMore = news.length > limit;
      toggle.hidden = !hasMore;
      toggle.textContent = state.homeNewsExpanded
        ? state.copy.homeNewsCollapse || "Show less"
        : state.copy.homeNewsExpand || "Show all news";
      toggle.setAttribute("aria-expanded", String(state.homeNewsExpanded));
      toggle.onclick = () => {
        state.homeNewsExpanded = !state.homeNewsExpanded;
        renderHomeNews(news);
      };
    }
  }

  function renderNews(news) {
    const root = document.querySelector("#news-list");
    clear(root);
    const sorted = news.slice().sort(byDateDesc);

    renderHomeNews(sorted);

    sorted.forEach((item) => {
      const row = el("article", "timeline-item");
      row.appendChild(el("time", "activity-date", formatDate(item.date)));
      row.appendChild(el("div", "", item.text));
      root.appendChild(row);
    });
  }

  function renderPublications() {
    const root = document.querySelector("#publication-list");
    clear(root);
    const query = state.query.trim().toLowerCase();
    const items = state.publications
      .filter((item) => state.filter === "all" || item.type === state.filter)
      .filter((item) => {
        if (!query) return true;
        return [item.title, item.authors, item.venue, item.note, ...(item.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => byYearDesc(a, b) || String(a.title).localeCompare(String(b.title)));

    if (!items.length) {
      root.appendChild(el("div", "empty", state.copy.publicationEmptyText || "No publication matches the current filter."));
      return;
    }

    items.forEach((item) => {
      const row = el("article", "publication-item");
      row.appendChild(el("div", "pub-year", item.year || ""));

      const content = el("div");
      content.appendChild(el("span", "pub-kind", item.type || "publication"));
      content.appendChild(el("div", "pub-title", item.title));
      content.appendChild(el("div", "pub-meta", item.authors));
      content.appendChild(el("div", "pub-meta", [item.venue, item.note].filter(Boolean).join(". ")));
      content.appendChild(renderLinks(item.links));
      content.appendChild(renderTags(item.tags));
      row.appendChild(content);
      root.appendChild(row);
    });
  }

  function renderSeminars(seminars) {
    const root = document.querySelector("#seminar-list");
    clear(root);
    seminars.sort(byDateDesc).slice(0, 12).forEach((item) => {
      const card = el("article", "seminar-card");
      card.appendChild(el("div", "seminar-date", formatDate(item.date)));
      card.appendChild(el("div", "seminar-track", state.copy.seminarTrackLabel || "Group Seminar"));
      card.appendChild(el("div", "seminar-title", item.title));
      card.appendChild(el("div", "card-meta", item.speaker || ""));
      card.appendChild(renderLinks(item.links));
      card.appendChild(renderTags(item.tags));
      root.appendChild(card);
    });
  }

  function renderTeam(team) {
    const facultyRoot = document.querySelector("#faculty-list");
    const currentRoot = document.querySelector("#current-list");
    const alumniRoot = document.querySelector("#alumni-list");
    clear(facultyRoot);
    clear(currentRoot);
    clear(alumniRoot);

    (team.faculty || []).forEach((person) => {
      const card = el("article", "person-feature");
      card.appendChild(el("div", "avatar", initials(person.name)));
      const body = el("div");
      body.appendChild(el("h3", "", person.name));
      body.appendChild(el("p", "pub-meta", [person.role, person.affiliation].filter(Boolean).join(" · ")));
      body.appendChild(el("p", "pub-meta", [person.address, person.email].filter(Boolean).join(" · ")));
      card.appendChild(body);
      facultyRoot.appendChild(card);
    });

    (team.current || []).forEach((person) => {
      const card = el("article", "person-card");
      card.appendChild(el("div", "avatar", initials(person.name)));
      card.appendChild(el("strong", "", person.name));
      card.appendChild(el("small", "", person.role || ""));
      card.appendChild(el("small", "", person.email || ""));
      currentRoot.appendChild(card);
    });

    (team.alumni || []).forEach((person) => {
      const item = el("div", "alumni-item");
      item.appendChild(el("strong", "", person.name));
      item.appendChild(el("small", "", [person.year, person.degree, person.destination].filter(Boolean).join(" · ")));
      alumniRoot.appendChild(item);
    });
  }

  function renderActivities(activities) {
    const root = document.querySelector("#activity-list");
    clear(root);
    activities.sort(byDateDesc).forEach((item) => {
      const row = el("article", "timeline-item");
      row.appendChild(el("time", "activity-date", formatDate(item.date)));
      const body = el("div");
      body.appendChild(el("div", "activity-title", item.title));
      body.appendChild(el("div", "pub-meta", item.description || ""));
      row.appendChild(body);
      root.appendChild(row);
    });
  }

  function applyTheme(theme) {
    const nextTheme = theme === "modern" ? "modern" : "classic";
    state.theme = nextTheme;
    document.body.classList.toggle("classic-site", nextTheme === "classic");
    document.body.classList.toggle("modern-site", nextTheme === "modern");

    const button = document.querySelector("#theme-toggle");
    if (button) {
      button.textContent = nextTheme === "classic" ? state.copy.themeModern || "Modern" : state.copy.themeOldSchool || "Old-school";
      button.setAttribute("aria-pressed", String(nextTheme === "modern"));
      button.title = nextTheme === "classic"
        ? state.copy.themeModernTitle || "Switch to modern theme"
        : state.copy.themeOldSchoolTitle || "Switch to old-school theme";
    }
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(themeKey);
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(themeKey, theme);
    } catch (error) {
      // Theme switching should still work for the current page when storage is unavailable.
    }
  }

  function bindControls() {
    applyTheme(getStoredTheme() || "classic");

    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", () => nav.classList.remove("open"));

    const themeToggle = document.querySelector("#theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const nextTheme = state.theme === "classic" ? "modern" : "classic";
        storeTheme(nextTheme);
        applyTheme(nextTheme);
      });
    }

    const search = document.querySelector("#publication-search");
    search.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderPublications();
    });

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-filter]").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        state.filter = button.dataset.filter;
        renderPublications();
      });
    });

    const sectionIds = [...document.querySelectorAll("main section[id]")].map((section) => section.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        document.querySelectorAll(".site-nav a").forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.2, 0.6] }
    );
    sectionIds.forEach((id) => observer.observe(document.getElementById(id)));
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  function applySiteCopy(copy) {
    const values = copy || {};
    document.querySelectorAll("[data-copy]").forEach((node) => {
      const value = values[node.dataset.copy];
      if (value) node.textContent = value;
    });
    document.querySelectorAll("[data-copy-placeholder]").forEach((node) => {
      const value = values[node.dataset.copyPlaceholder];
      if (value) node.placeholder = value;
    });
  }

  async function boot() {
    bindControls();
    try {
      const [site, news, team, publications, seminars, activities] = await Promise.all(
        Object.values(dataFiles).map(loadJson)
      );

      document.title = `${site.name} | ${site.fullName}`;
      document.querySelectorAll("[data-site-field]").forEach((node) => {
        const value = site[node.dataset.siteField];
        if (value) node.textContent = value;
      });
      state.copy = site.copy || {};
      applySiteCopy(site.copy);
      applyTheme(state.theme);

      state.publications = publications;
      renderResearch(site.researchHighlights || []);
      renderHeroSnapshot(publications, seminars);
      renderArchiveTimeline(publications);
      renderNews(news);
      renderPublications();
      renderSeminars(seminars);
      renderTeam(team);
      renderActivities(activities);
    } catch (error) {
      document.querySelector("main").prepend(el("div", "empty", `Failed to load site data: ${error.message}`));
    }
  }

  boot();
})();
