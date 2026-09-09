# VIE Group Website Maintenance

这套站点是纯静态 GitHub Pages：页面读取 `data/*.json`，不需要后端、不需要数据库。

## 老师可视化修改全站内容

1. 打开 `https://vie-group.github.io/admin.html#visual`。
2. 在 Repository 区域填写仓库信息，并粘贴有本仓库 `Contents: Read and write` 权限的 GitHub fine-grained token。
3. 点击 `Load Data`。
4. 在 `Visual Editor` 中直接点击文字块编辑。它覆盖首页基础文案、研究方向、News、Team、Activity、Publications、Seminars。
5. 点击 `Commit All Website Content`，后台会把修改写回对应的 `data/*.json` 并生成 commit。

说明：组会 PPT/PDF 这类二进制文件上传仍使用下方 `Seminar Upload`；Visual Editor 负责编辑页面显示的文字、日期、链接和元数据。

## 老师单独增加 News

1. 打开 Actions -> `Add News Record` -> `Run workflow`。
2. 填写 `date` 和 `text`。
3. workflow 会更新 `data/news.json`，重新生成 `rss.xml`，通过校验后自动提交到 `main`。

## 老师修改 Publications

1. 打开 `https://vie-group.github.io/admin.html#publication`。
2. 在 Repository 区域填写：
   - Owner: `vie-group`
   - Repo: `vie-group.github.io`
   - Branch: `main`
3. 粘贴 GitHub fine-grained token。权限只需要本仓库 `Contents: Read and write`。
4. 点击 `Load Data`，选择论文，修改字段，点击 `Save Draft`。
5. 点击 `Commit Publications`。

如果分支保护禁止直接 push，请改为在 GitHub 网页编辑 `data/publications.json` 并提交 Pull Request。

## 同学上传组会 PPT 与 Paper

普通同学的首选路径不需要 GitHub token：

1. 打开 `https://vie-group.github.io/upload-seminar/`。
2. 在站内填写日期、报告人、题目。
3. 如已有材料外链，可在 `Optional links and notes` 中填写 Image URL / Paper URL / Slides URL。
4. 点击 `Submit via GitHub`。
5. 页面会跳到一个已经填好标题和正文的 GitHub issue。
6. 如果材料是本地图片/PPT/PDF，在 GitHub issue 页面把文件拖到 `Image Attachment`、`Paper Attachment` 或 `Slides Attachment` 对应位置。
7. 点击 `Submit new issue`。
8. `Seminar Issue to Pull Request` workflow 会把 GitHub issue 附件下载到 `assets/seminars/<year>/<seminar-id>/`，再自动更新 `data/seminars.json`、`presentation/index.html` 和 `rss.xml`，并开 Pull Request。
9. 老师或维护者 review 后 merge，Pages 自动部署。

说明：纯 GitHub Pages 不能把站内选择的本地文件直接塞进 GitHub issue 附件；本地文件必须在 GitHub issue 页面拖入一次。这样可以避免要求上传者申请 fine-grained token。

## 同学删除自己上传的 Seminar

如果上传后发现日期、文件或标题有问题，普通同学可以提交删除请求，不需要 GitHub token：

1. 打开 GitHub -> Issues -> New issue。
2. 选择 `Delete seminar submission` 模板。
3. 填写 `Original Seminar Issue Number`，例如 `#1`。
4. `Seminar ID` 可留空；workflow 会优先从原上传 issue 的 Date / Title 推导。
5. 提交 issue。

`Seminar Delete Issue to Pull Request` workflow 会先检查两个作者：

```text
原 seminar 上传 issue 的创建者 == 当前删除 issue 的创建者
```

只有二者一致时，workflow 才会删除 `data/seminars.json` 里的记录、`presentation/index.html` 的旧站行，以及 `assets/seminars/<year>/<seminar-id>/` 下由 workflow 本地化保存的附件，并自动开 PR / merge / close issue。

如果两者不一致，workflow 只会关闭删除请求并留言，不会修改仓库文件。老师或维护者要删除别人提交的记录时，应直接走 GitHub PR 或仓库维护流程。

管理员直写路径保留：

