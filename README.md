# 我的生活工作台 · 使用说明

一个可安装到手机桌面的个人生活 + 工作管理应用。纯前端、离线可用、数据存在本机。

---

## 一、怎么用起来（3 步）

### 第 1 步：打开
用手机浏览器（推荐 **Safari** 或 **Chrome**）打开部署好的网址。

### 第 2 步：添加到主屏幕（像 App 一样）
- **iPhone / Safari**：点底部「分享」→ 下拉找到「**添加到主屏幕**」→ 命名 → 添加。
- **Android / Chrome**：点右上角「⋮」→「**安装应用**」或「添加到主屏幕」。
- **电脑 / Chrome**：地址栏右侧会出现「安装」图标，点一下即可。

完成后桌面会出现图标（紫色方块），点开即全屏使用，没有浏览器地址栏。

### 第 3 步：开始记录
底部 5 个主分区 + 「更多」里还有 4 个分区，点右下角 **+** 添加内容。

---

## 二、分区一览

| 分区 | 类型 | 作用 |
|------|------|------|
| **概览** | 仪表盘 | 今日待办、打卡、日程、本月收支一屏看完 |
| **待办** | 清单 | 任务、优先级、截止日期、分类 |
| **日程** | 清单 | 日 / 时 / 地点的安排 |
| **习惯** | 打卡 | 7 天打卡格，自动统计本周完成数 |
| **记账** | 账本 | 收支记录，自动汇总本月收入/支出/结余 |
| **看板** | 三列流转 | 待办 → 进行中 → 已完成 |
| **笔记** | 清单 | 随手记、灵感收集 |
| **健康** | 清单 | 体重、睡眠、运动、心情 |
| **目标** | 清单 | 长期目标 + 进度百分比 |

> 配色遵循中式习惯：**收入/上涨显示红色，支出/下跌显示绿色**。

---

## 三、数据与备份

- 数据默认保存在**本机浏览器**，不上传任何服务器，隐私安全。
- **换手机 / 清缓存前，务必导出备份**：右上角 ⚙ → 数据备份 → 导出备份（得到一个 `.json` 文件）。
- 新设备上：⚙ → 导入备份 → 选择该文件即可恢复。

---

## 四、如何扩展（重点）

整个应用是**模块化**的，加一个新分区只要改一处：

打开 `assets/modules.js`，在 `MODULES` 数组末尾加一个对象：

```js
, {
  id: 'reading',            // 唯一标识（同时是数据表名）
  name: '读书',             // 分区名
  icon: '▤',                // 导航图标
  desc: '读书清单',
  type: 'list',             // list / board / checkin / ledger
  fields: [
    { key: 'title', label: '书名', type: 'text', required: true },
    { key: 'author', label: '作者', type: 'text' },
    { key: 'status', label: '状态', type: 'select', options: ['想读','在读','已读'] },
    { key: 'date', label: '完成日期', type: 'date' },
    { key: 'note', label: '读后感', type: 'textarea' }
  ]
}
```

**字段类型**：`text` / `textarea` / `number` / `date` / `time` / `select` / `tags`
**分区类型**：`list`（清单）、`board`（看板）、`checkin`（打卡）、`ledger`（记账）

保存刷新即生效，无需改其它文件。

---

## 五、后续可继续加的功能（已预留）

| 需求 | 现状 |
|------|------|
| 云同步 / 多设备 | 已在 `db.js` 预留 `SyncAdapter` 接口，设置页有同步入口 |
| 深色模式 | 样式变量已备好（`html[data-theme="dark"]`），待接入开关 |
| 拖动排序分区 | 右上角 ✎ 编辑模式入口已预留 |
| 数据图表 | 记账/健康数据已结构化，可直接接图表库 |
| 提醒推送 | 需接入通知能力 |
| 打包成真正的 App | 可基于当前 PWA 用 Capacitor 打包 |

有想法随时说，我来改。

---

## 六、文件结构

