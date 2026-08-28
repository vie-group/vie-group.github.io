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
    publications: []
  };

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

  function renderResearch(items) {
    const root = document.querySelector("#research-list");
    clear(root);
    items.forEach((item, index) => {
      const card = el("article", "research-item");
      card.appendChild(el("span", "axis-index", `Axis ${String(index + 1).padStart(2, "0")}`));
      card.appendChild(el("h3", "", item));
      root.appendChild(card);
    });
  }

  function renderNews(news) {
    const root = document.querySelector("#news-list");
    clear(root);
    news.sort(byDateDesc).forEach((item) => {
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
      root.appendChild(el("div", "empty", "No publication matches the current filter."));
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
      card.appendChild(el("div", "seminar-track", "Group Seminar"));
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

  function bindControls() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", () => nav.classList.remove("open"));

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

      state.publications = publications;
      renderResearch(site.researchHighlights || []);
      renderHeroSnapshot(publications, seminars);
      renderNews(news);
      renderPublications();
      renderSeminars(seminars);
      renderTeam(team);
      renderActivities(activities);

      document.querySelector("[data-stat='publications']").textContent = `${publications.length} publications`;
      document.querySelector("[data-stat='seminars']").textContent = `${seminars.length} seminars`;
      document.querySelector("[data-stat='members']").textContent = `${(team.current || []).length + (team.faculty || []).length} members`;
    } catch (error) {
      document.querySelector("main").prepend(el("div", "empty", `Failed to load site data: ${error.message}`));
    }
  }

  boot();
})();