1. 打开 `https://vie-group.github.io/admin.html#seminar`。
2. 粘贴有本仓库 `Contents: Read and write` 权限的 token。
3. 填写日期、报告人、题目、tags。
4. 选择 PDF/PPT 文件。
5. 点击 `Commit Seminar`。

后台会把文件提交到：

```text
assets/seminars/<year>/<date-title-slug>/
```

并同步追加 `data/seminars.json`。文件和元数据在同一个 commit 里。

备用 workflow 路径：

1. 在 GitHub 网页进入 `assets/seminars/<year>/` 上传文件。
2. 打开 Actions -> `Add Seminar Record` -> `Run workflow`。
3. 填写 date、speaker、title、paper_url、slides_url 等字段。
4. workflow 会提交 `data/seminars.json`。

## 数据格式

Publication:

```json
{
  "id": "2024-author-short-title",
  "type": "conference",
  "year": 2024,
  "authors": "A, B, C",
  "title": "Paper Title",
  "venue": "CVPR 2024",
  "note": "Optional pages or location",
  "links": {
    "pdf": "assets/publications/2024/paper.pdf",
    "code": "https://github.com/example/repo",
    "slide": "assets/publications/2024/slides.pdf",
    "poster": "assets/publications/2024/poster.pdf"
  },
  "tags": ["IQA", "segmentation"]
}
```

Seminar:

```json
{
  "id": "2024-04-07-paper-title",
  "date": "2024-04-07",
  "speaker": "Name",
  "title": "Seminar Title",
  "abstract": "Optional short abstract",
  "links": {
    "paper": "assets/seminars/2024/2024-04-07-paper-title/paper.pdf",
    "slides": "assets/seminars/2024/2024-04-07-paper-title/slides.pptx",
    "image": "assets/seminars/2024/2024-04-07-paper-title/image.png"
  },
  "tags": ["robustness"],
  "source": {
    "type": "github-issue",
    "issueNumber": 1,
    "issueUrl": "https://github.com/vie-group/vie-group.github.io/issues/1",
    "author": "github-user"
  }
}
```

## Deployment

`pages.yml` 会在 `main` 分支 push 后部署 GitHub Pages。仓库设置中选择 GitHub Actions 作为 Pages source。

## CI / Workflow

- `Validate Site Data`: push / pull request 时校验所有 `data/*.json` 的结构。
- `Deploy GitHub Pages`: main 分支变更后发布静态站。
- `Add News Record`: 手动追加 News，并同步更新 RSS。
- `Add Seminar Record`: 手动追加组会记录，适合已有文件链接时使用。
- `Add Publication Record`: 手动追加论文记录。
- `Seminar Issue to Pull Request`: 把同学提交的 `seminar-submission` issue 自动转成 PR，并同步旧站复刻页 `presentation/index.html`。

## Localized Archived Content

旧站可恢复的论文、poster、slides、PPT 和少量 code 文件已经下载到仓库本地：

```text
media/pdf/
media/ppt/
media/code/
```

站点前端不会再把 `media/...` 链接跳转到 Wayback。新增材料建议放到 `assets/seminars/` 或 `assets/publications/`；旧站恢复材料保留在 `media/`，方便区分来源。

Activity 页面中 `[Detail]` 对应的隐藏正文已经结构化归档到：

```text
data/activity-details.json
data/activity-asset-manifest.json
```

如需重新从 `activity/index.html` 抽取 detail：

```bash
npm run archive:activity
```

如需同时尝试从 Wayback 补抓 detail 图片：

```bash
npm run archive:activity:download
```

如果本地网络无法访问 Internet Archive，可在 macOS 终端里先设置代理：

```bash
export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=http://127.0.0.1:7890
```

默认只尝试 Wayback 原始文件直链；如果需要更彻底但更慢的 CDX 搜索，可运行：

```bash
node scripts/archive-activity-details.mjs --download --cdx
```

如果后续需要重新补抓旧站材料，可运行：

```bash
npm run download:wayback
```

下载脚本会读取 `data/publications.json` 和 `data/seminars.json` 中的 `media/...` 引用，跳过已存在文件，并生成 `data/asset-manifest.json`。
