(function () {
  var storageKey = "vie-group-language";
  var currentLanguage = "";
  var isApplying = false;
  var applyScheduled = false;

  var zh = {
    "Welcome to VIE's Homepage": "欢迎访问 VIE 主页",
    "Upload Seminar - VIE Group": "上传组会 - VIE Group",
    "Edit Seminar - VIE Group": "编辑组会 - VIE Group",
    "Edit Publication - VIE Group": "编辑论文 - VIE Group",
    "Edit Team - VIE Group": "编辑团队 - VIE Group",
    "Home": "首页",
    "Team": "团队",
    "Publication": "论文",
    "Seminar": "组会",
    "Activity": "活动",
    "Daily": "日常",
    "Upload Seminar": "上传组会",
    "Visual Inference&Evaluation": "视觉推理与评估",
    "About Us": "关于我们",
    "News": "新闻",
    "Recent Publications": "近期论文",
    "(complete list...)": "（完整列表...）",
    "VIE focuses on computer vision and image/video quality assessment. Current ongoing projects include: multiple-object tracking, surgical video analysis and skill assessment, image and video quality assessment, and image segmentation.": "VIE 课题组聚焦计算机视觉与图像/视频质量评价。目前进行中的研究包括多目标跟踪、手术视频分析与技能评估、图像与视频质量评价、图像分割等。",
    "Team Research Highlight:": "团队研究方向：",
    "computer vision and image/video quality assessment": "计算机视觉与图像/视频质量评价",
    "Journal Publications": "期刊论文",
    "Conference Publications": "会议论文",
    "Datasets": "数据集",
    "Faculty": "教师",
    "Current Members": "在组成员",
    "Ph.D. Student": "博士生",
    "Master Student": "硕士生",
    "Undergraduate Student": "本科生",
    "Graduate Alumni": "研究生校友",
    "Undergraduate Alumni": "本科校友",
    "Alumni": "校友",
    "[edit]": "[编辑]",
    "(edit team...)": "（编辑团队...）",
    "(edit publication...)": "（编辑论文...）",
    "EDIT": "编辑",
    "archived image unavailable": "归档图片不可用",
    "Loading team list from the content repository...": "正在从内容仓库加载团队列表...",
    "Loaded team list from the content repository.": "已从内容仓库加载团队列表。",
    "Could not load team records from the content repository.": "无法从内容仓库加载团队记录。",
    "Loading seminar list from the content repository...": "正在从内容仓库加载组会列表...",
    "Loaded seminar list from the content repository.": "已从内容仓库加载组会列表。",
    "No seminar records are published in the content repository.": "内容仓库中暂无已发布的组会记录。",
    "Could not load seminar records from the content repository.": "无法从内容仓库加载组会记录。",
    "Loading publication list from the content repository...": "正在从内容仓库加载论文列表...",
    "Loaded publication list from the content repository.": "已从内容仓库加载论文列表。",
    "No publication records are published in the content repository.": "内容仓库中暂无已发布的论文记录。",
    "Could not load publication records from the content repository.": "无法从内容仓库加载论文记录。",
    "Upload Seminar": "上传组会",
    "Fill the seminar details here, then open a pre-filled GitHub issue in the VIE content repository. If the paper already has a PDF link, fill Paper URL; if you need to submit PPT or a cover image, drag them into the attachment sections on the GitHub page.": "请在这里填写组会信息，然后打开一个预填好的 GitHub Issue 提交到 VIE 内容仓库。如果论文已有 PDF 链接，请填写 Paper URL；如果需要提交 PPT 或封面图，请在 GitHub 页面对应附件区域拖入文件。",
    "Date": "日期",
    "Speaker": "报告人",
    "Title": "标题",
    "Optional links and notes": "可选链接和说明",
    "Image URL": "图片链接",
    "Paper URL": "论文链接",
    "Slides URL": "幻灯片链接",
    "Code URL": "代码链接",
    "Video URL": "视频链接",
    "Tags": "标签",
    "Abstract": "摘要",
    "On the GitHub issue page, use Image Attachment for the thumbnail and Slides Attachment for PPT/PDF upload. Empty URL fields are fine; the content workflow reads the attachment links GitHub inserts there and saves uploaded files under vie-group-content/assets/seminars/.": "在 GitHub Issue 页面中，请用 Image Attachment 上传缩略图，用 Slides Attachment 上传 PPT/PDF。URL 字段可以留空；内容 workflow 会读取 GitHub 插入的附件链接，并把上传文件保存到 vie-group-content/assets/seminars/。",
    "Submit via GitHub": "通过 GitHub 提交",
    "Ready.": "就绪。",
    "Edit Seminar": "编辑组会",
    "Choose one published seminar, edit the full desired metadata and links, then open a pre-filled GitHub issue in the VIE content repository.": "请选择一条已发布组会记录，编辑完整的目标元数据和链接，然后打开一个预填好的 GitHub Issue 提交到 VIE 内容仓库。",
    "Find Seminar": "查找组会",
    "Seminar Record": "组会记录",
    "Loading seminar records...": "正在加载组会记录...",
    "Original Seminar ID": "原始组会编号",
    "Links, tags, and abstract": "链接、标签和摘要",
    "Select a seminar to inspect current material links.": "请选择一条组会记录以查看当前材料链接。",
    "This seminar currently has no material links.": "这条组会记录当前没有材料链接。",
    "Keep a URL/path to retain it. Clear a URL/path to remove it. On the GitHub issue page, drag replacement image, paper, or slides files into the matching Attachment section; attachments override URL fields and will be copied into vie-group-content/assets/seminars/.": "保留 URL/路径表示继续使用；清空 URL/路径表示移除。在 GitHub Issue 页面中，将替换图片、论文或幻灯片拖入对应 Attachment 区域；附件会覆盖 URL 字段，并复制到 vie-group-content/assets/seminars/。",
    "Submit Edit via GitHub": "通过 GitHub 提交编辑",
    "Edit Publication": "编辑论文",
    "Most edits only need the core citation fields below. File links and less common fields are collapsed.": "多数编辑只需要填写下面的核心引用字段；文件链接和低频字段已折叠。",
    "Find Publication": "查找论文",
    "Publication Record": "论文记录",
    "Loading publication records...": "正在加载论文记录...",
    "Year": "年份",
    "Authors": "作者",
    "Venue": "发表信息",
    "IDs, links, tags, and other fields": "编号、链接、标签和其它字段",
    "Publication ID": "论文编号",
    "Type": "类型",
    "Note": "备注",
    "PDF URL": "PDF 链接",
    "Slide URL": "幻灯片链接",
    "Poster URL": "海报链接",
    "Select a publication to inspect current material links.": "请选择一条论文记录以查看当前材料链接。",
    "This publication currently has no material links.": "这条论文记录当前没有材料链接。",
    "Link/file fields are preserved as currently filled. Open the folded section only when those fields need changes.": "链接/文件字段会按当前填写内容保留；仅在需要修改这些字段时展开折叠区域。",
    "Edit Team": "编辑团队",
    "Choose whether you are adding a new person or editing existing team records.": "请选择新增成员或编辑现有团队记录。",
    "Add Person": "新增成员",
    "Edit Existing People": "编辑现有成员",
    "Visual Status Board": "可视化状态面板",
    "Loading team records...": "正在加载团队记录...",
    "Batch Target Group": "批量目标分组",
    "Batch Year": "批量年份",
    "Batch Role": "批量身份",
    "Batch Degree": "批量学位",
    "Batch Destination / Affiliation": "批量去向 / 单位",
    "Stage Selected Move": "暂存选中移动",
    "Clear Selection": "清除选择",
    "Clear Staged Changes": "清除暂存变更",
    "No staged changes.": "暂无暂存变更。",
    "Find Person": "查找成员",
    "Team Record": "团队记录",
    "Operation": "操作",
    "Target Group": "目标分组",
    "Name": "姓名",
    "Role": "身份",
    "Email": "邮箱",
    "Faculty, alumni, image, and profile fields": "教师、校友、图片和主页字段",
    "Affiliation": "单位",
    "Address": "地址",
    "Degree": "学位",
    "Destination": "去向",
    "Profile URL": "个人主页链接",
    "Existing values are preserved as currently filled. On the GitHub issue page, drag a portrait into Image Attachment when replacing the image.": "现有值会按当前填写内容保留。在 GitHub Issue 页面中，如需替换头像，请把图片拖入 Image Attachment。",
    "Submit Team Edit via GitHub": "通过 GitHub 提交团队编辑",
    "Select role...": "选择身份...",
    "Select degree...": "选择学位...",
    "No records": "暂无记录",
    "No matching seminar records": "没有匹配的组会记录",
    "No matching publication records": "没有匹配的论文记录",
    "Select a seminar...": "选择组会记录...",
    "Select a publication...": "选择论文记录...",
    "Ready to add a new team member.": "已准备新增团队成员。",
    "Ready to edit the selected team member.": "已准备编辑选中的团队成员。",
    "Choose a team member to edit, or select people on the board.": "请选择要编辑的团队成员，或在面板中选择成员。",
    "Team records loaded.": "团队记录已加载。",
    "Select at least one member first.": "请先选择至少一位成员。"
  };

  var placeholders = {
    "Name": "姓名",
    "Paper or talk title": "论文或报告标题",
    "Optional": "可选",
    "Optional short summary": "可选的简短摘要",
    "Search date, speaker, title, or seminar id": "搜索日期、报告人、标题或组会编号",
    "Search year, authors, title, venue, or publication id": "搜索年份、作者、标题、发表信息或论文编号",
    "Search name, role, email, year, destination": "搜索姓名、身份、邮箱、年份或去向",
    "Optional publication note": "可选论文备注",
    "Destination for alumni, affiliation for faculty": "校友填去向，教师填单位",
    "Company, university, or role": "公司、学校或职位",
    "What changed and why?": "修改了什么，为什么修改？"
  };

  var reverseZh = {};
  Object.keys(zh).forEach(function (key) {
    reverseZh[zh[key]] = key;
  });

  function preferredLanguage() {
    try {
      var saved = window.localStorage && window.localStorage.getItem(storageKey);
      if (saved === "en" || saved === "zh") return saved;
    } catch (error) {
      // Fall back to the browser language.
    }
    var languages = navigator.languages || [navigator.language || ""];
    return languages.some(function (language) {
      return /^zh\b/i.test(language);
    }) ? "zh" : "en";
  }

  function trimText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function preserveOuterWhitespace(original, translated) {
    var leading = String(original || "").match(/^\s*/)[0];
    var trailing = String(original || "").match(/\s*$/)[0];
    return leading + translated + trailing;
  }

  function entry(key) {
    if (!key || !zh[key]) return null;
    return {
      en: key,
      zh: zh[key]
    };
  }

  function currentTextForKey(key) {
    var item = entry(key);
    if (!item) return "";
    return currentLanguage === "zh" ? item.zh : item.en;
  }

  function keyFromRenderedText(textValue) {
    var text = trimText(textValue);
    if (zh[text]) return text;
    return reverseZh[text] || "";
  }

  function shouldSkipElement(element) {
    if (!element || !element.tagName) return true;
    return /^(script|style|textarea|input)$/i.test(element.tagName);
  }

  function applyElementText(element) {
    if (shouldSkipElement(element) || element.children.length) return;
    var existingKey = element.getAttribute("data-vie-i18n-auto") || "";
    if (existingKey) {
      var expectedText = currentTextForKey(existingKey);
      var rendered = trimText(element.textContent);
      if (rendered !== trimText(expectedText) && rendered !== existingKey && rendered !== zh[existingKey]) {
        element.removeAttribute("data-vie-i18n-auto");
        existingKey = "";
      }
    }

    var key = existingKey || element.getAttribute("data-i18n") || keyFromRenderedText(element.textContent);
    var item = entry(key);
    if (!item) return;
    if (!element.getAttribute("data-i18n")) element.setAttribute("data-vie-i18n-auto", key);
    var nextText = preserveOuterWhitespace(element.textContent, currentLanguage === "zh" ? item.zh : item.en);
    if (element.textContent !== nextText) element.textContent = nextText;
  }

  function applyAttribute(element, attr, map, autoAttr) {
    if (!element || !element.hasAttribute(attr)) return;
    var existingKey = element.getAttribute(autoAttr) || "";
    var current = element.getAttribute(attr) || "";
    if (existingKey) {
      var expected = currentLanguage === "zh" ? map[existingKey] : existingKey;
      if (current !== expected && current !== existingKey && current !== map[existingKey]) {
        element.removeAttribute(autoAttr);
        existingKey = "";
      }
    }
    var key = existingKey;
    if (!key && map[current]) key = current;
    if (!key) {
      key = Object.keys(map).find(function (candidate) {
        return map[candidate] === current;
      }) || "";
    }
    if (!key) return;
    element.setAttribute(autoAttr, key);
    var nextValue = currentLanguage === "zh" ? map[key] : key;
    if (element.getAttribute(attr) !== nextValue) element.setAttribute(attr, nextValue);
  }

  function apply(root) {
    if (!root || isApplying) return;
    isApplying = true;
    currentLanguage = currentLanguage || preferredLanguage();
    document.documentElement.setAttribute("lang", currentLanguage === "zh" ? "zh-CN" : "en");
    document.documentElement.setAttribute("data-vie-lang", currentLanguage);
    if (entry(document.title) || reverseZh[document.title]) {
      var titleKey = reverseZh[document.title] || document.title;
      document.title = currentLanguage === "zh" ? zh[titleKey] : titleKey;
    }

    var nodes = [];
    if (root.nodeType === 1) nodes.push(root);
    Array.prototype.push.apply(nodes, (root.nodeType === 1 ? root : document).querySelectorAll(
      "a,button,h1,h2,h3,h4,h5,h6,p,span,strong,b,summary,div,td,option,font"
    ));
    nodes.forEach(function (node) {
      applyElementText(node);
      applyAttribute(node, "placeholder", placeholders, "data-vie-i18n-placeholder-auto");
      applyAttribute(node, "title", zh, "data-vie-i18n-title-auto");
      applyAttribute(node, "aria-label", zh, "data-vie-i18n-aria-auto");
    });
    updateToggleState();
    isApplying = false;
  }

  function scheduleApply() {
    if (applyScheduled || isApplying) return;
    applyScheduled = true;
    window.requestAnimationFrame(function () {
      applyScheduled = false;
      apply(document.body || document.documentElement);
    });
  }

  function setLanguage(language) {
    currentLanguage = language === "zh" ? "zh" : "en";
    try {
      window.localStorage && window.localStorage.setItem(storageKey, currentLanguage);
    } catch (error) {
      // Persistence is optional.
    }
    apply(document.body || document.documentElement);
    window.dispatchEvent(new CustomEvent("vie:languagechange", { detail: { language: currentLanguage } }));
  }

  function updateToggleState() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-vie-language-choice]"), function (button) {
      var active = button.getAttribute("data-vie-language-choice") === currentLanguage;
      button.className = active ? "is-active" : "";
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function injectToggle() {
    if (document.querySelector(".vie-language-toggle")) return;
    var menu = document.getElementById("menu_container") || document.querySelector("nav");
    if (!menu) return;
    var wrap = document.createElement("div");
    wrap.className = "vie-language-toggle";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Language");

    var en = document.createElement("button");
    en.type = "button";
    en.textContent = "EN";
    en.setAttribute("data-vie-language-choice", "en");
    en.addEventListener("click", function () { setLanguage("en"); });

    var cn = document.createElement("button");
    cn.type = "button";
    cn.textContent = "中文";
    cn.setAttribute("data-vie-language-choice", "zh");
    cn.addEventListener("click", function () { setLanguage("zh"); });

    wrap.appendChild(en);
    wrap.appendChild(cn);
    menu.appendChild(wrap);
  }

  function boot() {
    currentLanguage = preferredLanguage();
    injectToggle();
    apply(document.body || document.documentElement);
    if (window.MutationObserver && document.body) {
      new MutationObserver(function () {
        scheduleApply();
      }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "title", "aria-label"]
      });
    }
  }

  window.VIELang = {
    get: function () { return currentLanguage || preferredLanguage(); },
    set: setLanguage,
    t: function (key, fallback) {
      var item = entry(key);
      if (!item) return fallback === undefined ? key : fallback;
      return (currentLanguage || preferredLanguage()) === "zh" ? item.zh : item.en;
    },
    apply: apply
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("storage", function (event) {
    if (event.key === storageKey && (event.newValue === "en" || event.newValue === "zh")) {
      currentLanguage = event.newValue;
      apply(document.body || document.documentElement);
    }
  });
})();
