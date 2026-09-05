# Agent Note：桌面品牌展示产品名，并补完俄语本地化

Status: implemented

## 问题

桌面 Web 客户端在侧栏以 `DSH Local Build` 加构建版本徽标（`version-commit[-dirty]`）作为品牌标识，且覆盖所有随附语言。该标签描述的是构建方式，而非用户打开的产品；徽标则把构建元数据暴露在首要品牌行。

俄语化也只落地了一半：每个客户端包的 `locales.ts` 都带着 `ru` 词典，但三十个包仍注册 `{ zh, en }`——`ui-permission-presets` 更是完全缺少俄语弹窗文案——浏览器偏好俄语时这些命名空间静默回退英语。locale 测试也仍固定在双语言世界。此外，分支带着过期的 `pnpm-lock.yaml`，六个包名与目录名不一致的包没有源态别名，且整个仓库的 `tsc -b` 两个面带着先行提交遗留的错误，`pnpm run build` 从未在这棵树上产出过新鲜客户端构建。

## 决策

**侧栏品牌行只渲染产品名。** common 命名空间的键 `brand.localBuild` 更名为 `brand.product`，三份随附词典（zh、en、ru）均回答 `DeepSeek Harness`。构建配置的 `DSH_CLIENT_TITLE` 覆盖值在 `AppFrame` 与 `DocumentTitle` 中继续优先于词典回退，official 构建的 DeepSeek 字标路径不变。`SidebarRoot` 移除 `localBuildVersion()`、版本徽标 span 及其 CSS；`DSH_CLIENT_VERSION`、`DSH_CLIENT_COMMIT_HASH`、`DSH_CLIENT_GIT_DIRTY` 仍保留在客户端构建记录中供诊断，但没有任何客户端界面把它们投射进 UI。

**每个客户端包都注册 `ru` 词典。** 三十处 `{ zh, en }` 注册加入 `ru`；`ui-permission-presets` 新增 `accessRu` 及对应的 `ACCESS_NS` 弹窗注册。locale runtime 测试固定随附列表 `['zh', 'en', 'ru']`，语言行包含 Русский。名为 `localBuild` 的键承载产品名会误导后续词典编辑者，因此重命名覆盖三份词典、两处渲染点及其测试。

**客户端 bundle 预设改为向上查找到 `pnpm-workspace.yaml` 来定位仓库根**，不再用固定相对 URL：本分支把该助手移到 `packages/client/` 下，而配置加载器的打包又再次移动 `import.meta.url`，`workspaceManifest` 的 `packages/*/*/package.json` glob 基点因此失效，client 面构建在产出前即失败。

**源态别名与 lockfile 属于本次修复。** `pnpm-lock.yaml` 依据分支清单重新生成；`tsconfig.base.json` 为六个名字与目录不一致的包补上手写别名（`dsh-client-runtime`、`dsh-client-ui-schedule`、`dsh-host-apiproxy`、`dsh-sdk-jsonrpc-demo`、`dsh-util-time`、`dsh-util-values`），使 `gen-tsconfig-paths --check` 成立、vitest 经生成区解析 `@deepseek-ai/dsh-deque`。

**重建形态。** 全仓库 `tsc -b` 两个面仍有先行提交拥有的既有错误（host 面集中于 `host/apiproxy` 与 `core/tools`，client 面在 `client/runtime`），因此本次按包重建客户端 bundle——先单包 `tsc -p` 产出，再跑该包的 tsdown client face——让每个包只对已安装依赖类型编译自身源码，不拖入损坏的面。`ui-renderer` 保留已安装 bundle：其源码相对已构建 `ui-slots` 类型带有既有漂移，而品牌标题经 `AppFrame` 的 `productTitle` prop 抵达浏览器，重建它徒增风险而无可见收益。

## 验证

`client-locale`、`ui-sidebar`、`ui-layout`、`ui-renderer` 的聚焦 Vitest 套件全部通过（251 个测试），包括三语言列表与单 span 品牌行快照。各包重建报告各自的 `tsc` 错误数；运行时冒烟即桌面 exe 以俄语 UI 与 `DeepSeek Harness` 品牌启动。`gen-tsconfig-paths --check` 报告别名表为最新。

## 备选方案

**保留键名只改值。** 否决：`brand.localBuild: 'DeepSeek Harness'` 会在每一处未来编辑点呈现为自相矛盾，省下的一行改动得不偿失。

**仅非 official profile 渲染徽标。** 否决：徽标信息（精确版本与提交）属于构建记录与支持流程，不属于品牌行从会话导航借用的空间。

**先修全仓库 `tsc -b` 两个面。** 本变更内否决：错误早于本变更、集中在此次无客户端可见角色的包里，修复本身是值得独立评审的系列，而非品牌变更的搭车项。
