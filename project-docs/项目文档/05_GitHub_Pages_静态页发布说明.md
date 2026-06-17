# GitHub Pages 静态页发布说明

## 这份说明是给谁看的
给后续继续维护这个 Demo 的 TRAE / Agent 看。

这个项目是 `React + Vite` 前端工程，仓库里既有源码，也有构建产物。
如果直接把 GitHub Pages 指向仓库根目录 `/`，线上会读取源码入口 `index.html`，但浏览器并不会直接运行 `src/main.jsx` 这种开发态入口，最终容易出现白屏或资源路径错误。

所以这个项目的正确发布方式，不是发布源码根目录，而是发布 **构建后的静态目录 `dist/`**。

---

## 当前项目的正确发布方式

### 仓库地址
- `https://github.com/wjt0321/trae-sharing-prep-assistant`

### 线上地址
- `https://wjt0321.github.io/trae-sharing-prep-assistant/`

### GitHub Pages 正确配置
- Branch：`master`
- Folder：`/dist`

也就是说：
GitHub Pages 应该发布 `master` 分支里的 `dist` 目录，而不是仓库根目录。

---

## 为什么不能直接发根目录
仓库根目录下的 `index.html` 是 Vite 开发入口，默认写法类似：

```html
<script type="module" src="/src/main.jsx"></script>
```

这适合本地开发服务器，不适合直接作为静态成品发布。

而 `npm run build` 后生成的 `dist/index.html` 会引用真正可部署的静态资源，例如：

```html
<script type="module" src="/trae-sharing-prep-assistant/assets/index-xxxx.js"></script>
```

这才是 GitHub Pages 应该加载的版本。

---

## 这个项目当前还需要的关键配置
为了让 GitHub Pages 的仓库子路径正常工作，`vite.config.js` 里已经需要配置：

```js
base: "/trae-sharing-prep-assistant/"
```

原因是 GitHub Pages 不是部署在站点根路径，而是部署在：

- `/trae-sharing-prep-assistant/`

如果不设置 `base`，构建出来的资源路径会指向 `/assets/...`，最终线上资源 404，页面空白。

---

## 正确发布流程
以后如果页面有修改，按这个顺序做：

1. 本地完成改动
2. 运行测试（如果有）
3. 运行构建：

```bash
npm run build
```

4. 确认 `dist/` 已更新
5. 提交并推送到 GitHub：

```bash
git add .
git commit -m "..."
git push
```

6. 等待 GitHub Pages 自动重新发布
7. 打开线上地址检查是否正常

---

## 排障口诀
如果线上打开是空白，优先检查这三件事：

### 1. Pages 是不是发到了根目录 `/`
如果是，容易错。优先确认是否应该改成 `/dist`。

### 2. `vite.config.js` 有没有配置 `base`
如果没有仓库子路径前缀，也容易白屏。

### 3. 本次修改后有没有重新 `npm run build`
如果只改了源码但没重新生成 `dist`，线上仍然会是旧版本。

---

## 一句话结论
这个项目在 GitHub Pages 上的正确心智模型是：

**源码放仓库根目录，成品从 `dist/` 发布。**
