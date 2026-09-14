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
  var groups = ["faculty", "current", "alumni"];
  var draggedKey = "";
  var pendingMove = null;
  var updateAdvancedVisibility = function () {};

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
    return groups.flatMap(function (group) {
      return (team[group] || []).map(function (person) {
        return { group: group, person: person };
      });
    });
  }

  function findRecordByKey(key) {
    return records.find(function (record) {
      return recordKey(record) === key;
    });
  }

  function selectedRecord() {
    var key = $("team-select").value;
    if (key === "__new__") return null;
    return findRecordByKey(key);
  }

  function setFormReady(ready) {
    $("commit-team-edit").disabled = !ready;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function setDragStatus(message) {
    var node = $("team-drag-status");
    if (node) node.textContent = message;
  }

  function setAdvancedOpen(open) {
    var advanced = document.querySelector(".team-advanced");
    if (!advanced) return;
    advanced.open = open;
    updateAdvancedVisibility();
  }

  function groupLabel(group) {
    if (group === "faculty") return "Faculty";
    if (group === "current") return "Current Members";
    if (group === "alumni") return "Alumni";
    return group;
  }

  function personMeta(person) {
    return [person.role || person.degree || "", person.email || person.year || "", person.destination || ""]
      .filter(Boolean)
      .join(" | ");
  }

  function displayGroup(record) {
    var key = recordKey(record);
    if (pendingMove && pendingMove.key === key) return pendingMove.targetGroup;
    return record.group;
  }

  function renderBoard() {
    if (!$("team-drag-board")) return;
    var term = clean($("team-search").value).toLowerCase();
    var selectedKey = $("team-select").value;
    var counts = { faculty: 0, current: 0, alumni: 0 };
    groups.forEach(function (group) {
      var list = $("team-drop-" + group);
      var count = document.querySelector('[data-team-count="' + group + '"]');
      var column = document.querySelector('[data-team-drop-group="' + group + '"]');
      if (list) clearChildren(list);
      if (count) count.textContent = "";
      if (column) column.classList.remove("is-drop-target");
    });

    records.filter(function (record) {
      return !term || searchText(record).indexOf(term) !== -1;
    }).forEach(function (record) {
      var key = recordKey(record);
      var group = displayGroup(record);
      var list = $("team-drop-" + group);
      if (!list) return;
      counts[group] += 1;

      var card = document.createElement("div");
      card.className = "team-drag-card";
      if (selectedKey === key) card.className += " is-selected";
      if (pendingMove && pendingMove.key === key) card.className += " is-pending";
      card.draggable = true;
      card.setAttribute("tabindex", "0");
      card.setAttribute("data-team-record-key", key);
      card.title = record.person.name || "";

      var name = document.createElement("div");
      name.className = "team-drag-name";
      name.textContent = record.person.name || "(Unnamed)";
      card.appendChild(name);

      var meta = document.createElement("div");
      meta.className = "team-drag-meta";
      meta.textContent = personMeta(record.person) || record.group;
      card.appendChild(meta);

      card.addEventListener("click", function () {
        selectRecordForTarget(record, displayGroup(record));
      });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRecordForTarget(record, displayGroup(record));
        }
      });
      card.addEventListener("dragstart", function (event) {
        draggedKey = key;
        card.className += " is-dragging";
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", key);
        }
      });
      card.addEventListener("dragend", function () {
        draggedKey = "";
        renderBoard();
      });
      list.appendChild(card);
    });

    groups.forEach(function (group) {
      var list = $("team-drop-" + group);
      var count = document.querySelector('[data-team-count="' + group + '"]');
      if (count) count.textContent = "(" + counts[group] + ")";
      if (list && counts[group] === 0) {
        var empty = document.createElement("div");
        empty.className = "team-drag-empty";
        empty.textContent = "No records";
        list.appendChild(empty);
      }
    });

    if (pendingMove) {
      var moved = findRecordByKey(pendingMove.key);
      setDragStatus(moved ? moved.person.name + ": " + groupLabel(moved.group) + " -> " + groupLabel(pendingMove.targetGroup) : "");
    } else {
      setDragStatus(records.length ? "Drag an existing member to another column." : "No team records loaded.");
    }
  }

  function setPendingMove(record, targetGroup) {
    if (record && targetGroup && targetGroup !== record.group) {
      pendingMove = { key: recordKey(record), targetGroup: targetGroup };
    } else {
      pendingMove = null;
    }
  }

  function fillBlankForNew() {
    pendingMove = null;
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
    renderBoard();
  }

  function fillForm(record) {
    if (!record) {
      if ($("team-select").value === "__new__") {
        fillBlankForNew();
      } else {
        pendingMove = null;
        setFormReady(false);
        renderBoard();
      }
      return;
    }
    pendingMove = null;
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
    renderBoard();
  }

  function selectRecordForTarget(record, targetGroup) {
    var key = recordKey(record);
    renderOptions(key);
    $("team-operation").value = "update";
    $("team-target-group").value = targetGroup;
    setPendingMove(record, targetGroup);
    if (pendingMove) {
      setStatus("Ready to move " + record.person.name + " from " + groupLabel(record.group) + " to " + groupLabel(targetGroup) + ".", "ok");
      if (targetGroup === "alumni" || targetGroup === "faculty") setAdvancedOpen(true);
    }
    renderBoard();
  }

  function syncPendingMoveFromForm() {
    var record = selectedRecord();
    if (!record) {
      pendingMove = null;
      renderBoard();
      return;
    }
    if ($("team-operation").value === "delete") {
      pendingMove = null;
      setStatus("Ready to delete " + record.person.name + ".", "ok");
      renderBoard();
      return;
    }
    var targetGroup = clean($("team-target-group").value);
    setPendingMove(record, targetGroup);
    if (pendingMove) {
      setStatus("Ready to move " + record.person.name + " from " + groupLabel(record.group) + " to " + groupLabel(targetGroup) + ".", "ok");
      if (targetGroup === "alumni" || targetGroup === "faculty") setAdvancedOpen(true);
    } else {
      setStatus("Ready to create a team edit issue for " + record.person.name + ".", "ok");
    }
    renderBoard();
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
      setDragStatus("Could not load team records.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var advanced = document.querySelector(".team-advanced");
    if (advanced) {
      updateAdvancedVisibility = function () {
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
    $("team-target-group").addEventListener("change", syncPendingMoveFromForm);
    $("team-operation").addEventListener("change", syncPendingMoveFromForm);
    $("team-search").addEventListener("input", function () {
      renderOptions($("team-select").value);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-team-drop-group]"), function (column) {
      column.addEventListener("dragover", function (event) {
        if (!draggedKey) return;
        event.preventDefault();
        column.classList.add("is-drop-target");
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      });
      column.addEventListener("dragleave", function () {
        column.classList.remove("is-drop-target");
      });
      column.addEventListener("drop", function (event) {
        event.preventDefault();
        column.classList.remove("is-drop-target");
        var key = event.dataTransfer ? event.dataTransfer.getData("text/plain") : draggedKey;
        var record = findRecordByKey(key || draggedKey);
        if (record) selectRecordForTarget(record, column.getAttribute("data-team-drop-group"));
      });
    });
    boot();
  });
})();
