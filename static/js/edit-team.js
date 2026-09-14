(function () {
  var repoOwner = "vie-group";
  var repoName = "vie-group-content";
  var issueLabel = "team-edit";
  var defaultSource = {
    dataBaseUrl: "https://vie-group.github.io/vie-group-content/data/",
    assetBaseUrl: "https://vie-group.github.io/vie-group-content/",
    rssUrl: "https://vie-group.github.io/vie-group-content/rss.xml"
  };
  var source = defaultSource;
  var records = [];

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

  function setStatus(message, tone) {
    var node = $("team-edit-status");
    if (!node) return;
    node.textContent = message;
    node.className = tone || "";
  }

  function isValidLink(value) {
    if (!value) return true;
    return /^(https?:\/\/|mailto:|media\/|assets\/|static\/|\/media\/|\/assets\/|\/static\/|[a-z0-9._/-]+$)/i.test(value);
  }

  function field(label, value) {
    return "### " + label + "\n" + clean(value) + "\n";
  }

  function attachmentField(label, text) {
    return "### " + label + "\n" + text + "\n";
  }

  function recordKey(record) {
    return record.group + "::" + record.person.name;
  }

  function recordLabel(record) {
    var person = record.person;
    return [record.group, person.name, person.role || person.degree || "", person.year || ""].filter(Boolean).join(" | ");
  }

  function searchText(record) {
    var person = record.person;
    return [record.group, person.name, person.role, person.email, person.year, person.degree, person.destination]
      .join(" ")
      .toLowerCase();
  }

  function flattenTeam(team) {
    return ["faculty", "current", "alumni"].flatMap(function (group) {
      return (team[group] || []).map(function (person) {
        return { group: group, person: person };
      });
    });
  }

  function selectedRecord() {
    var key = $("team-select").value;
    if (key === "__new__") return null;
    return records.find(function (record) {
      return recordKey(record) === key;
    });
  }

  function setFormReady(ready) {
    $("commit-team-edit").disabled = !ready;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function fillBlankForNew() {
    $("team-operation").value = "add";
    $("team-original-group").value = "";
    $("team-original-name").value = "";
    $("team-target-group").value = "current";
    $("team-name").value = "";
    $("team-role").value = "Master Student";
    $("team-email").value = "";
    $("team-affiliation").value = "";
    $("team-address").value = "";
    $("team-year").value = "";
    $("team-degree").value = "";
    $("team-destination").value = "";
    $("team-image-url").value = "";
    $("team-profile-url").value = "";
    setFormReady(true);
    setStatus("Ready to add a new team member.", "ok");
  }

  function fillForm(record) {
    if (!record) {
      if ($("team-select").value === "__new__") {
        fillBlankForNew();
      } else {
        setFormReady(false);
      }
      return;
    }
    var person = record.person;
    $("team-operation").value = "update";
    $("team-original-group").value = record.group;
    $("team-original-name").value = person.name || "";
    $("team-target-group").value = record.group;
    $("team-name").value = person.name || "";
    $("team-role").value = person.role || "";
    $("team-email").value = person.email || "";
    $("team-affiliation").value = person.affiliation || "";
    $("team-address").value = person.address || "";
    $("team-year").value = person.year || "";
    $("team-degree").value = person.degree || "";
    $("team-destination").value = person.destination || "";
    $("team-image-url").value = person.image || "";
    $("team-profile-url").value = person.profileUrl || "";
    setFormReady(true);
    setStatus("Ready to create a team edit issue for " + person.name + ".", "ok");
  }

  function renderOptions(selectedKey) {
    var select = $("team-select");
    var term = clean($("team-search").value).toLowerCase();
    var matches = records.filter(function (record) {
      return !term || searchText(record).indexOf(term) !== -1;
    });
    clearChildren(select);

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = matches.length ? "Select a team member..." : "No matching team records";
    select.appendChild(placeholder);

    var add = document.createElement("option");
    add.value = "__new__";
    add.textContent = "New team member";
    select.appendChild(add);

    matches.forEach(function (record) {
      var option = document.createElement("option");
      option.value = recordKey(record);
      option.textContent = recordLabel(record);
      select.appendChild(option);
    });

    select.disabled = false;
    if (selectedKey && Array.prototype.some.call(select.options, function (option) { return option.value === selectedKey; })) {
      select.value = selectedKey;
    } else {
      select.value = "";
    }
    fillForm(selectedRecord());
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

  function formData() {
    return {
      operation: clean($("team-operation").value),
      originalGroup: clean($("team-original-group").value),
      originalName: clean($("team-original-name").value),
      targetGroup: clean($("team-target-group").value),
      name: clean($("team-name").value),
      role: clean($("team-role").value),
      email: clean($("team-email").value),
      affiliation: clean($("team-affiliation").value),
      address: clean($("team-address").value),
      year: clean($("team-year").value),
      degree: clean($("team-degree").value),
      destination: clean($("team-destination").value),
      imageUrl: clean($("team-image-url").value),
      profileUrl: clean($("team-profile-url").value)
    };
  }

  function issueBody(data) {
    return [
      "### How to edit\n1. Operation update changes an existing person; add creates or replaces by name; delete removes the selected person.\n2. Target Group is the final status: faculty, current, or alumni.\n3. To move a current member to alumni, set Target Group to alumni and fill Year, Degree, and Destination.\n4. To replace a portrait, drag the image into Image Attachment on the GitHub issue page.\n",
      field("Operation", data.operation),
      field("Original Group", data.originalGroup),
      field("Original Name", data.originalName),
      field("Target Group", data.targetGroup),
      field("Name", data.name),
      field("Role", data.role),
      field("Email", data.email),
      field("Affiliation", data.affiliation),
      field("Address", data.address),
      field("Year", data.year),
      field("Degree", data.degree),
      field("Destination", data.destination),
      field("Image URL", data.imageUrl),
      attachmentField("Image Attachment", "Drag replacement portrait image here, or leave this line unchanged."),
      field("Profile URL", data.profileUrl),
      field("Edit Note", "Generated from https://www.vie.group/edit-team/.")
    ].join("\n");
  }

  function buildIssueUrl(data) {
    var params = new URLSearchParams();
    params.set("title", "[Edit Team] " + (data.name || data.originalName || "team member"));
    params.set("body", issueBody(data));
    params.set("labels", issueLabel);
    return "https://github.com/" + repoOwner + "/" + repoName + "/issues/new?" + params.toString();
  }

  function submit(event) {
    event.preventDefault();
    var data = formData();
    if (!/^(add|update|delete)$/.test(data.operation)) {
      setStatus("Operation must be add, update, or delete.", "error");
      return;
    }
    if (data.operation !== "add" && (!data.originalGroup || !data.originalName)) {
      setStatus("Select an existing team member before update/delete.", "error");
      return;
    }
    if (data.operation !== "delete" && (!data.targetGroup || !data.name)) {
      setStatus("Target group and name are required.", "error");
      return;
    }
    if (!isValidLink(data.imageUrl) || !isValidLink(data.profileUrl)) {
      setStatus("Image/Profile values must be http(s), mailto, repository paths, or simple relative paths.", "error");
      return;
    }
    var url = buildIssueUrl(data);
    if (url.length > 8000) {
      setStatus("The generated issue is too long. Shorten optional fields, or use the GitHub issue template directly.", "error");
      return;
    }
    setStatus("Opening GitHub team edit issue...", "ok");
    window.location.href = url;
  }

  async function boot() {
    var params = new URLSearchParams(window.location.search);
    var requestedGroup = params.get("group") || "";
    var requestedName = params.get("name") || "";
    try {
      await loadSource();
      records = flattenTeam(await loadTeam());
      var requestedKey = requestedGroup && requestedName ? requestedGroup + "::" + requestedName : "";
      renderOptions(requestedKey);
      if (requestedKey && !$("team-select").value) {
        setStatus("Team member not found: " + requestedName, "error");
      } else if (!requestedKey) {
        setStatus("Choose a team member to edit, or choose New team member.", "");
      }
    } catch (error) {
      $("team-select").innerHTML = '<option value="">Could not load team records</option>';
      setStatus("Could not load team records from the content repository.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var advanced = document.querySelector(".team-advanced");
    if (advanced) {
      var updateAdvancedVisibility = function () {
        advanced.classList.toggle("is-collapsed", !advanced.open);
        Array.prototype.forEach.call(advanced.children, function (child) {
          if (child.tagName && child.tagName.toLowerCase() === "summary") return;
          child.style.display = advanced.open ? "" : "none";
        });
      };
      updateAdvancedVisibility();
      advanced.addEventListener("toggle", updateAdvancedVisibility);
    }
    $("team-edit-form").addEventListener("submit", submit);
    $("team-select").addEventListener("change", function () {
      if ($("team-select").value === "__new__") fillBlankForNew();
      else fillForm(selectedRecord());
    });
    $("team-search").addEventListener("input", function () {
      renderOptions($("team-select").value);
    });
    boot();
  });
})();
