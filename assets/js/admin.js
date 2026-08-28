(function () {
  const paths = {
    publications: "data/publications.json",
    seminars: "data/seminars.json"
  };

  const state = {
    publications: [],
    seminars: [],
    currentPublicationId: ""
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
    setStatus("Publication removed from local draft. Commit to publish the change.");
  }

  async function commitSeminar() {
    setStatus("Preparing seminar commit...", "pending");
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
    setStatus(`Seminar committed: ${commit.sha.slice(0, 7)}`);
  }

  async function loadData() {
    setStatus("Loading site data...", "pending");
    state.publications = await loadJson(paths.publications);
    state.seminars = await loadJson(paths.seminars);
    renderPublicationSelect();
    setStatus(`Loaded ${state.publications.length} publications and ${state.seminars.length} seminars.`);
  }

  function bind() {
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
