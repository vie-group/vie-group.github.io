(function () {
  var dataPath = "data/seminars.json";
  var presentationPath = "presentation/index.html";

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message, tone) {
    var node = $("upload-status");
    node.textContent = message;
    node.className = tone || "";
  }

  function config() {
    return {
      owner: $("repo-owner").value.trim(),
      repo: $("repo-name").value.trim(),
      branch: $("repo-branch").value.trim() || "main",
      token: $("github-token").value.trim()
    };
  }

  function encodePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  async function request(path, options) {
    var cfg = config();
    if (!cfg.owner || !cfg.repo) throw new Error("Repository owner and name are required.");
    if (!cfg.token) throw new Error("GitHub token is required.");

    var headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    headers.Authorization = "Bearer " + cfg.token;
    if (options && options.headers) {
      Object.keys(options.headers).forEach(function (key) {
        headers[key] = options.headers[key];
      });
    }

    var response = await fetch("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + path, {
      method: options && options.method ? options.method : "GET",
      headers: headers,
      body: options && options.body
    });
    var text = await response.text();
    var body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (_) {
        body = { message: text };
      }
    }
    if (!response.ok) throw new Error(body.message || "GitHub API error " + response.status);
    return body;
  }

  function decodeBase64Utf8(content) {
    var binary = atob(String(content || "").replace(/\n/g, ""));
    var bytes = Uint8Array.from(binary, function (char) {
      return char.charCodeAt(0);
    });
    return new TextDecoder().decode(bytes);
  }

  function encodeUtf8Base64(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = "";
    for (var index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  async function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result).split(",")[1]);
      };
      reader.onerror = function () {
        reject(reader.error);
      };
      reader.readAsDataURL(file);
    });
  }

  function slugify(value) {
    var slug = String(value || "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return slug || "seminar-" + Date.now();
  }

  function safeName(value) {
    var cleaned = String(value || "file")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || "file";
  }

  function splitTags(value) {
    return String(value || "")
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayDate(value) {
    var date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function normalizePageHref(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return "/" + path.replace(/^\/+/, "");
  }

  function seminarRow(record) {
    var links = record.links || {};
    var paper = links.paper
      ? '<a href="' + escapeHtml(normalizePageHref(links.paper)) + '">PDF</a>&nbsp;&nbsp;'
      : "";
    var slides = links.slides
      ? '<a href="' + escapeHtml(normalizePageHref(links.slides)) + '">PPT</a>'
      : "";
    return [
      "                    <tr>",
      '                        <td style="width:20%"><span class="archive-missing-image" style="width:160px;min-height:100px">archived image unavailable</span></td>',
      '                        <td style="width:80%"><p><font size="3"><b>' + escapeHtml(record.title) + "</b></font><br/>",
      '                            <font size="2">' + escapeHtml(record.speaker) + "<br/>",
      "                            </font><i>" + escapeHtml(displayDate(record.date)) + "</i></p>",
      "                            <p>",
      "                                " + paper,
      "                                " + slides,
      "                            </p>",
      "                        </td>",
      "                    </tr>",
      "                    <tr>",
      '                        <td colspan="2">',
      '                            <div class="archive-separator"></div>',
      "                        </td>",
      "                    </tr>",
      ""
    ].join("\n");
  }

  function insertSeminarRow(html, record) {
    var marker = '<table class="proj_content">';
    var index = html.indexOf(marker);
    if (index === -1) throw new Error("Could not find seminar table in presentation/index.html.");
    var start = index + marker.length;
    return html.slice(0, start) + "\n\n" + seminarRow(record) + html.slice(start);
  }

  async function loadTextFromGit(path) {
    var cfg = config();
    var file = await request("/contents/" + encodePath(path) + "?ref=" + encodeURIComponent(cfg.branch));
    return decodeBase64Utf8(file.content);
  }

  async function loadSeminars() {
    try {
      return JSON.parse(await loadTextFromGit(dataPath));
    } catch (error) {
      var response = await fetch("/" + dataPath, { cache: "no-cache" });
      if (!response.ok) throw error;
      return response.json();
    }
  }

  async function commitFiles(message, files) {
    var cfg = config();
    var ref = await request("/git/ref/heads/" + cfg.branch);
    var latestCommit = await request("/git/commits/" + ref.object.sha);
    var tree = [];

    for (var index = 0; index < files.length; index += 1) {
      var file = files[index];
      var blob = await request("/git/blobs", {
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

    var newTree = await request("/git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: latestCommit.tree.sha,
        tree: tree
      })
    });
    var commit = await request("/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message: message,
        tree: newTree.sha,
        parents: [ref.object.sha]
      })
    });
    await request("/git/refs/heads/" + cfg.branch, {
      method: "PATCH",
      body: JSON.stringify({
        sha: commit.sha,
        force: false
      })
    });
    return commit;
  }

  async function submit(event) {
    event.preventDefault();
    var button = $("commit-seminar");
    button.disabled = true;
    try {
      setStatus("Preparing commit...", "");
      var title = $("seminar-title").value.trim();
      var speaker = $("seminar-speaker").value.trim();
      var date = $("seminar-date").value;
      if (!title || !speaker || !date) throw new Error("Date, speaker, and title are required.");

      var slug = date + "-" + slugify(title);
      var links = {};
      var files = [];
      var paperUrl = $("seminar-paper-url").value.trim();
      var slidesUrl = $("seminar-slides-url").value.trim();
      if (paperUrl) links.paper = paperUrl;
      if (slidesUrl) links.slides = slidesUrl;

      var paperFile = $("seminar-paper-file").files[0];
      var slidesFile = $("seminar-slides-file").files[0];
      if (paperFile) {
        links.paper = "media/pdf/" + slug + "-paper-" + safeName(paperFile.name);
        files.push({ path: links.paper, content: await fileToBase64(paperFile), encoding: "base64" });
      }
      if (slidesFile) {
        links.slides = "media/ppt/" + slug + "-slides-" + safeName(slidesFile.name);
        files.push({ path: links.slides, content: await fileToBase64(slidesFile), encoding: "base64" });
      }

      var record = {
        id: slug,
        date: date,
        speaker: speaker,
        title: title,
        links: links,
        tags: splitTags($("seminar-tags").value)
      };

      setStatus("Loading current seminar files...", "");
      var seminars = await loadSeminars();
      var presentationHtml = await loadTextFromGit(presentationPath);
      var nextSeminars = [record].concat(
        seminars.filter(function (item) {
          return item.id !== record.id;
        })
      ).sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });

      files.push({
        path: dataPath,
        content: JSON.stringify(nextSeminars, null, 2) + "\n"
      });
      files.push({
        path: presentationPath,
        content: insertSeminarRow(presentationHtml, record)
      });

      setStatus("Committing to GitHub...", "");
      var commit = await commitFiles("Add seminar: " + title, files);
      setStatus("Committed: " + commit.sha.slice(0, 7), "ok");
      event.target.reset();
      $("seminar-date").value = new Date().toISOString().slice(0, 10);
    } catch (error) {
      setStatus(error.message || String(error), "error");
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("seminar-date").value = new Date().toISOString().slice(0, 10);
    $("seminar-upload-form").addEventListener("submit", submit);
  });
})();
