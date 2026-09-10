(function () {
  var repoOwner = "vie-group";
  var repoName = "vie-group-content";
  var issueLabel = "seminar-edit";
  var defaultSource = {
    dataBaseUrl: "https://vie-group.github.io/vie-group-content/data/",
    assetBaseUrl: "https://vie-group.github.io/vie-group-content/",
    rssUrl: "https://vie-group.github.io/vie-group-content/rss.xml"
  };
  var source = defaultSource;
  var seminars = [];

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

  function isValidDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
    return [record.date, record.speaker, record.title].filter(Boolean).join(" | ");
  }

  function searchText(record) {
    return [record.id, record.date, record.speaker, record.title].join(" ").toLowerCase();
  }

  function selectedRecord() {
    var id = $("seminar-select").value;
    return seminars.find(function (record) {
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
    any = renderMaterialLink(node, "Image", links.image) || any;
    any = renderMaterialLink(node, "Paper", links.paper) || any;
    any = renderMaterialLink(node, "Slides", links.slides) || any;
    any = renderMaterialLink(node, "Code", links.code) || any;
    any = renderMaterialLink(node, "Video", links.video) || any;
    if (!any) node.appendChild(document.createTextNode("This seminar currently has no material links."));
  }

  function fillForm(record) {
    if (!record) {
      $("seminar-original-id").value = "";
      $("seminar-date").value = "";
      $("seminar-speaker").value = "";
      $("seminar-title").value = "";
      $("seminar-image-url").value = "";
      $("seminar-paper-url").value = "";
      $("seminar-slides-url").value = "";
      $("seminar-code-url").value = "";
      $("seminar-video-url").value = "";
      $("seminar-tags").value = "";
      $("seminar-abstract").value = "";
      $("existing-materials").textContent = "Select a seminar to inspect current material links.";
      setFormReady(false);
      return;
    }

    var links = record.links || {};
    $("seminar-original-id").value = record.id || "";
    $("seminar-date").value = record.date || "";
    $("seminar-speaker").value = record.speaker || "";
    $("seminar-title").value = record.title || "";
    $("seminar-image-url").value = links.image || "";
    $("seminar-paper-url").value = links.paper || "";
    $("seminar-slides-url").value = links.slides || "";
    $("seminar-code-url").value = links.code || "";
    $("seminar-video-url").value = links.video || "";
    $("seminar-tags").value = Array.isArray(record.tags) ? record.tags.join(", ") : clean(record.tags);
    $("seminar-abstract").value = record.abstract || "";
    renderExistingMaterials(record);
    setFormReady(true);
    setStatus("Ready to create an edit issue for " + record.id + ".", "ok");
  }

  function renderOptions(selectedId) {
    var select = $("seminar-select");
    var term = clean($("seminar-search").value).toLowerCase();
    var matches = seminars.filter(function (record) {
      return !term || searchText(record).indexOf(term) !== -1;
    });
    clearChildren(select);

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = matches.length ? "Select a seminar..." : "No matching seminar records";
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

  async function loadSeminars() {
    var response = await fetch(contentUrl("seminars.json", "dataBaseUrl"), { cache: "no-cache" });
    if (!response.ok) throw new Error("seminars.json: " + response.status);
    return response.json();
  }

  function formData() {
    return {
      id: clean($("seminar-original-id").value),
      date: clean($("seminar-date").value),
      speaker: clean($("seminar-speaker").value),
      title: clean($("seminar-title").value),
      imageUrl: clean($("seminar-image-url").value),
      paperUrl: clean($("seminar-paper-url").value),
      slidesUrl: clean($("seminar-slides-url").value),
      codeUrl: clean($("seminar-code-url").value),
      videoUrl: clean($("seminar-video-url").value),
      tags: clean($("seminar-tags").value),
      abstract: clean($("seminar-abstract").value)
    };
  }

  function issueBody(data) {
    return [
      "### How to edit\n1. Keep the Original Seminar ID unchanged.\n2. Date, Speaker, and Title are required and may be changed.\n3. URL fields below are the full desired final values: keep a URL/path to retain it, or leave it blank to clear it.\n4. To replace image, paper, or slides with a local file, drag the file into the matching Attachment section below. The uploaded attachment overrides the URL field and will be copied into the content repository.\n",
      field("Original Seminar ID", data.id),
      field("Date", data.date),
      field("Speaker", data.speaker),
      field("Title", data.title),
      field("Image URL", data.imageUrl),
      attachmentField("Image Attachment", "Drag replacement image here, or leave this line unchanged."),
      field("Paper URL", data.paperUrl),
      attachmentField("Paper Attachment", "Drag replacement paper PDF here, or leave this line unchanged."),
      field("Slides URL", data.slidesUrl),
      attachmentField("Slides Attachment", "Drag replacement slides PDF/PPT here, or leave this line unchanged."),
      field("Code URL", data.codeUrl),
      field("Video URL", data.videoUrl),
      field("Tags", data.tags),
      field("Abstract", data.abstract),
      field("Edit Note", "Generated from https://www.vie.group/edit-seminar/.")
    ].join("\n");
  }

  function buildIssueUrl(data) {
    var params = new URLSearchParams();
    params.set("title", "[Edit Seminar] " + data.id);
    params.set("body", issueBody(data));
    params.set("labels", issueLabel);
    return "https://github.com/" + repoOwner + "/" + repoName + "/issues/new?" + params.toString();
  }

  function submit(event) {
    event.preventDefault();
    var data = formData();
    if (!data.id) {
      setStatus("Select a seminar record first.", "error");
      return;
    }
    if (!isValidDate(data.date)) {
      setStatus("Date must use YYYY-MM-DD.", "error");
      return;
    }
    if (!data.speaker || !data.title) {
      setStatus("Speaker and title are required.", "error");
      return;
    }
    if (
      !isValidLink(data.imageUrl) ||
      !isValidLink(data.paperUrl) ||
      !isValidLink(data.slidesUrl) ||
      !isValidLink(data.codeUrl) ||
      !isValidLink(data.videoUrl)
    ) {
      setStatus("URLs must be http(s), mailto, or repository paths under media/ or assets/.", "error");
      return;
    }

    var url = buildIssueUrl(data);
    if (url.length > 8000) {
      setStatus("The generated issue is too long. Shorten the abstract, or use the GitHub edit issue template directly.", "error");
      return;
    }

    setStatus("Opening GitHub edit issue...", "ok");
    window.location.href = url;
  }

  async function boot() {
    var requestedId = new URLSearchParams(window.location.search).get("id") || "";
    try {
      await loadSource();
      seminars = (await loadSeminars()).sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
      renderOptions(requestedId);
      if (requestedId && !$("seminar-select").value) {
        setStatus("Seminar id not found: " + requestedId, "error");
      } else if (!requestedId) {
        setStatus("Choose a seminar record to edit.", "");
      }
    } catch (error) {
      $("seminar-select").innerHTML = '<option value="">Could not load seminar records</option>';
      setStatus("Could not load seminar records from the content repository.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("seminar-edit-form").addEventListener("submit", submit);
    $("seminar-select").addEventListener("change", function () {
      fillForm(selectedRecord());
    });
    $("seminar-search").addEventListener("input", function () {
      renderOptions($("seminar-select").value);
    });
    boot();
  });
})();