```
workbench/
├── index.html              # 页面骨架
├── manifest.webmanifest    # PWA 配置（桌面图标、全屏）
├── sw.js                   # 离线缓存
├── icons/                  # 应用图标
└── assets/
    ├── style.css           # 样式（含深色模式变量）
    ├── db.js               # 数据层 + 云同步接口
    ├── modules.js          # ★ 分区注册表（扩展改这里）
    └── app.js              # 主逻辑
```

---

## 七、部署上线（让手机能访问）

本项目是纯静态站点，仓库已内置 **Vercel** 与 **Netlify** 的配置文件，可直接一键部署。

### 方式 A：Netlify Drop（最快，无需注册 Git）

1. 电脑浏览器打开 <https://app.netlify.com/drop>
2. 把整个 `workbench` 文件夹**拖进去**
3. 等十几秒 → 得到一个 `https://xxx.netlify.app` 网址
4. 手机浏览器打开该网址，按「一、怎么用起来」添加到主屏幕

> 想固定网址：在 Netlify 里注册免费账号（可用邮箱/GitHub），即可保留站点并自定义域名。

### 方式 B：Vercel（推荐，能自动更新）

1. 把仓库推到 GitHub（见下）
2. 打开 <https://vercel.com/new> → 用 GitHub 登录 → 选择该仓库
3. Framework Preset 选 **Other**，Build Command 留空，Output Directory 留 `.`
4. 点 **Deploy** → 几十秒后得到 `https://xxx.vercel.app`

以后每次 `git push`，Vercel 会自动重新部署。

### 方式 C：GitHub Pages

1. 把仓库推到 GitHub
2. 仓库 **Settings → Pages → Source** 选 `main` 分支、`/ (root)` → Save
3. 网址为 `https://用户名.github.io/仓库名/`

### 方式 D：自己的服务器（Nginx）

```bash
# 把文件夹内容上传到服务器网站根目录
scp -r workbench/* user@你的服务器:/var/www/workbench/
```

Nginx 配置：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    root /var/www/workbench;
    index index.html;
    location = /sw.js { add_header Cache-Control "no-cache"; }
}
```

### 推送到 GitHub（方式 B/C 前置）

```bash
cd workbench
git remote add origin https://github.com/你的用户名/workbench.git
git branch -M main
git push -u origin main
```

> ⚠️ PWA 的「安装到桌面」和离线功能需要 **HTTPS**（localhost 除外）。以上平台都会自动带 HTTPS。

### 自定义域名（可选）

在 Netlify / Vercel 后台找到 **Domains**，添加自己的域名并按提示配置 DNS 即可，免费套餐已支持。

---

## 八、本地预览（开发用）

```bash
cd workbench
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

---

## 九、主题说明

当前为 **ins 极简 · 美拉德 × 奶油** 配色：

| 用途 | 色值 |
|------|------|
| 主色（焦糖棕） | `#a9714b` |
| 背景（奶油白） | `#faf6f0` |
| 卡片（纯白） | `#ffffff` |
| 主文字（深咖） | `#3d3229` |
| 次级文字（浅咖） | `#8a7a6b` |
| 边框（米灰） | `#ece4d8` |
| 收入（砖红） | `#c05f4c` |
| 支出（橄榄绿） | `#7d9471` |

**想换配色**：只改 `assets/style.css` 顶部 `:root` 里的变量即可，全站自动生效。
深浅色变量已备好（`html[data-theme="dark"]`），后续可加切换开关。

查看效果：浏览器打开 `theme-preview.html`。

---

## 十、文件结构

```
workbench/
├── index.html              # 页面骨架
├── manifest.webmanifest    # PWA 配置（桌面图标、全屏）
├── sw.js                   # 离线缓存
├── vercel.json             # Vercel 部署配置
├── netlify.toml            # Netlify 部署配置
├── theme-preview.html      # 主题效果预览页
├── README.md               # 本文档
├── icons/                  # 应用图标（你的头像）
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
└── assets/
    ├── style.css           # 样式（含主题变量、深色模式变量）
    ├── db.js               # 数据层 + 云同步接口
    ├── modules.js          # ★ 分区注册表（扩展改这里）
    └── app.js              # 主逻辑
```
