(function () {
  var repoOwner = "vie-group";
  var repoName = "vie-group-content";
  var issueLabel = "publication-edit";
  var defaultSource = {
    dataBaseUrl: "https://vie-group.github.io/vie-group-content/data/",
    assetBaseUrl: "https://vie-group.github.io/vie-group-content/",
    rssUrl: "https://vie-group.github.io/vie-group-content/rss.xml"
  };
  var source = defaultSource;
  var publications = [];

  function $(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function cleanBase(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function contentUrl(path, baseKey) {
    var cleanPath = String(path || "").replace(/^\/+/, "");
    var base = cleanBase(source[baseKey] || source.rawBaseUrl || defaultSource[baseKey]);
    if (baseKey === "dataBaseUrl" && /^data\//i.test(cleanPath)) {
      cleanPath = cleanPath.replace(/^data\//i, "");
    }
    return base + "/" + cleanPath;
  }

  function resolveHref(href) {
    var value = clean(href);
    if (!value) return "";
    if (/^(https?:|mailto:)/i.test(value)) return value;
    if (/^\/?assets\//i.test(value)) return contentUrl(value, "assetBaseUrl");
    if (/^\/?media\//i.test(value)) return "/" + value.replace(/^\/+/, "");
    return "";
  }

  function setStatus(message, tone) {
    var node = $("edit-status");
    if (!node) return;
    node.textContent = message;
    node.className = tone || "";
  }

  function isValidLink(value) {
    if (!value) return true;
    return /^(https?:\/\/|mailto:|media\/|assets\/|\/media\/|\/assets\/)/i.test(value);
  }

  function field(label, value) {
    return "### " + label + "\n" + clean(value) + "\n";
  }

  function attachmentField(label, text) {
    return "### " + label + "\n" + text + "\n";
  }

  function recordLabel(record) {
    return [record.year, record.venue, record.title].filter(Boolean).join(" | ");
  }

  function searchText(record) {
    return [record.id, record.year, record.type, record.authors, record.title, record.venue, record.note]
      .join(" ")
      .toLowerCase();
  }

  function selectedRecord() {
    var id = $("publication-select").value;
    return publications.find(function (record) {
      return record.id === id;
    });
  }

  function setFormReady(ready) {
    $("commit-edit").disabled = !ready;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderMaterialLink(container, label, href) {
    var raw = clean(href);
    if (!raw) return false;
    var resolved = resolveHref(raw);
    var strong = document.createElement("strong");
    strong.appendChild(document.createTextNode(label + ": "));
    container.appendChild(strong);
    if (resolved) {
      var link = document.createElement("a");
      link.href = resolved;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.appendChild(document.createTextNode(raw));
      container.appendChild(link);
    } else {
      container.appendChild(document.createTextNode(raw));
    }
    container.appendChild(document.createElement("br"));
    return true;
  }

  function renderExistingMaterials(record) {
    var node = $("existing-materials");
    clearChildren(node);
    var links = record.links || {};
    var any = false;
    any = renderMaterialLink(node, "PDF", links.pdf) || any;
    any = renderMaterialLink(node, "Slide", links.slide) || any;
    any = renderMaterialLink(node, "Poster", links.poster) || any;
    any = renderMaterialLink(node, "Code", links.code) || any;
    if (!any) node.appendChild(document.createTextNode("This publication currently has no material links."));
  }

  function fillForm(record) {
    if (!record) {
      $("publication-original-id").value = "";
      $("publication-visible-id").value = "";
      $("publication-year").value = "";
      $("publication-type").value = "conference";
      $("publication-authors").value = "";
      $("publication-title").value = "";
      $("publication-venue").value = "";
      $("publication-note").value = "";
      $("publication-pdf-url").value = "";
      $("publication-slide-url").value = "";
      $("publication-poster-url").value = "";
      $("publication-code-url").value = "";
      $("publication-tags").value = "";
      $("existing-materials").textContent = "Select a publication to inspect current material links.";
      setFormReady(false);
      return;
    }

    var links = record.links || {};
    $("publication-original-id").value = record.id || "";
    $("publication-visible-id").value = record.id || "";
    $("publication-year").value = record.year || "";
    $("publication-type").value = record.type || "conference";
    $("publication-authors").value = record.authors || "";
    $("publication-title").value = record.title || "";
    $("publication-venue").value = record.venue || "";
    $("publication-note").value = record.note || "";
    $("publication-pdf-url").value = links.pdf || "";
    $("publication-slide-url").value = links.slide || "";
    $("publication-poster-url").value = links.poster || "";
    $("publication-code-url").value = links.code || "";
    $("publication-tags").value = Array.isArray(record.tags) ? record.tags.join(", ") : clean(record.tags);
    renderExistingMaterials(record);
    setFormReady(true);
    setStatus("Ready to create an edit issue for " + record.id + ".", "ok");
  }

  function renderOptions(selectedId) {
    var select = $("publication-select");
    var term = clean($("publication-search").value).toLowerCase();
    var matches = publications.filter(function (record) {
      return !term || searchText(record).indexOf(term) !== -1;
    });
    clearChildren(select);

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = matches.length ? "Select a publication..." : "No matching publication records";
    select.appendChild(placeholder);

    matches.forEach(function (record) {
      var option = document.createElement("option");
      option.value = record.id;
      option.textContent = recordLabel(record);
      select.appendChild(option);
    });

    select.disabled = false;
    if (selectedId && matches.some(function (record) { return record.id === selectedId; })) {
      select.value = selectedId;
    } else {
      select.value = "";
    }
    fillForm(selectedRecord());
  }

  async function loadSource() {
    try {
      var response = await fetch("/content-source.json", { cache: "no-cache" });
      if (!response.ok) return;
      var config = await response.json();
      source = Object.assign({}, source, config);
    } catch (error) {
      // Keep the default published content source when local config is unavailable.
    }
  }

  async function loadPublications() {
    var response = await fetch(contentUrl("publications.json", "dataBaseUrl"), { cache: "no-cache" });
    if (!response.ok) throw new Error("publications.json: " + response.status);
    return response.json();
  }

  function formData() {
    return {
      id: clean($("publication-original-id").value),
      year: clean($("publication-year").value),
      type: clean($("publication-type").value),
      authors: clean($("publication-authors").value),
      title: clean($("publication-title").value),
      venue: clean($("publication-venue").value),
      note: clean($("publication-note").value),
      pdfUrl: clean($("publication-pdf-url").value),
      slideUrl: clean($("publication-slide-url").value),
      posterUrl: clean($("publication-poster-url").value),
      codeUrl: clean($("publication-code-url").value),
      tags: clean($("publication-tags").value)
    };
  }

  function issueBody(data) {
    return [
      "### How to edit\n1. Keep the Original Publication ID unchanged.\n2. Year, Type, Authors, Title, and Venue are required and may be changed.\n3. URL fields below are the full desired final values: keep a URL/path to retain it, or leave it blank to clear it.\n4. To replace PDF, slide, poster, or code with a local file, drag the file into the matching Attachment section below. The uploaded attachment overrides the URL field and will be copied into the content repository.\n",
      field("Original Publication ID", data.id),
      field("Year", data.year),
      field("Type", data.type),
      field("Authors", data.authors),
      field("Title", data.title),
      field("Venue", data.venue),
      field("Note", data.note),
      field("PDF URL", data.pdfUrl),
      attachmentField("PDF Attachment", "Drag replacement PDF here, or leave this line unchanged."),
      field("Slide URL", data.slideUrl),
      attachmentField("Slide Attachment", "Drag replacement slides PDF/PPT here, or leave this line unchanged."),
      field("Poster URL", data.posterUrl),
      attachmentField("Poster Attachment", "Drag replacement poster PDF/image here, or leave this line unchanged."),
      field("Code URL", data.codeUrl),
      attachmentField("Code Attachment", "Drag replacement code zip here, or leave this line unchanged."),
      field("Tags", data.tags),
      field("Edit Note", "Generated from https://www.vie.group/edit-publication/.")
    ].join("\n");
  }

  function buildIssueUrl(data) {
    var params = new URLSearchParams();
    params.set("title", "[Edit Publication] " + data.id);
    params.set("body", issueBody(data));
    params.set("labels", issueLabel);
    return "https://github.com/" + repoOwner + "/" + repoName + "/issues/new?" + params.toString();
  }

  function submit(event) {
    event.preventDefault();
    var data = formData();
    var year = Number(data.year);
    if (!data.id) {
      setStatus("Select a publication record first.", "error");
      return;
    }
    if (!Number.isInteger(year)) {
      setStatus("Year must be an integer.", "error");
      return;
    }
    if (!/^(conference|journal|dataset)$/.test(data.type)) {
      setStatus("Type must be conference, journal, or dataset.", "error");
      return;
    }
    if (!data.authors || !data.title || !data.venue) {
      setStatus("Authors, title, and venue are required.", "error");
      return;
    }
    if (!isValidLink(data.pdfUrl) || !isValidLink(data.slideUrl) || !isValidLink(data.posterUrl) || !isValidLink(data.codeUrl)) {
      setStatus("URLs must be http(s), mailto, or repository paths under media/ or assets/.", "error");
      return;
    }

    var url = buildIssueUrl(data);
    if (url.length > 8000) {
      setStatus("The generated issue is too long. Shorten the note, or use the GitHub edit issue template directly.", "error");
      return;
    }

    setStatus("Opening GitHub edit issue...", "ok");
    window.location.href = url;
  }

  async function boot() {
    var requestedId = new URLSearchParams(window.location.search).get("id") || "";
    try {
      await loadSource();
      publications = (await loadPublications()).sort(function (a, b) {
        return Number(b.year || 0) - Number(a.year || 0) || String(a.title).localeCompare(String(b.title));
      });
      renderOptions(requestedId);
      if (requestedId && !$("publication-select").value) {
        setStatus("Publication id not found: " + requestedId, "error");
      } else if (!requestedId) {
        setStatus("Choose a publication record to edit.", "");
      }
    } catch (error) {
      $("publication-select").innerHTML = '<option value="">Could not load publication records</option>';
      setStatus("Could not load publication records from the content repository.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var advanced = document.querySelector(".publication-advanced");
    if (advanced) {
      var updateAdvancedVisibility = function () {
        advanced.classList.toggle("is-collapsed", !advanced.open);
        Array.prototype.forEach.call(advanced.children, function (child) {
          if (child.tagName && child.tagName.toLowerCase() === "summary") return;
          child.style.display = advanced.open ? "" : "none";
        });
      };
      updateAdvancedVisibility();
      advanced.addEventListener("toggle", function () {
        updateAdvancedVisibility();
      });
    }
    $("publication-edit-form").addEventListener("submit", submit);
    $("publication-select").addEventListener("change", function () {
      fillForm(selectedRecord());
    });
    $("publication-search").addEventListener("input", function () {
      renderOptions($("publication-select").value);
    });
    boot();
  });
})();
