# moxt-kanban

本地优先的看板应用，支持 Board（看板）和 Table（表格）两种视图，数据持久化到 IndexedDB，并可通过 `window.moxt` API 与外部数据源同步。

## 技术栈

| 层级       | 技术                                                         |
| ---------- | ------------------------------------------------------------ |
| 框架       | [React 19](https://react.dev)                                |
| 构建       | [Rsbuild](https://rsbuild.rs)                                |
| 语言       | TypeScript                                                   |
| 样式       | [Tailwind CSS v4](https://tailwindcss.com)                   |
| 组件库     | [shadcn/ui](https://ui.shadcn.com)（Radix UI）              |
| 状态管理   | 自定义响应式 Store + useStore hook                           |
| 本地存储   | [Dexie](https://dexie.org)（IndexedDB）                      |
| 拖拽       | [@dnd-kit](https://dndkit.com)                               |
| 表格       | [@tanstack/react-table](https://tanstack.com/table)          |
| 图标       | [Lucide React](https://lucide.dev)                           |

## 功能

- **Board 视图**：拖拽卡片跨列移动，支持同列排序
- **Table 视图**：列表形式展示所有卡片，支持筛选与多字段排序
- **卡片管理**：标题、描述、优先级（low / medium / high / urgent）、标签、截止日期
- **列管理**：增删改列，支持拖拽排序
- **搜索与筛选**：按关键词、优先级、标签、列、截止日期状态过滤卡片
- **数据持久化**：IndexedDB（离线可用），支持软删除
- **外部数据同步**：检测到 `window.moxt` 时自动切换为 Moxt 后端；支持增量同步（`data:change` 事件）和全量同步；页面重新可见时自动触发同步

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
  components/
    ui/               # shadcn/ui 基础组件（Button、Input、Select、Dialog 等）
  lib/
    components/
      board/          # BoardView（拖拽看板视图）
      shared/         # BoardToolbar、ConfirmDialog、DatePicker、EmptyState、Modal
      table/          # TableView、TableToolbar（表格视图）
    db/               # 数据库适配器（Dexie / Moxt 双后端）
    hooks/            # React hooks（useBoardActions、useCardActions、useColumnActions 等）
    services/         # 业务逻辑（boardService、columnService、cardService、filterService、syncService）
    stores/           # 自定义响应式 Store（boards、cards、columns、filters、ui）
    types/            # TypeScript 类型定义
    utils/            # 工具函数（date、id、sort）
  App.tsx             # 应用根组件
  app.css             # 应用样式
  index.ts            # 入口文件
  index.css           # 全局 CSS（Tailwind 导入）
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
pnpm run typecheck     # TypeScript 类型检查
```

## 架构说明

### 双后端适配

项目采用 `DbAdapter` 抽象层，支持两种后端：

- **IndexedDB（Dexie）**：默认后端，支持离线使用，带有版本化 schema 迁移（v1→v3）
- **Moxt API**：当 `window.moxt` 存在时自动切换，通过 collection API 读写远程数据

应用启动时自动检测并选择后端，上层代码无需感知具体实现。

### 状态管理

使用自定义轻量级 pub/sub store 系统：

- `createStore<T>(initial)` 创建 store
- `useStore(store)` React hook 订阅 store 变化
- `get(store)` 在 React 组件外同步读取 store 值

### 同步机制

- **增量同步**：利用 `[boardId+updatedAt]` 复合索引查询自上次同步以来变更的记录
- **全量同步**：超过 5 分钟未同步时自动降级为全量同步
- **事件驱动**：监听 Moxt `data:change` 事件触发同步
- **可见性感知**：页面从隐藏变为可见时自动同步
- **并发控制**：多次同步请求会合并为单次执行
