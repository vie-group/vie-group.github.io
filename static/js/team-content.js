(function () {
  var defaultSource = {
    dataBaseUrl: "https://vie-group.github.io/vie-group-content/data/",
    assetBaseUrl: "https://vie-group.github.io/vie-group-content/",
    rssUrl: "https://vie-group.github.io/vie-group-content/rss.xml"
  };
  var source = defaultSource;
  var manageMode = hasManageFlag();
  var currentRoleOrder = ["Ph.D. Student", "Master Student", "Undergraduate Student"];

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
    if (/^\/?(media|static)\//i.test(value)) return "/" + value.replace(/^\/+/, "");
    return value;
  }

  function text(value) {
    return document.createTextNode(String(value || ""));
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function heading(size, label) {
    var font = document.createElement("font");
    font.setAttribute("size", String(size));
    var strong = document.createElement("b");
    strong.appendChild(text(label));
    font.appendChild(strong);
    return font;
  }

  function personImage(person) {
    if (!person.image) return document.createTextNode("");
    var img = document.createElement("img");
    img.src = resolveHref(person.image);
    img.width = 140;
    img.height = 160;
    img.onerror = function () {
      if (window.archiveMissingImage) window.archiveMissingImage(img);
    };
    if (!person.profileUrl) return img;
    var link = document.createElement("a");
    link.href = resolveHref(person.profileUrl);
    link.appendChild(img);
    return link;
  }

  function editLink(person, group) {
    if (!manageMode) return null;
    var params = new URLSearchParams();
    params.set("group", group);
    params.set("name", person.name || "");
    params.set("manage", "1");
    var link = document.createElement("a");
    link.href = "/edit-team/?" + params.toString();
    link.appendChild(text("[edit]"));
    return link;
  }

  function gridTable(records, group) {
    var table = document.createElement("table");
    table.width = "875";
    table.align = "center";
    table.border = "0";
    table.setAttribute("style", "table-layout:fixed");
    var tbody = document.createElement("tbody");
    var row = document.createElement("tr");
    records.forEach(function (person, index) {
      if (index > 0 && index % 5 === 0) {
        tbody.appendChild(row);
        row = document.createElement("tr");
      }
      var cell = document.createElement("td");
      cell.setAttribute("style", "width:175px;height:170px;text-align:center");
      cell.setAttribute("data-team-member-name", person.name || "");
      cell.setAttribute("data-team-member-group", group);
      cell.appendChild(personImage(person));
      var div = document.createElement("div");
      div.setAttribute("style", "text-align:center; width:175px");
      var strong = document.createElement("strong");
      strong.appendChild(text(person.name));
      div.appendChild(strong);
      div.appendChild(document.createElement("br"));
      if (person.email) {
        var email = document.createElement("font");
        email.setAttribute("style", "font-size: 9pt");
        email.setAttribute("face", "Calibri");
        email.appendChild(text(person.email));
        div.appendChild(email);
        div.appendChild(document.createElement("br"));
      }
      var details = [person.year, person.degree, person.destination].filter(Boolean).join(", ").replace(", ", ", ");
      if (details) {
        var detail = document.createElement("font");
        detail.setAttribute("style", "font-size: 9pt");
        detail.setAttribute("face", "Calibri");
        detail.appendChild(text(details));
        div.appendChild(detail);
        div.appendChild(document.createElement("br"));
      }
      var edit = editLink(person, group);
      if (edit) div.appendChild(edit);
      cell.appendChild(div);
      row.appendChild(cell);
    });
    if (row.children.length) tbody.appendChild(row);
    table.appendChild(tbody);
    return table;
  }

  function facultySection(records) {
    var fragment = document.createDocumentFragment();
    fragment.appendChild(heading(6, "Faculty"));
    records.forEach(function (person) {
      var table = document.createElement("table");
      table.width = "875";
      table.align = "center";
      table.border = "0";
      table.setAttribute("data-team-member-name", person.name || "");
      table.setAttribute("data-team-member-group", "faculty");
      var tbody = document.createElement("tbody");
      var row = document.createElement("tr");
      var photo = document.createElement("td");
      photo.width = "200";
      photo.valign = "middle";
      photo.align = "center";
      photo.appendChild(personImage(person));
      row.appendChild(photo);
      var info = document.createElement("td");
      info.width = "712";
      info.valign = "middle";
      var name = document.createElement("strong");
      var nameFont = document.createElement("font");
      nameFont.setAttribute("style", "font-size: 16pt");
      nameFont.setAttribute("face", "Calibri");
      nameFont.appendChild(text(person.name));
      name.appendChild(nameFont);
      info.appendChild(name);
      info.appendChild(document.createElement("br"));
      var detailFont = document.createElement("font");
      detailFont.setAttribute("style", "font-size: 12pt");
      detailFont.setAttribute("face", "Calibri");
      [person.role, person.affiliation, person.address ? "Address: " + person.address : "", person.email ? "Email: " + person.email : ""]
        .filter(Boolean)
        .forEach(function (line) {
          detailFont.appendChild(text(line));
          detailFont.appendChild(document.createElement("br"));
        });
      var edit = editLink(person, "faculty");
      if (edit) detailFont.appendChild(edit);
      info.appendChild(detailFont);
      row.appendChild(info);
      tbody.appendChild(row);
      table.appendChild(tbody);
      fragment.appendChild(table);
    });
    return fragment;
  }

  function currentSection(title, records) {
    var fragment = document.createDocumentFragment();
    fragment.appendChild(heading(5, title));
    fragment.appendChild(gridTable(records, "current"));
    return fragment;
  }

  function undergraduateAlumni(records) {
    var paragraph = document.createElement("p");
    var font = document.createElement("font");
    font.setAttribute("style", "font-size: 12pt; color:black");
    records.forEach(function (person) {
      var lineWrap = document.createElement("span");
      lineWrap.setAttribute("data-team-member-name", person.name || "");
      lineWrap.setAttribute("data-team-member-group", "alumni");
      var line = person.name;
      var detail = [person.year, person.degree].filter(Boolean).join(", ");
      if (person.destination) detail += (detail ? " -> " : "") + person.destination;
      if (detail) line += " (" + detail + ")";
      lineWrap.appendChild(text(line));
      var edit = editLink(person, "alumni");
      if (edit) {
        lineWrap.appendChild(text(" "));
        lineWrap.appendChild(edit);
      }
      font.appendChild(lineWrap);
      font.appendChild(document.createElement("br"));
    });
    paragraph.appendChild(font);
    return paragraph;
  }

  async function loadSource() {
    try {
      var response = await fetch("/content-source.json", { cache: "no-cache" });
      if (!response.ok) return;
      source = Object.assign({}, source, await response.json());
    } catch (error) {
      // Keep defaults.
    }
  }

  async function loadTeam() {
    var response = await fetch(contentUrl("team.json", "dataBaseUrl"), { cache: "no-cache" });
    if (!response.ok) throw new Error("team.json: " + response.status);
    return response.json();
  }

  function render(team) {
    var root = document.getElementById("content-team-sections");
    if (!root) return;
    clearChildren(root);
    root.appendChild(facultySection(team.faculty || []));

    currentRoleOrder.forEach(function (role) {
      var records = (team.current || []).filter(function (person) {
        return person.role === role;
      });
      if (records.length) root.appendChild(currentSection(role, records));
    });
    var otherCurrent = (team.current || []).filter(function (person) {
      return currentRoleOrder.indexOf(person.role) < 0;
    });
    if (otherCurrent.length) root.appendChild(currentSection("Current Members", otherCurrent));

    var graduate = (team.alumni || []).filter(function (person) {
      return !/^b\.?s\.?$/i.test(String(person.degree || "").replace(/\s+/g, ""));
    });
    var undergraduate = (team.alumni || []).filter(function (person) {
      return /^b\.?s\.?$/i.test(String(person.degree || "").replace(/\s+/g, ""));
    });
    if (graduate.length) {
      root.appendChild(heading(5, "Graduate Alumni"));
      root.appendChild(gridTable(graduate, "alumni"));
    }
    if (undergraduate.length) {
      root.appendChild(heading(5, "Undergraduate Alumni"));
      root.appendChild(undergraduateAlumni(undergraduate));
    }

    var status = document.getElementById("content-team-status");
    if (status) status.textContent = "Loaded team list from the content repository.";
  }

  async function boot() {
    var status = document.getElementById("content-team-status");
    try {
      await loadSource();
      render(await loadTeam());
    } catch (error) {
      if (status) status.textContent = "Could not load team records from the content repository.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
