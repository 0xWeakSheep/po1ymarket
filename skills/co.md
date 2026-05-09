# Skills 协作说明

## Skills 是什么

在这个项目里，`skills` 可以理解成给 agent 的“任务说明书 + 工作模板”。

它的作用不是实现底层推荐接口，而是告诉 agent：

- 什么时候该调用我们的推荐接口
- 调用时要带什么上下文
- 拿到返回链接后，下一步怎么处理
- 哪些情况下要继续追问、补查或停止

一句话理解：

`backend/` 负责“把相关链接找出来”，`skills/` 负责“让 agent 正确地使用这些链接和接口”。

## 新人先需要知道的最小上下文

开始写 skill 之前，至少要知道下面这些：

1. 这个项目当前主产品是“输入盘口，返回适合分析的推荐链接”。
2. 推荐接口当前主入口是 `POST /api/v1/recommendations`。
3. 接口支持两种输入方式：
   - `market_id`
   - `market_question`
4. 当前返回结果核心是 `recommended_sources`，也就是推荐链接列表。
5. skill 的目标不是替代后端排序，而是让 agent 更好地调用、消费和继续利用这些结果。

建议先读这些文件：

1. `/README.md`
2. `/fastcontribute.md`
3. `/backend/src/recommendations/recommendations.service.ts`
4. `/backend/src/recommendations/query-builder.ts`
5. `/frontend/components/dashboard/QueryConsole.tsx`

如果这 5 个文件还没看，不要直接开始写 skill。

## 新人应该先做什么类型的 skill

不要一上来做“大而全”的 skill。先从小而明确的场景开始。
可以使用这个skills去进行创建skills：https://skills.sh/anthropics/skills/skill-creator

推荐从这几类开始：

1. `market_id -> 自动拉推荐链接 -> 输出简短分析`
2. `market_question -> 查询推荐链接 -> 做来源分类`
3. `给定推荐链接 -> 判断哪些值得继续打开`
4. `时间敏感盘口 -> 优先使用更新鲜来源`

这些都比“做一个万能预测 agent”更适合作为第一批 skill。

## 怎么快速搭建一个 skill

推荐流程：

1. 先定义一个非常具体的使用场景。
2. 写清楚 agent 的输入、调用动作、输出格式。
3. 只保留必要规则，不要塞太多背景知识。
4. 先做一个最小可用版本，再迭代。

写 skill 时，优先使用下面两个思路：

### 1. 用 `skill-creator` 的思路来建 skill

如果你在 Codex / Claude 类环境里协作，优先参考 `skill-creator` 这个能力来生成 skill 骨架。

它适合用来做：

- skill 的基础目录
- `SKILL.md` 的最小结构
- skill 的说明文案初始化

新人可以直接按这个模板理解：

- `name`：这个 skill 叫什么
- `description`：什么时候应该触发它
- `workflow`：触发后 agent 按什么步骤做
- `examples`：给 1 到 2 个具体例子

### 2. 用“小 skill”而不是“大 skill”

一个 skill 最好只解决一类问题。

比如：

- `fetch-market-sources`
- `rank-market-sources`
- `summarize-market-evidence`

比起一个 `all-in-one-market-agent`，前者更容易协作、调试和复用。

## 推荐的 skill 目录结构

所有 skills 放在 `skills/` 下面，每个 skill 一个独立目录。

推荐结构：

```text
skills/
├── co.md
├── fetch-market-sources/
│   ├── SKILL.md
│   ├── references/
│   │   └── api.md
│   └── assets/
├── summarize-market-evidence/
│   ├── SKILL.md
│   └── references/
└── ...
```

约定如下：

1. 每个 skill 必须有 `SKILL.md`
2. 一个 skill 只负责一个清晰任务
3. 细节文档放 `references/`
4. 模板、示例输入输出等可放 `assets/`
5. 不要给每个 skill 再额外创建 `README.md`

## `SKILL.md` 建议最小模板

```md
---
name: fetch-market-sources
description: Use when the agent needs to fetch recommended evidence links for a market by market_id or market_question.
---

# Purpose

Use this skill when the task requires retrieving candidate evidence links for a market.

# Inputs

- market_id or market_question

# Workflow

1. If `market_id` is available, call the recommendation API with it.
2. Otherwise use `market_question`.
3. Read `recommended_sources`.
4. Return a short structured summary.

# Output

- Top links
- Why they matter
- What to do next

# Notes

- Prefer fresh sources for time-sensitive markets.
- If results are weak, say so explicitly.
```

新人先按这个模板写，不要一开始做复杂抽象。

## 写 skill 时的协作规范

### 1. 一个 skill 只做一件事

不要把“查链接 + 打分 + 总结 + 追问 + 建模”全塞进一个 skill。

### 2. 名字必须直接表达用途

用这种名字：

- `fetch-market-sources`
- `summarize-market-evidence`
- `triage-market-links`

不要用这种名字：

- `market-helper`
- `smart-skill`
- `agent-v2`

### 3. description 写触发条件，不写空话

好例子：

- `Use when the agent needs recommended source links for a prediction market.`

坏例子：

- `A powerful skill for market intelligence.`

### 4. 先写 workflow，再补细节

最重要的是让 agent 知道：

- 何时触发
- 调什么接口
- 先做什么
- 后做什么
- 输出什么

### 5. 不要在 skill 里重复后端实现细节

skill 不负责重写后端逻辑，也不要在里面复制大量接口实现说明。

只保留 agent 真正需要的调用规则和判断规则。

### 6. 明确失败路径

每个 skill 最好都写清楚：

- 没有 `market_id` 时怎么办
- 返回结果太少时怎么办
- 来源很旧时怎么办
- 信息冲突时怎么办

### 7. 输出格式尽量稳定

优先让 skill 输出固定结构，方便后续 agent 复用。

例如：

1. Top sources
2. Why relevant
3. Risks / uncertainty
4. Next action

## 新人提交 skill 前的自检清单

提交前至少检查这几项：

1. 这个 skill 是否只做一件事
2. `name` 是否足够直白
3. `description` 是否说明了触发时机
4. `workflow` 是否能让别人直接照着执行
5. 是否写了失败路径
6. 是否避免了无关背景知识
7. 是否能举出 1 个真实使用例子

如果这 7 项答不清楚，就先不要提 PR。

## 推荐的协作方式

建议按下面方式协作：

1. 每个人先认领一个明确场景
2. 每个场景先做一个最小 skill
3. 先跑通，再讨论是否合并或拆分
4. review 时重点看触发条件、workflow、输出稳定性

不建议一开始就多人共写同一个大 skill。

## 第一批适合新人认领的 skill 题目

可以直接从这里挑：

1. `fetch-market-sources`
   作用：输入 `market_id` 或 `market_question`，返回推荐链接和简短说明

2. `triage-market-links`
   作用：把推荐链接分成“值得读 / 可备查 / 可以忽略”

3. `summarize-market-evidence`
   作用：对拿到的几个链接做简短证据总结

4. `time-sensitive-market-check`
   作用：对“今天/本周/短期”类盘口优先检查新鲜来源

5. `insufficient-evidence-escalation`
   作用：当推荐结果太少或质量太差时，明确告诉 agent 应该继续补查

## 给新人的一句要求

先把一个 skill 做得短、小、清楚、可执行，再考虑把它做强。
