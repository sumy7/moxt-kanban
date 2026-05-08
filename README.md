# moxt-kanban

本地优先的看板应用，支持 Board（看板）和 Table（表格）两种视图，数据持久化到 IndexedDB，并可通过 `window.moxt` API 与外部数据源同步。

## 技术栈

| 层级     | 技术                                                                            |
| -------- | ------------------------------------------------------------------------------- |
| 框架     | [Svelte 5](https://svelte.dev)                                                  |
| 构建     | [Rsbuild](https://rsbuild.rs)                                                   |
| 语言     | TypeScript                                                                      |
| 样式     | Tailwind CSS v4                                                                 |
| UI 组件  | [shadcn-svelte](https://www.shadcn-svelte.com) / [Bits UI](https://bits-ui.com) |
| 本地存储 | [Dexie](https://dexie.org)（IndexedDB）                                         |
| 图标     | Lucide / Phosphor                                                               |

## 功能

- **Board 视图**：拖拽卡片跨列移动，支持同列排序
- **Table 视图**：列表形式展示所有卡片，支持筛选与排序
- **卡片管理**：标题、描述、优先级（low / medium / high / urgent）、标签、截止日期
- **列管理**：增删改列，支持拖拽排序
- **搜索与筛选**：按关键词、优先级、标签过滤卡片
- **数据持久化**：IndexedDB（离线可用）
- **外部数据同步**：检测到 `window.moxt` 时切换为 Moxt 数据源，监听 `data:change` 事件增量同步；页面重新可见时也会触发同步

## 数据模型

```
Board    id · name · createdAt · updatedAt · deletedAt
Column   id · boardId · title · order · createdAt · updatedAt · deletedAt
Card     id · boardId · columnId · title · description · order
         priority · tags · dueDate · createdAt · updatedAt · deletedAt
```

## 目录结构

```
src/
  lib/
    components/     # UI 组件（board/、table/、shared/、ui/）
    db/             # 数据库适配器（Dexie / Moxt 双适配）
    services/       # 业务逻辑（boardService、columnService、cardService、filterService、syncService）
    stores/         # Svelte stores（boards、columns、cards、filters、ui）
    types/          # TypeScript 类型定义
    utils/          # 工具函数
  App.svelte        # 应用入口
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器（自动打开浏览器）
pnpm run dev

# 生产构建
pnpm run build

# 预览生产构建
pnpm run preview
```

## 其他命令

```bash
pnpm run lint          # ESLint 检查
pnpm run format        # Prettier 格式化
pnpm run svelte-check  # TypeScript / Svelte 类型检查
```
