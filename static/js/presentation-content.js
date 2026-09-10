(function () {
  var defaultSource = {
    dataBaseUrl: "https://vie-group.github.io/vie-group-content/data/",
    assetBaseUrl: "https://vie-group.github.io/vie-group-content/",
    rssUrl: "https://vie-group.github.io/vie-group-content/rss.xml"
  };
  var source = defaultSource;

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
    var value = String(href || "").trim();
    if (!value) return "";
    if (/^(https?:|mailto:)/i.test(value)) return value;
    if (/^\/?assets\//i.test(value)) return contentUrl(value, "assetBaseUrl");
    if (/^\/?media\//i.test(value)) return "/" + value.replace(/^\/+/, "");
    return "";
  }

  function parseDate(value) {
    var date = new Date(String(value || "") + "T00:00:00Z");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function displayDate(value) {
    var date = parseDate(value);
    if (!date) return String(value || "");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    });
  }

  function text(value) {
    return document.createTextNode(String(value || ""));
  }

  function makeCell(width) {
    var td = document.createElement("td");
    td.style.width = width;
    return td;
  }

  function makeMissingImage() {
    var span = document.createElement("span");
    span.className = "archive-missing-image";
    span.style.width = "160px";
    span.style.minHeight = "100px";
    span.textContent = "archived image unavailable";
    return span;
  }

  function makeImage(record) {
    var imageHref = resolveHref(record.links && record.links.image);
    if (!imageHref) return makeMissingImage();
    var image = document.createElement("img");
    image.src = imageHref;
    image.width = 160;
    image.onerror = function () {
      if (window.archiveMissingImage) window.archiveMissingImage(image);
    };
    return image;
  }

  function makeMaterialLink(label, href) {
    var resolved = resolveHref(href);
    if (!resolved) return null;
    var link = document.createElement("a");
    link.href = resolved;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    return link;
  }

  function appendMaterial(container, label, href) {
    var link = makeMaterialLink(label, href);
    if (!link) return;
    container.appendChild(link);
    container.appendChild(text("  "));
  }

  function seminarRow(record) {
    var row = document.createElement("tr");
    row.setAttribute("data-content-seminar-id", record.id || "");

    var imageCell = makeCell("20%");
    imageCell.appendChild(makeImage(record));
    row.appendChild(imageCell);

    var bodyCell = makeCell("80%");
    var summary = document.createElement("p");
    var titleFont = document.createElement("font");
    titleFont.setAttribute("size", "3");
    var title = document.createElement("b");
    title.appendChild(text(record.title));
    titleFont.appendChild(title);
    summary.appendChild(titleFont);
    summary.appendChild(document.createElement("br"));

    var speakerFont = document.createElement("font");
    speakerFont.setAttribute("size", "2");
    speakerFont.appendChild(text(record.speaker));
    speakerFont.appendChild(document.createElement("br"));
    summary.appendChild(speakerFont);

    var dateNode = document.createElement("i");
    dateNode.appendChild(text(displayDate(record.date)));
    summary.appendChild(dateNode);
    bodyCell.appendChild(summary);

    var links = document.createElement("p");
    var recordLinks = record.links || {};
    appendMaterial(links, "PDF", recordLinks.paper);
    appendMaterial(links, "PPT", recordLinks.slides);
    appendMaterial(links, "CODE", recordLinks.code);
    appendMaterial(links, "VIDEO", recordLinks.video);
    bodyCell.appendChild(links);
    row.appendChild(bodyCell);

    return row;
  }

  function separatorRow(record) {
    var row = document.createElement("tr");
    row.setAttribute("data-content-seminar-separator", record.id || "");
    var cell = document.createElement("td");
    cell.colSpan = 2;
    var line = document.createElement("div");
    line.className = "archive-separator";
    cell.appendChild(line);
    row.appendChild(cell);
    return row;
  }

  async function loadSource() {
    try {
      var response = await fetch("/content-source.json", { cache: "no-cache" });
      if (!response.ok) return;
      var config = await response.json();
      source = Object.assign({}, source, config);
    } catch (error) {
      // Keep the hard-coded content source when the local config cannot be loaded.
    }
  }

  async function loadSeminars() {
    var response = await fetch(contentUrl("seminars.json", "dataBaseUrl"), { cache: "no-cache" });
    if (!response.ok) throw new Error("seminars.json: " + response.status);
    return response.json();
  }

  function render(records) {
    var body = document.getElementById("content-seminar-rows");
    if (!body) return;

    var renderedRecords = records
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });

    while (body.firstChild) body.removeChild(body.firstChild);
    renderedRecords.forEach(function (record) {
      body.appendChild(seminarRow(record));
      body.appendChild(separatorRow(record));
    });

    var status = document.getElementById("content-seminar-status");
    if (status) {
      status.textContent = renderedRecords.length
        ? "Loaded seminar list from the content repository."
        : "No seminar records are published in the content repository.";
    }
  }

  async function boot() {
    var status = document.getElementById("content-seminar-status");
    try {
      await loadSource();
      render(await loadSeminars());
    } catch (error) {
      if (status) status.textContent = "Could not load seminar records from the content repository.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
