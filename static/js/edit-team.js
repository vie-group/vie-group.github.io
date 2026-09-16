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
  var mode = "";
  var draggedKey = "";
  var selectedKeys = {};
  var pendingChanges = {};
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

  function setDragStatus(message) {
    var node = $("team-drag-status");
    if (node) node.textContent = message;
  }

  function setBatchStatus(message) {
    var node = $("team-batch-status");
    if (node) node.textContent = message;
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
    return key ? findRecordByKey(key) : null;
  }

  function setFormReady(ready) {
    $("commit-team-edit").disabled = !ready;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
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

  function setAdvancedOpen(open) {
    var advanced = document.querySelector(".team-advanced");
    if (!advanced) return;
    advanced.open = open;
    updateAdvancedVisibility();
  }

  function showNodes(selector, visible) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (node) {
      node.style.display = visible ? "" : "none";
    });
  }

  function setMode(nextMode) {
    mode = nextMode;
    $("team-edit-form").style.display = mode ? "" : "none";
    showNodes("[data-team-edit-only]", mode === "edit");
    if ($("team-drag-editor")) $("team-drag-editor").style.display = mode === "edit" ? "" : "none";
    $("team-select").disabled = mode !== "edit";
    $("team-mode-add").className = mode === "add" ? "is-active" : "";
    $("team-mode-edit").className = mode === "edit" ? "is-active" : "";

    if (mode === "add") {
      selectedKeys = {};
      pendingChanges = {};
      fillBlankForNew();
      setBatchStatus("No staged changes.");
      renderBoard();
      renderPendingList();
      return;
    }

    if (mode === "edit") {
      $("team-operation").value = "update";
      renderOptions($("team-select").value);
      setStatus($("team-select").value ? "Ready to edit the selected team member." : "Choose a team member to edit, or select people on the board.", "");
      renderBoard();
      renderPendingList();
    }
  }

  function displayGroup(record) {
    var change = pendingChanges[recordKey(record)];
    return change ? change.tg : record.group;
  }

  function selectedKeyList() {
    return Object.keys(selectedKeys).filter(function (key) {
      return selectedKeys[key] && findRecordByKey(key);
    });
  }

  function setSelected(key, selected) {
    if (!key) return;
    if (selected) selectedKeys[key] = true;
    else delete selectedKeys[key];
  }

  function clearSelection() {
    selectedKeys = {};
    renderBoard();
    setBatchStatus(Object.keys(pendingChanges).length ? Object.keys(pendingChanges).length + " staged change(s)." : "No staged changes.");
  }

  function compactChange(record, targetGroup) {
    var change = {
      op: "update",
      og: record.group,
      on: record.person.name || "",
      tg: targetGroup,
      n: record.person.name || ""
    };
    var batchDegree = clean($("team-batch-degree").value);
    var batchDestination = clean($("team-batch-destination").value);
    if (targetGroup === "alumni") {
      if (clean($("team-batch-year").value)) change.y = clean($("team-batch-year").value);
      if (batchDegree) change.deg = batchDegree;
      if (batchDestination) change.dst = batchDestination;
    } else if (targetGroup === "current") {
      if (batchDegree) change.r = batchDegree;
    } else if (targetGroup === "faculty") {
      if (batchDegree) change.r = batchDegree;
      if (batchDestination) change.af = batchDestination;
    }
    return change;
  }

  function stageMove(keys, targetGroup) {
    var changed = 0;
    keys.forEach(function (key) {
      var record = findRecordByKey(key);
      if (!record || record.group === targetGroup) return;
      pendingChanges[key] = compactChange(record, targetGroup);
      changed += 1;
    });
    if (changed > 0 && (targetGroup === "alumni" || targetGroup === "faculty")) setAdvancedOpen(true);
    renderBoard();
    renderPendingList();
    setBatchStatus(Object.keys(pendingChanges).length + " staged change(s).");
  }

  function renderPendingList() {
    var list = $("team-batch-list");
    if (!list) return;
    clearChildren(list);
    var keys = Object.keys(pendingChanges);
    if (!keys.length) return;
    keys.forEach(function (key) {
      var record = findRecordByKey(key);
      var change = pendingChanges[key];
      if (!record || !change) return;
      var item = document.createElement("div");
      item.className = "team-batch-item";
      var remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "remove";
      remove.addEventListener("click", function () {
        delete pendingChanges[key];
        renderBoard();
        renderPendingList();
        setBatchStatus(Object.keys(pendingChanges).length ? Object.keys(pendingChanges).length + " staged change(s)." : "No staged changes.");
      });
      item.appendChild(remove);
      item.appendChild(document.createTextNode((record.person.name || key) + ": " + groupLabel(record.group) + " -> " + groupLabel(change.tg)));
      list.appendChild(item);
    });
  }

  function renderBoard() {
    if (!$("team-drag-board")) return;
    var term = clean($("team-search").value).toLowerCase();
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
      if (selectedKeys[key]) card.className += " is-selected";
      if (pendingChanges[key]) card.className += " is-pending";
      card.draggable = true;
      card.setAttribute("tabindex", "0");
      card.setAttribute("data-team-record-key", key);
      card.title = record.person.name || "";

      var checkbox = document.createElement("input");
      checkbox.className = "team-drag-check";
      checkbox.type = "checkbox";
      checkbox.checked = !!selectedKeys[key];
      checkbox.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      checkbox.addEventListener("change", function () {
        setSelected(key, checkbox.checked);
        $("team-select").value = key;
        fillForm(record);
        renderBoard();
        setBatchStatus(selectedKeyList().length + " selected; " + Object.keys(pendingChanges).length + " staged change(s).");
      });
      card.appendChild(checkbox);

      var name = document.createElement("div");
      name.className = "team-drag-name";
      name.textContent = record.person.name || "(Unnamed)";
      card.appendChild(name);

      var meta = document.createElement("div");
      meta.className = "team-drag-meta";
      meta.textContent = personMeta(record.person) || record.group;
      card.appendChild(meta);

      card.addEventListener("click", function () {
        setSelected(key, !selectedKeys[key]);
        $("team-select").value = key;
        fillForm(record);
        renderBoard();
        setBatchStatus(selectedKeyList().length + " selected; " + Object.keys(pendingChanges).length + " staged change(s).");
      });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelected(key, !selectedKeys[key]);
          $("team-select").value = key;
          fillForm(record);
          renderBoard();
        }
      });
      card.addEventListener("dragstart", function (event) {
        draggedKey = key;
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

    setDragStatus(records.length ? "Select multiple cards, then drag one selected card or stage the selected move." : "No team records loaded.");
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
      setFormReady(false);
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

  function selectRecordForTarget(record, targetGroup) {
    var key = recordKey(record);
    var keys = selectedKeys[key] ? selectedKeyList() : [key];
    stageMove(keys, targetGroup);
    $("team-select").value = key;
    fillForm(record);
  }

  function syncSingleStatusFromForm() {
    var record = selectedRecord();
    if (!record) return;
    if ($("team-operation").value === "delete") {
      setStatus("Ready to delete " + record.person.name + ".", "ok");
      return;
    }
    var targetGroup = clean($("team-target-group").value);
    if (targetGroup && targetGroup !== record.group) {
      if (targetGroup === "alumni" || targetGroup === "faculty") setAdvancedOpen(true);
      setStatus("Ready to move " + record.person.name + " from " + groupLabel(record.group) + " to " + groupLabel(targetGroup) + ".", "ok");
    } else {
      setStatus("Ready to create a team edit issue for " + record.person.name + ".", "ok");
    }
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

    matches.forEach(function (record) {
      var option = document.createElement("option");
      option.value = recordKey(record);
      option.textContent = recordLabel(record);
      select.appendChild(option);
    });

    select.disabled = false;
    if (selectedKey && Array.prototype.some.call(select.options, function (option) { return option.value === selectedKey; })) {
      select.value = selectedKey;
      fillForm(selectedRecord());
    } else {
      select.value = "";
      setFormReady(false);
    }
    renderBoard();
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

  function batchIssueBody(changes) {
    return [
      "### How to edit\nThis issue was generated by the visual team batch editor.\n",
      field("Operation", "batch"),
      field("Batch Changes", JSON.stringify(changes)),
      field("Edit Note", "Generated from https://www.vie.group/edit-team/.")
    ].join("\n");
  }

  function buildIssueUrl(data, changes) {
    var params = new URLSearchParams();
    if (changes && changes.length) {
      params.set("title", "[Edit Team] Batch update " + changes.length + " members");
      params.set("body", batchIssueBody(changes));
    } else {
      params.set("title", "[Edit Team] " + (data.name || data.originalName || "team member"));
      params.set("body", issueBody(data));
    }
    params.set("labels", issueLabel);
    return "https://github.com/" + repoOwner + "/" + repoName + "/issues/new?" + params.toString();
  }

  function submit(event) {
    event.preventDefault();
    if (mode === "edit" && Object.keys(pendingChanges).length > 0) {
      var changes = Object.keys(pendingChanges).map(function (key) {
        return pendingChanges[key];
      });
      var batchUrl = buildIssueUrl(null, changes);
      if (batchUrl.length > 16000) {
        setStatus("The generated batch issue is too long. Submit fewer staged changes at once.", "error");
        return;
      }
      setStatus("Opening GitHub batch team edit issue...", "ok");
      window.location.href = batchUrl;
      return;
    }

    var data = formData();
    if (mode === "add") data.operation = "add";
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
      if (requestedKey) {
        setMode("edit");
        if (!$("team-select").value) setStatus("Team member not found: " + requestedName, "error");
      } else {
        $("team-edit-form").style.display = "none";
        $("team-drag-editor").style.display = "none";
        setDragStatus("Team records loaded.");
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

    $("team-mode-add").addEventListener("click", function () { setMode("add"); });
    $("team-mode-edit").addEventListener("click", function () { setMode("edit"); });
    $("team-edit-form").addEventListener("submit", submit);
    $("team-select").addEventListener("change", function () {
      var record = selectedRecord();
      if (record) {
        setSelected(recordKey(record), true);
        fillForm(record);
        renderBoard();
      }
    });
    $("team-target-group").addEventListener("change", syncSingleStatusFromForm);
    $("team-operation").addEventListener("change", syncSingleStatusFromForm);
    $("team-search").addEventListener("input", function () {
      renderOptions($("team-select").value);
    });
    $("team-apply-selected").addEventListener("click", function () {
      var keys = selectedKeyList();
      if (!keys.length) {
        setBatchStatus("Select at least one member first.");
        return;
      }
      stageMove(keys, clean($("team-batch-target-group").value));
    });
    $("team-clear-selection").addEventListener("click", clearSelection);
    $("team-clear-staged").addEventListener("click", function () {
      pendingChanges = {};
      renderBoard();
      renderPendingList();
      setBatchStatus("No staged changes.");
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
