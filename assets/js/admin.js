(function () {
  const paths = {
    site: "data/site.json",
    news: "data/news.json",
    team: "data/team.json",
    publications: "data/publications.json",
    seminars: "data/seminars.json",
    activities: "data/activities.json"
  };

  const state = {
    site: null,
    news: [],
    team: {
      faculty: [],
      current: [],
      alumni: []
    },
    publications: [],
    seminars: [],
    activities: [],
    currentPublicationId: "",
    visualDirty: false
  };

  const fields = {};

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message, tone) {
    const node = $("status");
    node.textContent = message;
    node.classList.toggle("error", tone === "error");
    node.classList.toggle("pending", tone === "pending");
  }

  function applyRouteMode() {
    document.body.classList.toggle("seminar-focus", window.location.hash === "#seminar");
  }

  function config() {
    return {
      owner: $("repo-owner").value.trim(),
      repo: $("repo-name").value.trim(),
      branch: $("repo-branch").value.trim() || "main",
      token: $("github-token").value.trim()
    };
  }

  async function request(path, options) {
    const { owner, repo, token } = config();
    if (!owner || !repo) throw new Error("Repository owner and name are required.");
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options && options.headers ? options.headers : {})
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
      ...options,
      headers
    });
    const text = await response.text();
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (_) {
        body = { message: text };
      }
    }
    if (!response.ok) {
      throw new Error(body.message || `GitHub API error ${response.status}`);
    }
    return body;
  }

  function encodePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  function decodeBase64Utf8(content) {
    const binary = atob(content.replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function loadJson(path) {
    const { branch, token } = config();
    if (!token) {
      const response = await fetch(path, { cache: "no-cache" });
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    }
    const file = await request(`/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`);
    return JSON.parse(decodeBase64Utf8(file.content));
  }

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function slugify(value) {
    const slug = String(value || "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return slug || `item-${Date.now()}`;
  }

  function splitTags(value) {
    return String(value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function safeName(value) {
    const cleaned = String(value || "file")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || "file";
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function setDirty(message) {
    state.visualDirty = true;
    const node = $("visual-dirty");
    if (node) node.textContent = message || "Local draft changed. Commit to publish.";
  }

  function plainTextPaste(event) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  function editable(label, value, onInput, options) {
    const opts = options || {};
    const wrapper = el("label", `visual-field${opts.wide ? " wide" : ""}`);
    wrapper.appendChild(el("span", "", label));
    const editor = el("div", `wysiwyg-field${opts.multiline ? " multiline" : ""}`, value || "");
    editor.contentEditable = "true";
    editor.spellcheck = true;
    editor.setAttribute("role", "textbox");
    if (opts.multiline) editor.setAttribute("aria-multiline", "true");
    if (opts.placeholder) editor.dataset.placeholder = opts.placeholder;
    editor.addEventListener("paste", plainTextPaste);
    editor.addEventListener("keydown", (event) => {
      if (!opts.multiline && event.key === "Enter") event.preventDefault();
    });
    editor.addEventListener("input", () => {
      onInput(editor.textContent.trim());
      setDirty();
    });
    wrapper.appendChild(editor);
    return wrapper;
  }

  function textInput(label, value, onInput, options) {
    const opts = options || {};
    const wrapper = el("label", `visual-field${opts.wide ? " wide" : ""}`);
    wrapper.appendChild(el("span", "", label));
    const input = document.createElement("input");
    input.type = opts.type || "text";
    input.value = value || "";
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener("input", () => {
      onInput(input.type === "number" ? Number(input.value) : input.value.trim());
      setDirty();
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function selectInput(label, value, options, onInput) {
    const wrapper = el("label", "visual-field");
    wrapper.appendChild(el("span", "", label));
    const select = document.createElement("select");
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    });
    select.value = value || options[0];
    select.addEventListener("change", () => {
      onInput(select.value);
      setDirty();
    });
    wrapper.appendChild(select);
    return wrapper;
  }

  function linksEditor(item) {
    const wrapper = el("label", "visual-field wide compact");
    wrapper.appendChild(el("span", "", "Links JSON"));
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.spellcheck = false;
    textarea.value = JSON.stringify(item.links || {}, null, 2);
    textarea.addEventListener("input", () => {
      try {
        item.links = JSON.parse(textarea.value.trim() || "{}");
        delete item._linksError;
        textarea.classList.remove("invalid");
      } catch (error) {
        item._linksError = error.message;
        textarea.classList.add("invalid");
      }
      setDirty();
    });
    wrapper.appendChild(textarea);
    return wrapper;
  }

  function button(text, onClick, className) {
    const node = el("button", className || "", text);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  async function commitFiles(message, files) {
    const { branch, token } = config();
    if (!token) throw new Error("A GitHub token is required for committing changes.");
    const ref = await request(`/git/ref/heads/${branch}`);
    const latestCommit = await request(`/git/commits/${ref.object.sha}`);

    const tree = [];
    for (const file of files) {
      const blob = await request("/git/blobs", {
        method: "POST",
        body: JSON.stringify({
          content: file.content,
          encoding: file.encoding || "utf-8"
        })
      });
      tree.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha
      });
    }

    const newTree = await request("/git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: latestCommit.tree.sha,
        tree
      })
    });
    const commit = await request("/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [ref.object.sha]
      })
    });
    await request(`/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({
        sha: commit.sha,
        force: false
      })
    });
    return commit;
  }

  function visualBlock(title, subtitle) {
    const block = el("article", "visual-block");
    const head = el("div", "visual-block-head");
    const copy = el("div");
    copy.appendChild(el("h3", "", title));
    if (subtitle) copy.appendChild(el("p", "", subtitle));
    head.appendChild(copy);
    block.appendChild(head);
    return { block, head };
  }

  function appendAddButton(head, text, onClick) {
    head.appendChild(button(text, onClick, "small-button"));
  }

  function renderSiteEditor(root) {
    const { block } = visualBlock("Homepage Identity", "Hero, footer, RSS base URL, and lab contact copy.");
    const grid = el("div", "visual-grid two");
    const site = state.site;
    grid.appendChild(editable("Site name", site.name, (value) => (site.name = value)));
    grid.appendChild(editable("Full name", site.fullName, (value) => (site.fullName = value)));
    grid.appendChild(editable("Tagline", site.tagline, (value) => (site.tagline = value)));
    grid.appendChild(textInput("Website URL", site.url, (value) => (site.url = value), { type: "url" }));
    grid.appendChild(editable("Description", site.description, (value) => (site.description = value), { wide: true, multiline: true }));
    grid.appendChild(editable("Institution", site.institution, (value) => (site.institution = value), { wide: true }));
    grid.appendChild(editable("Address", site.address, (value) => (site.address = value), { wide: true }));
    grid.appendChild(editable("Email", site.email, (value) => (site.email = value), { wide: true }));
    block.appendChild(grid);
    root.appendChild(block);
  }

  function renderCopyEditor(root) {
    state.site.copy = state.site.copy || {};
    const fields = [
      ["Navigation: Research", "navResearch"],
      ["Navigation: News", "navNews"],
      ["Navigation: Publications", "navPublications"],
      ["Navigation: Seminar", "navSeminar"],
      ["Navigation: Team", "navTeam"],
      ["Navigation: Activity", "navActivity"],
      ["Navigation: RSS", "navRss"],
      ["Navigation: Admin", "navAdmin"],
      ["Header mark", "brandMark"],
      ["Header subtitle", "brandSubtitle"],
      ["Menu label", "menuLabel"],
      ["Theme button: modern", "themeModern"],
      ["Theme button: old-school", "themeOldSchool"],
      ["Theme title: modern", "themeModernTitle"],
      ["Theme title: old-school", "themeOldSchoolTitle"],
      ["Hero title", "heroTitle"],
      ["Hero link: Publications", "heroPublicationsLink"],
      ["Hero link: Seminar", "heroSeminarLink"],
      ["Hero link: Team", "heroTeamLink"],
      ["Hero link: RSS", "heroRssLink"],
      ["Home news title", "homeNewsTitle"],
      ["Home news expand", "homeNewsExpand"],
      ["Home news collapse", "homeNewsCollapse"],
      ["Archive note label", "archiveNoteLabel"],
      ["Archive note text", "archiveNoteText", true],
      ["Latest publication label", "latestPublicationLabel"],
      ["Latest seminar label", "latestSeminarLabel"],
      ["Archive timeline label", "archiveTimelineLabel"],
      ["Archive timeline text", "archiveTimelineText", true],
      ["Research eyebrow", "researchEyebrow"],
      ["Research title", "researchTitle"],
      ["Research axis prefix", "researchAxisPrefix"],
      ["News eyebrow", "newsEyebrow"],
      ["News title", "newsTitle"],
      ["Publications eyebrow", "publicationsEyebrow"],
      ["Publications title", "publicationsTitle"],
      ["Publication search placeholder", "publicationSearchPlaceholder"],
      ["Filter: All", "filterAll"],
      ["Filter: Conference", "filterConference"],
      ["Filter: Journal", "filterJournal"],
      ["Publication empty text", "publicationEmptyText", true],
      ["Seminar eyebrow", "seminarEyebrow"],
      ["Seminar title", "seminarTitle"],
      ["Seminar card label", "seminarTrackLabel"],
      ["Upload materials button", "uploadMaterials"],
      ["Submit issue button", "submitIssue"],
      ["Run workflow button", "runWorkflow"],
      ["Team eyebrow", "teamEyebrow"],
      ["Team title", "teamTitle"],
      ["Alumni title", "alumniTitle"],
      ["Activity eyebrow", "activityEyebrow"],
      ["Activity title", "activityTitle"],
      ["Maintain eyebrow", "maintainEyebrow"],
      ["Maintain title", "maintainTitle"],
      ["Operation 1 number", "operationPublicationIndex"],
      ["Operation 1 title", "operationPublicationTitle"],
      ["Operation 1 text", "operationPublicationText", true],
      ["Operation 2 number", "operationSeminarIndex"],
      ["Operation 2 title", "operationSeminarTitle"],
      ["Operation 2 text", "operationSeminarText", true],
      ["Operation 3 number", "operationGuideIndex"],
      ["Operation 3 title", "operationGuideTitle"],
      ["Operation 3 text", "operationGuideText", true],
      ["Footer RSS label", "footerRss"],
      ["ICP text", "beian"]
    ];
    const details = el("details", "visual-details");
    details.open = true;
    details.appendChild(el("summary", "", "Page Labels & Buttons"));
    const grid = el("div", "visual-grid two padded");
    fields.forEach(([label, key, multiline]) => {
      grid.appendChild(editable(label, state.site.copy[key], (value) => (state.site.copy[key] = value), {
        wide: multiline,
        multiline
      }));
    });
    details.appendChild(grid);
    root.appendChild(details);
  }

  function renderResearchEditor(root) {
    state.site.researchHighlights = state.site.researchHighlights || [];
    const { block, head } = visualBlock("Research Highlights", "Items shown in the What We Study section.");
    appendAddButton(head, "Add Research Item", () => {
      state.site.researchHighlights.push("New research direction");
      setDirty("Research item added. Commit to publish.");
      renderVisualEditor();
    });
    const list = el("div", "visual-list");
    state.site.researchHighlights.forEach((item, index) => {
      const row = el("div", "visual-row");
      row.appendChild(el("span", "row-index", String(index + 1).padStart(2, "0")));
      row.appendChild(editable("Text", item, (value) => (state.site.researchHighlights[index] = value), { wide: true }));
      row.appendChild(button("Delete", () => {
        state.site.researchHighlights.splice(index, 1);
        setDirty("Research item removed. Commit to publish.");
        renderVisualEditor();
      }, "danger small-button"));
      list.appendChild(row);
    });
    block.appendChild(list);
    root.appendChild(block);
  }

  function renderNewsEditor(root) {
    const { block, head } = visualBlock("News", "Announcements shown in the home News box and the News archive.");
    appendAddButton(head, "Add News", () => {
      state.news.unshift({ date: today(), text: "New announcement" });
      setDirty("News item added. Commit to publish.");
      renderVisualEditor();
    });
    const list = el("div", "visual-list");
    state.news.forEach((item, index) => {
      const row = el("div", "visual-row stacked");
      row.appendChild(textInput("Date", item.date, (value) => (item.date = value), { type: "date" }));
      row.appendChild(editable("News text", item.text, (value) => (item.text = value), { wide: true, multiline: true }));
      row.appendChild(button("Delete", () => {
        state.news.splice(index, 1);
        setDirty("News item removed. Commit to publish.");
        renderVisualEditor();
      }, "danger small-button"));
      list.appendChild(row);
    });
    block.appendChild(list);
    root.appendChild(block);
  }

  function renderPeopleGroup(container, key, title, fieldNames) {
    state.team[key] = state.team[key] || [];
    const group = el("section", "visual-subblock");
    const head = el("div", "visual-subhead");
    head.appendChild(el("h4", "", title));
    head.appendChild(button("Add Person", () => {
      const person = {};
      fieldNames.forEach((field) => (person[field] = field === "year" ? String(new Date().getFullYear()) : ""));
      person.name = "New Person";
      state.team[key].push(person);
      setDirty(`${title} entry added. Commit to publish.`);
      renderVisualEditor();
    }, "small-button"));
    group.appendChild(head);
    const list = el("div", "visual-card-list");
    state.team[key].forEach((person, index) => {
      const card = el("article", "visual-record");
      const fieldsGrid = el("div", "visual-grid two");
      fieldNames.forEach((field) => {
        fieldsGrid.appendChild(editable(field, person[field], (value) => (person[field] = value), {
          wide: field === "affiliation" || field === "address" || field === "destination"
        }));
      });
      card.appendChild(fieldsGrid);
      card.appendChild(button("Delete Person", () => {
        state.team[key].splice(index, 1);
        setDirty(`${title} entry removed. Commit to publish.`);
        renderVisualEditor();
      }, "danger small-button"));
      list.appendChild(card);
    });
    group.appendChild(list);
    container.appendChild(group);
  }

  function renderTeamEditor(root) {
    const { block } = visualBlock("Team", "Faculty, current students, and alumni shown on the Team section.");
    renderPeopleGroup(block, "faculty", "Faculty", ["name", "role", "affiliation", "address", "email"]);
    renderPeopleGroup(block, "current", "Current Members", ["name", "role", "email"]);
    renderPeopleGroup(block, "alumni", "Alumni", ["name", "year", "degree", "destination"]);
    root.appendChild(block);
  }

  function renderActivityEditor(root) {
    const { block, head } = visualBlock("Activity Archive", "Activities shown in the public archive.");
    appendAddButton(head, "Add Activity", () => {
      state.activities.unshift({ date: today(), title: "New activity", description: "" });
      setDirty("Activity added. Commit to publish.");
      renderVisualEditor();
    });
    const list = el("div", "visual-list");
    state.activities.forEach((item, index) => {
      const row = el("div", "visual-row stacked");
      row.appendChild(textInput("Date", item.date, (value) => (item.date = value), { type: "date" }));
      row.appendChild(editable("Title", item.title, (value) => (item.title = value), { wide: true }));
      row.appendChild(editable("Description", item.description, (value) => (item.description = value), { wide: true, multiline: true }));
      row.appendChild(button("Delete", () => {
        state.activities.splice(index, 1);
        setDirty("Activity removed. Commit to publish.");
        renderVisualEditor();
      }, "danger small-button"));
      list.appendChild(row);
    });
    block.appendChild(list);
    root.appendChild(block);
  }

  function renderPublicationVisualEditor(root) {
    const details = el("details", "visual-details");
    details.appendChild(el("summary", "", `Publications (${state.publications.length})`));
    const actions = el("div", "visual-actions");
    actions.appendChild(button("Add Publication", () => {
      const item = {
        id: `publication-${Date.now()}`,
        type: "conference",
        year: new Date().getFullYear(),
        authors: "",
        title: "New publication",
        venue: "",
        note: "",
        links: {},
        tags: []
      };
      state.publications.unshift(item);
      state.currentPublicationId = item.id;
      renderPublicationSelect();
      setDirty("Publication added. Commit to publish.");
      renderVisualEditor();
    }, "small-button"));
    details.appendChild(actions);
    const list = el("div", "visual-card-list");
    state.publications.forEach((item, index) => {
      const card = el("article", "visual-record");
      card.appendChild(el("strong", "record-title", item.title || "Untitled publication"));
      const grid = el("div", "visual-grid two");
      grid.appendChild(textInput("ID", item.id, (value) => (item.id = value || slugify(item.title))));
      grid.appendChild(selectInput("Type", item.type, ["conference", "journal", "dataset"], (value) => (item.type = value)));
      grid.appendChild(textInput("Year", item.year, (value) => (item.year = value), { type: "number" }));
      grid.appendChild(editable("Venue", item.venue, (value) => (item.venue = value)));
      grid.appendChild(editable("Title", item.title, (value) => (item.title = value), { wide: true }));
      grid.appendChild(editable("Authors", item.authors, (value) => (item.authors = value), { wide: true, multiline: true }));
      grid.appendChild(editable("Note", item.note, (value) => (item.note = value), { wide: true, multiline: true }));
      grid.appendChild(editable("Tags", (item.tags || []).join(", "), (value) => (item.tags = splitTags(value)), { wide: true }));
      grid.appendChild(linksEditor(item));
      card.appendChild(grid);
      card.appendChild(button("Delete Publication", () => {
        state.publications.splice(index, 1);
        renderPublicationSelect();
        setDirty("Publication removed. Commit to publish.");
        renderVisualEditor();
      }, "danger small-button"));
      list.appendChild(card);
    });
    details.appendChild(list);
    root.appendChild(details);
  }

  function renderSeminarVisualEditor(root) {
    const details = el("details", "visual-details");
    details.appendChild(el("summary", "", `Seminars (${state.seminars.length})`));
    const actions = el("div", "visual-actions");
    actions.appendChild(button("Add Seminar Metadata", () => {
      const item = {
        id: `${today()}-${Date.now()}`,
        date: today(),
        speaker: "",
        title: "New seminar",
        abstract: "",
        links: {},
        tags: []
      };
      state.seminars.unshift(item);
      setDirty("Seminar metadata added. Commit to publish.");
      renderVisualEditor();
    }, "small-button"));
    details.appendChild(actions);
    const list = el("div", "visual-card-list");
    state.seminars.forEach((item, index) => {
      const card = el("article", "visual-record");
      card.appendChild(el("strong", "record-title", item.title || "Untitled seminar"));
      const grid = el("div", "visual-grid two");
      grid.appendChild(textInput("ID", item.id, (value) => (item.id = value || slugify(item.title))));
      grid.appendChild(textInput("Date", item.date, (value) => (item.date = value), { type: "date" }));
      grid.appendChild(editable("Speaker", item.speaker, (value) => (item.speaker = value)));
      grid.appendChild(editable("Title", item.title, (value) => (item.title = value), { wide: true }));
      grid.appendChild(editable("Abstract", item.abstract, (value) => (item.abstract = value), { wide: true, multiline: true }));
      grid.appendChild(editable("Tags", (item.tags || []).join(", "), (value) => (item.tags = splitTags(value)), { wide: true }));
      grid.appendChild(linksEditor(item));
      card.appendChild(grid);
      card.appendChild(button("Delete Seminar", () => {
        state.seminars.splice(index, 1);
        setDirty("Seminar removed. Commit to publish.");
        renderVisualEditor();
      }, "danger small-button"));
      list.appendChild(card);
    });
    details.appendChild(list);
    root.appendChild(details);
  }

  function renderVisualEditor() {
    const root = $("visual-editor-root");
    if (!root) return;
    clear(root);
    if (!state.site) {
      root.appendChild(el("div", "empty", "Load data to open the visual editor."));
      return;
    }
    renderSiteEditor(root);
    renderCopyEditor(root);
    renderResearchEditor(root);
    renderNewsEditor(root);
    renderTeamEditor(root);
    renderActivityEditor(root);
    renderPublicationVisualEditor(root);
    renderSeminarVisualEditor(root);
  }

  function cleanString(value) {
    return String(value || "").trim();
  }

  function ensureLinks(item, label) {
    if (item._linksError) throw new Error(`${label} has invalid Links JSON: ${item._linksError}`);
    return item.links && typeof item.links === "object" && !Array.isArray(item.links) ? item.links : {};
  }

  function cleanSite() {
    const copy = {};
    Object.entries(state.site.copy || {}).forEach(([key, value]) => {
      copy[key] = cleanString(value);
    });
    const next = {
      ...state.site,
      name: cleanString(state.site.name),
      fullName: cleanString(state.site.fullName),
      url: cleanString(state.site.url),
      tagline: cleanString(state.site.tagline),
      description: cleanString(state.site.description),
      institution: cleanString(state.site.institution),
      address: cleanString(state.site.address),
      email: cleanString(state.site.email),
      researchHighlights: (state.site.researchHighlights || []).map(cleanString).filter(Boolean),
      copy
    };
    if (!next.name || !next.fullName || !next.repository) {
      throw new Error("Site name, full name, and repository settings are required.");
    }
    return next;
  }

  function cleanNews() {
    return state.news
      .map((item) => ({
        date: cleanString(item.date),
        text: cleanString(item.text)
      }))
      .filter((item) => item.date && item.text)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function cleanTeamGroup(items, keys) {
    return (items || [])
      .map((person) => {
        const next = {};
        keys.forEach((key) => {
          next[key] = cleanString(person[key]);
        });
        return next;
      })
      .filter((person) => person.name);
  }

  function cleanTeam() {
    return {
      faculty: cleanTeamGroup(state.team.faculty, ["name", "role", "affiliation", "address", "email"]),
      current: cleanTeamGroup(state.team.current, ["name", "role", "email"]),
      alumni: cleanTeamGroup(state.team.alumni, ["name", "year", "degree", "destination"])
    };
  }

  function cleanActivities() {
    return state.activities
      .map((item) => ({
        date: cleanString(item.date),
        title: cleanString(item.title),
        description: cleanString(item.description)
      }))
      .filter((item) => item.date && item.title)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function cleanPublications() {
    return state.publications
      .map((item) => {
        const title = cleanString(item.title);
        const year = Number(item.year);
        const next = {
          id: cleanString(item.id) || slugify(title),
          type: cleanString(item.type) || "conference",
          year,
          authors: cleanString(item.authors),
          title,
          venue: cleanString(item.venue),
          note: cleanString(item.note),
          links: ensureLinks(item, title || "Publication"),
          tags: (item.tags || []).map(cleanString).filter(Boolean)
        };
        if (!next.title || !next.authors || !next.venue || !next.year) {
          throw new Error(`Publication is incomplete: ${next.title || next.id}`);
        }
        return next;
      })
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || String(a.title).localeCompare(String(b.title)));
  }

  function cleanSeminars() {
    return state.seminars
      .map((item) => {
        const title = cleanString(item.title);
        const next = {
          id: cleanString(item.id) || slugify(`${item.date}-${title}`),
          date: cleanString(item.date),
          speaker: cleanString(item.speaker),
          title,
          links: ensureLinks(item, title || "Seminar"),
          tags: (item.tags || []).map(cleanString).filter(Boolean)
        };
        const abstract = cleanString(item.abstract);
        if (abstract) next.abstract = abstract;
        if (!next.date || !next.speaker || !next.title) throw new Error(`Seminar is incomplete: ${next.title || next.id}`);
        return next;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function visualFiles() {
    const cleaned = {
      site: cleanSite(),
      news: cleanNews(),
      team: cleanTeam(),
      activities: cleanActivities(),
      publications: cleanPublications(),
      seminars: cleanSeminars()
    };
    Object.assign(state, cleaned);
    return [
      { path: paths.site, content: `${JSON.stringify(cleaned.site, null, 2)}\n` },
      { path: paths.news, content: `${JSON.stringify(cleaned.news, null, 2)}\n` },
      { path: paths.team, content: `${JSON.stringify(cleaned.team, null, 2)}\n` },
      { path: paths.activities, content: `${JSON.stringify(cleaned.activities, null, 2)}\n` },
      { path: paths.publications, content: `${JSON.stringify(cleaned.publications, null, 2)}\n` },
      { path: paths.seminars, content: `${JSON.stringify(cleaned.seminars, null, 2)}\n` }
    ];
  }

  async function commitVisualChanges() {
    if (!state.site) throw new Error("Load data before committing website content.");
    setStatus("Committing all website content...", "pending");
    const commit = await commitFiles("Update website content", visualFiles());
    state.visualDirty = false;
    renderPublicationSelect();
    renderVisualEditor();
    $("visual-dirty").textContent = `Committed all website content: ${commit.sha.slice(0, 7)}`;
    setStatus(`All website content committed: ${commit.sha.slice(0, 7)}`);
  }

  function renderPublicationSelect() {
    const select = fields.pubSelect;
    select.innerHTML = "";
    state.publications
      .slice()
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || String(a.title).localeCompare(String(b.title)))
      .forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = `${item.year || "----"} · ${item.title}`;
        select.appendChild(option);
      });
    if (select.options.length) {
      select.value = state.currentPublicationId || select.options[0].value;
      fillPublication(select.value);
    }
  }

  function fillPublication(id) {
    const item = state.publications.find((entry) => entry.id === id);
    state.currentPublicationId = id;
    if (!item) return;
    fields.pubId.value = item.id || "";
    fields.pubTitle.value = item.title || "";
    fields.pubAuthors.value = item.authors || "";
    fields.pubVenue.value = item.venue || "";
    fields.pubYear.value = item.year || "";
    fields.pubType.value = item.type || "conference";
    fields.pubTags.value = (item.tags || []).join(", ");
    fields.pubNote.value = item.note || "";
    fields.pubLinks.value = JSON.stringify(item.links || {}, null, 2);
  }

  function readPublicationForm() {
    const linksText = fields.pubLinks.value.trim() || "{}";
    let links;
    try {
      links = JSON.parse(linksText);
    } catch (error) {
      throw new Error(`Links JSON is invalid: ${error.message}`);
    }
    const item = {
      id: fields.pubId.value.trim() || slugify(fields.pubTitle.value),
      type: fields.pubType.value,
      year: Number(fields.pubYear.value),
      authors: fields.pubAuthors.value.trim(),
      title: fields.pubTitle.value.trim(),
      venue: fields.pubVenue.value.trim(),
      note: fields.pubNote.value.trim(),
      links,
      tags: splitTags(fields.pubTags.value)
    };
    if (!item.title || !item.authors || !item.venue || !item.year) {
      throw new Error("Title, authors, venue, and year are required.");
    }
    return item;
  }

  function savePublicationDraft() {
    const item = readPublicationForm();
    const index = state.publications.findIndex((entry) => entry.id === state.currentPublicationId);
    if (index >= 0) {
      state.publications[index] = item;
    } else {
      state.publications.unshift(item);
    }
    state.currentPublicationId = item.id;
    renderPublicationSelect();
    renderVisualEditor();
    setStatus(`Draft saved locally: ${item.title}`);
    return item;
  }

  async function commitPublications() {
    setStatus("Committing publications...", "pending");
    savePublicationDraft();
    state.publications.sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || String(a.title).localeCompare(String(b.title)));
    const commit = await commitFiles("Update publications", [
      {
        path: paths.publications,
        content: `${JSON.stringify(state.publications, null, 2)}\n`
      }
    ]);
    renderVisualEditor();
    setStatus(`Publications committed: ${commit.sha.slice(0, 7)}`);
  }

  function newPublication() {
    state.currentPublicationId = "";
    fields.pubSelect.value = "";
    fields.pubId.value = "";
    fields.pubTitle.value = "";
    fields.pubAuthors.value = "";
    fields.pubVenue.value = "";
    fields.pubYear.value = new Date().getFullYear();
    fields.pubType.value = "conference";
    fields.pubTags.value = "";
    fields.pubNote.value = "";
    fields.pubLinks.value = "{\n  \"pdf\": \"\"\n}";
  }

  function deletePublication() {
    if (!state.currentPublicationId) return;
    const item = state.publications.find((entry) => entry.id === state.currentPublicationId);
    if (!item || !window.confirm(`Delete publication: ${item.title}?`)) return;
    state.publications = state.publications.filter((entry) => entry.id !== state.currentPublicationId);
    state.currentPublicationId = "";
    renderPublicationSelect();
    renderVisualEditor();
    setStatus("Publication removed from local draft. Commit to publish the change.");
  }

  async function commitSeminar() {
    setStatus("Preparing seminar commit...", "pending");
    if (!state.site) await loadData();
    const title = $("seminar-title").value.trim();
    const speaker = $("seminar-speaker").value.trim();
    const date = $("seminar-date").value;
    if (!title || !speaker || !date) throw new Error("Seminar title, speaker, and date are required.");

    const year = date.slice(0, 4);
    const slug = `${date}-${slugify(title)}`;
    const links = {};
    const files = [];
    const paperUrl = $("seminar-paper-url").value.trim();
    const slidesUrl = $("seminar-slides-url").value.trim();
    if (paperUrl) links.paper = paperUrl;
    if (slidesUrl) links.slides = slidesUrl;

    const fileInputs = [
      { id: "seminar-paper-file", key: "paper" },
      { id: "seminar-slides-file", key: "slides" },
      { id: "seminar-extra-file", key: "supplement" }
    ];
    for (const item of fileInputs) {
      const file = $(item.id).files[0];
      if (!file) continue;
      const repoPath = `assets/seminars/${year}/${slug}/${safeName(file.name)}`;
      links[item.key] = repoPath;
      files.push({
        path: repoPath,
        content: await fileToBase64(file),
        encoding: "base64"
      });
    }

    const record = {
      id: slug,
      date,
      speaker,
      title,
      abstract: $("seminar-abstract").value.trim(),
      links,
      tags: splitTags($("seminar-tags").value)
    };

    const nextSeminars = [record, ...state.seminars.filter((item) => item.id !== record.id)].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );
    files.push({
      path: paths.seminars,
      content: `${JSON.stringify(nextSeminars, null, 2)}\n`
    });

    const commit = await commitFiles(`Add seminar: ${title}`, files);
    state.seminars = nextSeminars;
    renderVisualEditor();
    setStatus(`Seminar committed: ${commit.sha.slice(0, 7)}`);
  }

  async function loadData() {
    setStatus("Loading site data...", "pending");
    const [site, news, team, publications, seminars, activities] = await Promise.all([
      loadJson(paths.site),
      loadJson(paths.news),
      loadJson(paths.team),
      loadJson(paths.publications),
      loadJson(paths.seminars),
      loadJson(paths.activities)
    ]);
    state.site = site;
    state.news = news;
    state.team = {
      faculty: team.faculty || [],
      current: team.current || [],
      alumni: team.alumni || []
    };
    state.publications = publications;
    state.seminars = seminars;
    state.activities = activities;
    state.visualDirty = false;
    renderPublicationSelect();
    renderVisualEditor();
    $("visual-dirty").textContent = "Loaded. Click text in the Visual Editor to edit.";
    setStatus(
      `Loaded ${state.publications.length} publications, ${state.seminars.length} seminars, ${state.news.length} news items, and ${state.activities.length} activities.`
    );
  }

  function bind() {
    applyRouteMode();
    window.addEventListener("hashchange", applyRouteMode);

    fields.pubSelect = $("publication-select");
    fields.pubId = $("pub-id");
    fields.pubTitle = $("pub-title");
    fields.pubAuthors = $("pub-authors");
    fields.pubVenue = $("pub-venue");
    fields.pubYear = $("pub-year");
    fields.pubType = $("pub-type");
    fields.pubTags = $("pub-tags");
    fields.pubNote = $("pub-note");
    fields.pubLinks = $("pub-links");

    const cachedToken = sessionStorage.getItem("vie-github-token");
    if (cachedToken) {
      $("github-token").value = cachedToken;
      $("remember-token").checked = true;
    }

    $("remember-token").addEventListener("change", () => {
      if ($("remember-token").checked) {
        sessionStorage.setItem("vie-github-token", $("github-token").value.trim());
      } else {
        sessionStorage.removeItem("vie-github-token");
      }
    });
    $("github-token").addEventListener("input", () => {
      if ($("remember-token").checked) {
        sessionStorage.setItem("vie-github-token", $("github-token").value.trim());
      }
    });
    $("load-data").addEventListener("click", () => loadData().catch((error) => setStatus(error.message, "error")));
    $("rerender-visual").addEventListener("click", () => {
      renderVisualEditor();
      setStatus("Visual editor refreshed.");
    });
    $("commit-visual").addEventListener("click", () => commitVisualChanges().catch((error) => setStatus(error.message, "error")));
    fields.pubSelect.addEventListener("change", () => fillPublication(fields.pubSelect.value));
    $("new-publication").addEventListener("click", newPublication);
    $("delete-publication").addEventListener("click", () => {
      try {
        deletePublication();
      } catch (error) {
        setStatus(error.message, "error");
      }
    });
    $("save-publication").addEventListener("click", () => {
      try {
        savePublicationDraft();
      } catch (error) {
        setStatus(error.message, "error");
      }
    });
    $("commit-publications").addEventListener("click", () => commitPublications().catch((error) => setStatus(error.message, "error")));
    $("commit-seminar").addEventListener("click", () => commitSeminar().catch((error) => setStatus(error.message, "error")));

    $("seminar-date").value = new Date().toISOString().slice(0, 10);
    loadData().catch((error) => setStatus(`Loaded local preview only. ${error.message}`, "error"));
  }

  bind();
})();
