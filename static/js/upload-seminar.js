(function () {
  var repoOwner = "vie-group";
  var repoName = "vie-group.github.io";
  var issueLabel = "seminar-submission";

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message, tone) {
    var node = $("upload-status");
    node.textContent = message;
    node.className = tone || "";
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function isValidDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function isValidLink(value) {
    if (!value) return true;
    return /^(https?:\/\/|media\/|assets\/|\/media\/|\/assets\/)/i.test(value);
  }

  function field(label, value) {
    return "### " + label + "\n" + (clean(value) || "_No response_") + "\n";
  }

  function issueBody(data) {
    return [
      field("Date", data.date),
      field("Speaker", data.speaker),
      field("Title", data.title),
      field("Paper URL", data.paperUrl),
      field("Slides URL", data.slidesUrl),
      field("Paper Attachment", "Drag or paste the paper PDF here if no Paper URL is available."),
      field("Slides Attachment", "Drag or paste the slides PDF/PPT here if no Slides URL is available."),
      field("Tags", data.tags),
      field("Abstract", data.abstract),
      "### Submission Note\nGenerated from https://www.vie.group/upload-seminar/. Please attach local files before submitting this issue.\n"
    ].join("\n");
  }

  function buildIssueUrl(data) {
    var params = new URLSearchParams();
    params.set("title", "[Seminar] " + data.date + " " + data.speaker + " - " + data.title);
    params.set("body", issueBody(data));
    params.set("labels", issueLabel);
    return "https://github.com/" + repoOwner + "/" + repoName + "/issues/new?" + params.toString();
  }

  function submit(event) {
    event.preventDefault();
    var data = {
      date: clean($("seminar-date").value),
      speaker: clean($("seminar-speaker").value),
      title: clean($("seminar-title").value),
      paperUrl: clean($("seminar-paper-url").value),
      slidesUrl: clean($("seminar-slides-url").value),
      tags: clean($("seminar-tags").value),
      abstract: clean($("seminar-abstract").value)
    };

    if (!isValidDate(data.date)) {
      setStatus("Date must use YYYY-MM-DD.", "error");
      return;
    }
    if (!data.speaker || !data.title) {
      setStatus("Speaker and title are required.", "error");
      return;
    }
    if (!isValidLink(data.paperUrl) || !isValidLink(data.slidesUrl)) {
      setStatus("Paper/Slides URL must be http(s) or a repository path under media/ or assets/.", "error");
      return;
    }

    var url = buildIssueUrl(data);
    if (url.length > 8000) {
      setStatus("The issue text is too long. Please shorten the abstract or move details into the GitHub issue after it opens.", "error");
      return;
    }

    setStatus("Opening GitHub issue...", "ok");
    window.location.href = url;
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("seminar-date").value = new Date().toISOString().slice(0, 10);
    $("seminar-upload-form").addEventListener("submit", submit);
  });
})();
