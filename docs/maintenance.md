# VIE Group Website Maintenance

主站 `vie-group.github.io` 现在是展示与部署层；内容源是 `vie-group/vie-group-content`。

```text
vie-group-content
  data/*.json
  assets/seminars/
  issue templates
  content workflows

vie-group.github.io
  legacy HTML/CSS/JS
  media/ legacy archive
  content-source.json
  sync/deploy workflows
```

## 内容同步

主站通过 `.github/workflows/sync-content.yml` 从 `vie-group-content` 同步：

```text
vie-group-content/data/*.json -> vie-group.github.io/data/*.json
```

同步后会重建：

```text
presentation/index.html
rss.xml
```

手动同步路径：

1. 打开 `vie-group.github.io` 的 Actions。
2. 运行 `Sync Content Repository`。
3. `content_ref` 默认填 `main`。

如果在 `vie-group-content` 配置 secret `VIE_SITE_SYNC_TOKEN`，content repo push 后会自动触发主站同步。这个 token 需要能在 `vie-group.github.io` 运行 workflow 并写入 contents。

## 老师可视化修改内容

1. 打开 `https://vie-group.github.io/admin.html#visual`。
2. Repository 默认应为：
   - Owner: `vie-group`
   - Repo: `vie-group-content`
   - Branch: `main`
3. 粘贴有 `vie-group-content` `Contents: Read and write` 权限的 GitHub fine-grained token。
4. 点击 `Load Data`。
5. 在 `Visual Editor` 中编辑首页文案、News、Team、Activity、Publications、Seminars。
6. 点击 `Commit All Website Content`。
7. 运行主站 `Sync Content Repository`，或依赖 `VIE_SITE_SYNC_TOKEN` 自动触发同步。

## 老师修改 Publications

1. 打开 `https://vie-group.github.io/admin.html#publication`。
2. Repository 保持 `vie-group-content`。
3. 点击 `Load Data`，修改论文字段，点击 `Save Draft`。
4. 点击 `Commit Publications`。

也可以直接在 GitHub 网页编辑：

```text
https://github.com/vie-group/vie-group-content/edit/main/data/publications.json
```

## 老师单独增加 News

在 `vie-group-content` 运行：

```text
Actions -> Add News Record -> Run workflow
```

该 workflow 只更新 `vie-group-content/data/news.json`。主站展示依赖后续同步。

## 同学上传组会 PPT 与 Paper

普通同学首选路径不需要 GitHub token：

1. 打开 `https://vie-group.github.io/upload-seminar/`。
2. 在站内填写日期、报告人、题目。
3. 如已有材料外链，可填写 Image URL / Paper URL / Slides URL。
4. 点击 `Submit via GitHub`。
5. 页面会跳到 `vie-group-content` 中已经填好标题和正文的 GitHub issue。
6. 如果材料是本地图片/PPT/PDF，在 GitHub issue 页面把文件拖到 `Image Attachment`、`Paper Attachment` 或 `Slides Attachment` 对应位置。
7. 点击 `Submit new issue`。

`vie-group-content` 的 `Seminar Issue to Pull Request` workflow 会：

```text
校验提交者身份
下载 GitHub issue 附件
保存到 assets/seminars/<year>/<seminar-id>/
更新 data/seminars.json
自动创建并合并 content PR
关闭原 issue
```

主站部署时会把 `assets/seminars/...` 链接解析到：

```text
https://raw.githubusercontent.com/vie-group/vie-group-content/main/assets/seminars/...
```

## 同学删除自己上传的 Seminar

删除请求也在 `vie-group-content` 创建：

1. 打开 `https://github.com/vie-group/vie-group-content/issues/new/choose`。
2. 选择 `Delete seminar submission`。
3. 填写 `Original Seminar Issue Number`。
4. 对迁移前来自主站的旧记录，同时填写 `Seminar ID`。
5. 提交 issue。

workflow 会检查：

```text
原 seminar 上传 issue 的创建者 == 当前删除 issue 的创建者
```

一致时才删除 `vie-group-content/data/seminars.json` 记录及对应 `assets/seminars/<year>/<seminar-id>/` 文件，并自动合并 content PR。

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
    "slide": "assets/publications/2024/slides.pdf"
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
    "repository": "vie-group/vie-group-content",
    "issueNumber": 1,
    "issueUrl": "https://github.com/vie-group/vie-group-content/issues/1",
    "author": "github-user"
  }
}
```

## Legacy Media

旧站可恢复的论文、poster、slides、PPT 和少量 code 文件仍保留在主站：

```text
media/pdf/
media/ppt/
media/code/
```

新增材料优先放到 `vie-group-content/assets/`。旧站恢复材料暂不迁移，避免一次性搬运 578MB 历史媒体。

Activity detail 文本归档仍在：

```text
data/activity-details.json
data/activity-asset-manifest.json
```

重新抽取：

```bash
npm run archive:activity
```

重新尝试 Wayback 补抓：

```bash
export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=http://127.0.0.1:7890
npm run archive:activity:download
```
