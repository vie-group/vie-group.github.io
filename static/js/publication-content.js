(function () {
  var defaultSource = {
    dataBaseUrl: "https://vie-group.github.io/vie-group-content/data/",
    assetBaseUrl: "https://vie-group.github.io/vie-group-content/",
    rssUrl: "https://vie-group.github.io/vie-group-content/rss.xml"
  };
  var source = defaultSource;
  var manageMode = hasManageFlag();
  var typeOrder = ["journal", "conference", "dataset"];
  var typeTitles = {
    journal: "Journal Publications",
    conference: "Conference Publications",
    dataset: "Datasets"
  };
  var linkLabels = {
    pdf: "pdf",
    code: "code",
    slide: "slide",
    poster: "poster"
  };

  function hasManageFlag() {
    try {
      var params = new URLSearchParams(window.location.search);
      return /^(1|true|yes)$/i.test(params.get("manage") || "") ||
        /^(1|true|yes)$/i.test(params.get("seminar_manage") || "");
    } catch (error) {
      return false;
    }
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
    var value = String(href || "").trim();
    if (!value) return "";
    if (/^(https?:|mailto:)/i.test(value)) return value;
    if (/^\/?assets\//i.test(value)) return contentUrl(value, "assetBaseUrl");
    if (/^\/?media\//i.test(value)) return "/" + value.replace(/^\/+/, "");
    return "";
  }

  function text(value) {
    return document.createTextNode(String(value || ""));
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function titleTable(title) {
    var table = document.createElement("table");
    table.width = "1000";
    table.align = "center";
    table.border = "0";
    var tbody = document.createElement("tbody");

    var titleRow = document.createElement("tr");
    var titleCell = document.createElement("td");
    titleCell.className = "publications";
    titleCell.appendChild(text(title));
    titleRow.appendChild(titleCell);
    tbody.appendChild(titleRow);

    var separatorRow = document.createElement("tr");
    var separatorCell = document.createElement("td");
    var separator = document.createElement("img");
    separator.src = "/static/pics/separator.png";
    separator.width = 1000;
    separator.height = 2;
    separator.onerror = function () {
      if (window.archiveMissingImage) window.archiveMissingImage(separator);
    };
    separatorCell.appendChild(separator);
    separatorRow.appendChild(separatorCell);
    tbody.appendChild(separatorRow);

    table.appendChild(tbody);
    return table;
  }

  function makeLink(label, href) {
    var resolved = resolveHref(href);
    if (!resolved) return null;
    var link = document.createElement("a");
    link.href = resolved;
    link.target = "_parent";
    link.appendChild(text("[" + label + "]"));
    return link;
  }

  function appendLink(container, label, href) {
    var link = makeLink(label, href);
    if (!link) return;
    container.appendChild(text(" "));
    container.appendChild(link);
    container.appendChild(text(" "));
  }

  function appendEditLink(container, record) {
    if (!manageMode || !record.id) return;
    var params = new URLSearchParams();
    params.set("id", record.id);
    params.set("manage", "1");
    var link = document.createElement("a");
    link.href = "/edit-publication/?" + params.toString();
    link.appendChild(text("[edit]"));
    container.appendChild(text(" "));
    container.appendChild(link);
    container.appendChild(text(" "));
  }

  function appendCitation(container, record) {
    var parts = [];
    if (record.authors) parts.push(String(record.authors).replace(/\s+$/g, ""));
    if (record.title) parts.push(record.title);
    var venueText = [record.venue, record.note].filter(Boolean).join(", ");
    if (venueText) parts.push(venueText);
    container.appendChild(text(parts.join(". ").replace(/\.\s*,/g, ",") + (parts.length ? "." : "")));
  }

  function publicationItem(record) {
    var item = document.createElement("li");
    item.className = "text";
    item.style.cssText = "";
    item.setAttribute("data-content-publication-id", record.id || "");
    item.appendChild(text(" \u2002"));
    appendCitation(item, record);

    var links = record.links || {};
    ["pdf", "code", "slide", "poster"].forEach(function (key) {
      appendLink(item, linkLabels[key], links[key]);
    });
    Object.keys(links)
      .filter(function (key) {
        return !linkLabels[key];
      })
      .sort()
      .forEach(function (key) {
        appendLink(item, key, links[key]);
      });
    appendEditLink(item, record);
    return item;
  }

  function sectionList(records) {
    var wrap = document.createElement("div");
    wrap.appendChild(document.createElement("br"));

    var font = document.createElement("font");
    font.setAttribute("style", "font-size: 12pt");
    font.setAttribute("face", "Calibri");
    var table = document.createElement("table");
    table.width = "1000";
    table.align = "center";
    table.border = "0";
    var tbody = document.createElement("tbody");
    var row = document.createElement("tr");
    var cell = document.createElement("td");
    cell.setAttribute("style", "margin-left:-10pt");
    cell.width = "800";
    cell.valign = "top";
    var list = document.createElement("ol");
    list.setAttribute("align", "justify");
    records.forEach(function (record) {
      list.appendChild(publicationItem(record));
    });
    cell.appendChild(list);
    row.appendChild(cell);
    tbody.appendChild(row);
    table.appendChild(tbody);
    font.appendChild(table);
    wrap.appendChild(font);
    return wrap;
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

  async function loadPublications() {
    var response = await fetch(contentUrl("publications.json", "dataBaseUrl"), { cache: "no-cache" });
    if (!response.ok) throw new Error("publications.json: " + response.status);
    return response.json();
  }

  function render(records) {
    var root = document.getElementById("content-publication-sections");
    if (!root) return;
    clearChildren(root);

    var sorted = records.slice().sort(function (a, b) {
      return Number(b.year || 0) - Number(a.year || 0) || String(a.title || "").localeCompare(String(b.title || ""));
    });
    typeOrder.forEach(function (type) {
      var group = sorted.filter(function (record) {
        return record.type === type;
      });
      if (!group.length) return;
      root.appendChild(titleTable(typeTitles[type] || type));
      root.appendChild(sectionList(group));
    });

    var status = document.getElementById("content-publication-status");
    if (status) {
      status.textContent = sorted.length
        ? "Loaded publication list from the content repository."
        : "No publication records are published in the content repository.";
    }
  }

  async function boot() {
    var status = document.getElementById("content-publication-status");
    try {
      await loadSource();
      render(await loadPublications());
    } catch (error) {
      if (status) status.textContent = "Could not load publication records from the content repository.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
