# VIE Group Website Maintenance

主站 `vie-group.github.io` 是展示层；内容源是 `vie-group/vie-group-content`。

```text
vie-group-content
  data/*.json
  assets/seminars/
  rss.xml
  issue templates
  content workflows

vie-group.github.io
  legacy HTML/CSS/JS
  media/ legacy archive
  content-source.json
```

## 内容发布模型

主站不再同步或提交内容数据。页面在浏览器中直接读取：

```text
https://vie-group.github.io/vie-group-content/data/*.json
https://vie-group.github.io/vie-group-content/assets/...
https://vie-group.github.io/vie-group-content/rss.xml
```

`presentation/index.html` 初始不包含静态 seminar 行；正常访问时会从 content repo 运行时渲染完整 seminar archive。

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

内容仓库 Pages 部署完成后，主站会在下次访问时读取最新内容，不需要触发主站 workflow。

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

该 workflow 会更新 `data/news.json` 并重新生成 `rss.xml`。

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
重新生成 rss.xml
自动创建并合并 content PR
关闭原 issue
```

主站会把 `assets/seminars/...` 链接解析到：

```text
https://vie-group.github.io/vie-group-content/assets/seminars/...
```

## 修改单条 Seminar

推荐从主站进入，不需要 GitHub token：

1. 打开 `https://vie-group.github.io/presentation/`。
2. 在要修改的 seminar 行点击 `EDIT`；也可以打开 `https://vie-group.github.io/edit-seminar/` 后搜索并选择记录。
3. 页面会预填该记录当前的日期、报告人、题目、链接、标签和摘要。
4. 修改成完整的最终状态：
   - 保留某个 URL/path：不要改它。
   - 删除某个 URL/path：清空该输入框。
   - 替换图片、paper 或 slides 文件：在跳转后的 GitHub issue 页面，把新文件拖到对应 `Image Attachment` / `Paper Attachment` / `Slides Attachment` 区域。
5. 点击 `Submit Edit via GitHub`，确认 GitHub issue 内容后提交。

`vie-group-content` 的 `Seminar Edit Issue to Pull Request` workflow 会把 issue 当作该 seminar 的完整目标记录处理：

```text
校验提交者身份
按 Original Seminar ID 定位单条记录
用新 metadata/links 替换旧记录
下载 GitHub issue 附件并保存到 assets/seminars/<year>/<seminar-id>/
清理被替换的旧 content-owned 附件
重新生成 rss.xml
自动创建并合并 content PR
关闭原 issue
```

`Original Seminar ID` 会保持稳定，即使修改了日期或题目也不会生成新 ID。

这个 edit 流程面向维护者协作，不做“必须是原上传者本人”的限制；但 workflow 只自动处理 `OWNER`、`MEMBER` 或 `COLLABORATOR` 创建的 issue。外部用户提交的 edit issue 会被自动关闭。

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

一致时才删除 `vie-group-content/data/seminars.json` 记录及对应 `assets/seminars/<year>/<seminar-id>/` 文件，并重新生成 `rss.xml`。

## RSS

RSS 由 content repo 提供：

```text
https://vie-group.github.io/vie-group-content/rss.xml
```

主站不再生成或保存 `rss.xml`。

## Legacy Media

旧站可恢复的论文、poster、slides、PPT 和少量 code 文件仍保留在主站：

```text
media/pdf/
media/ppt/
media/code/
```

新增材料优先放到 `vie-group-content/assets/`。旧站恢复材料暂不迁移，避免一次性搬运 578MB 历史媒体。
