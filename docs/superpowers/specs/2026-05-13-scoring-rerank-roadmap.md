# Scoring / Rerank 路线图（下一版）

> 日期：2026-05-13  
> 范围：`backend/src/recommendations/scoring.service.ts`、`clients/openai.client.ts`、`prompts/agent-prompt/candidate-scoring.system.md` 及检索编排层  
> 推进原则：**低成本高收益先行 → 中期架构升级**（可解释、可调试、可扩展的 ranking）。

## 1. 现状摘要（基线）

- **Relevance**：市场与候选文本 token 交集 / 市场词数，再按 `sourceType` 加减分；title 与 snippet 等价拼接。  
- **Freshness**：无 `publishedAt` 时按 `official` / 其它固定分；有日期时用 `exp(-ageDays / inferUrgency)`，`inferUrgency` 主要依赖少量英文关键词。  
- **Stale**：相关度过低或过旧（`age > inferUrgency * 3`）；`stale` 时总分 **`total *= 0.4`**，与 freshness 存在双重惩罚。  
- **LLM**：可选逐条 `scoreCandidate`（JSON），覆盖 relevance / freshness / `ai_score`；与启发式共用同一套加权总分。  
- **来源类型**：当前仅 `news` | `social` | `official`（检索侧赋值）。

下文按优先级组织；实现时可拆成多个小 PR，每步保持 API 契约稳定。

---

## 2. P0：低成本高收益（建议最先落地）

### P0-1 启发式 relevance：分字段加权

**当前问题**：`title + snippet` 扁平拼接；长 query 稀释；title 命中价值未体现。

**方向**：拆分子信号后线性组合，例如：

```txt
score =
  titleExact      * 0.5 +
  titlePartial    * 0.25 +
  snippetMatch    * 0.15 +
  entityMatch     * 0.1   // 初版可置 0，见 P2
```

- **titleExact**：整词或短语级强匹配（实现可从「市场核心 token 全落在 title」等简单规则起步）。  
- **titlePartial / snippetMatch**：保留 overlap 思想，但分母/分子 scoped 到对应字段。  
- 与现有 `sourceType` 加减分可保留或稍后并入 authority（见 P1）。

### P0-2 Query term importance（与 P0-1 强绑定）

**当前问题**：所有 token 等权；功能词噪声大。

**方向**：

- stopwords 降权（硬编码列表即可起步）；  
- 数字、大写 ticker、明显实体形态（如连续大写、已知后缀）升权；  
- 抽象为 `tokenWeight(token)`，再计算加权 overlap 或加权命中条数。

### P0-3 并发 rerank / LLM 调用

**当前问题**：`for` 内串行 `await`，延迟随候选数线性爆炸。

**方向**：

- 对 LLM 调用使用 **有上限的并发**（如 `p-limit` 或手写 semaphore），避免打满供应商限流；  
- 启发式阶段若仍逐条，也可并行（无副作用时）。

### P0-4 Stale 机制改造（高优先级）

**当前问题**：freshness 已衰减旧闻，`stale` 再 **`total *= 0.4`**，高相关旧内容排序被「双杀」；`stale` 同时承载「过旧」与「不相关」。

**方向**：

1. **取消对总分的乘法暴击**，改为例如：若判定 stale（或仅「过旧」类 stale），则  
   `freshnessScore = Math.min(freshnessScore, cap)`（cap 如 0.2），再按原加权求和；或拆成独立 `isOld` / `isLowRelevance` 标志，仅对 freshness 或 relevance 一侧施加上限。  
2. **语义拆分**：`staleReasons: string[]` 或 `isOld` + `isLowRelevance`，便于日志、前端展示与调参。  
3. 与 LLM prompt 中对「旧但高质」的表述对齐，避免模型与规则打架。

**验收**：固定 fixture（高相关旧闻、低相关新帖、official 无日期）下排序与原因字段符合预期。

---

## 3. P1：结构与成本

### P1-1 `authorityScore` 独立维度

**当前问题**：authority 混在 relevance 的 `sourceType` 加减分里，粒度粗、难扩展。

**方向**：

- 新增 **`authorityScore`**（0–1），来源可渐进：域名 allowlist / 已知高信域名表、`sourceType` 先验、后续再接 publisher 库。  
- 总分示例（需与产品对齐后定稿）：  
  `relevance * 0.40 + freshness * 0.25 + authority * 0.20 + quality * 0.15`  
  其中 **quality** 对应现 `aiScore` / 下节「质量分」语义。

### P1-2 Batch rerank（LLM）

**当前问题**：每条候选一次 Chat，贵、慢、绝对分不稳定。

**方向**：

- 单请求输入 **多条候选**（带 id），让模型做 **相对排序**或输出「有序 id 列表 + 简短 per-id 理由」；  
- 仍需 **截断 + 分批**（例如每批 8–15 条），避免上下文爆炸；  
- 与 P0-3 并发配合：先 batch 内排序，跨 batch 可合并或二次 merge sort。

### P1-3 Freshness：`source durability`（衰减倍率）

**当前问题**：所有 `sourceType` 共用同一 decay 形状。

**方向**：引入 **durability 因子**（示例，可按数据再调）：

| sourceType | durability（示例） |
| ---------- | ------------------- |
| official   | 1.0                 |
| news       | 0.6                 |
| social     | 0.3                 |

有效年龄：`effectiveAge = ageDays / (urgencyWindow * durability)`，再代入现有指数衰减直觉。  
若未来增加 `research` 等类型，在表中补一行即可。

### P1-4 `inferUrgency` 扩展

**当前问题**：仅靠 `today / this week / this month` 等，覆盖窄。

**方向**：

- 增补 **模式词**：price / election / earnings / launch / release / acquisition / breaking 等（维护小词典 + 单测）；  
- **远期**：可选 LLM 或轻量分类器输出 `urgency` 连续值与 `reason`（缓存 per market），与 query planner 共享元数据亦可。

---

## 4. P2：语义与召回

### P2-1 Entity extraction

对 market（及必要时 description）抽 **公司 / 人名 / ticker / 产品 / 事件** 等；候选 title/snippet 命中实体则贡献 **entityMatch** 或独立 `entityBoost`。  
实现路径：规则 + 词典 → 后续再接 NER API 或本地模型。

### P2-2 重构 LLM 侧「质量分」语义

**当前问题**：`ai_score` 与 relevance 易重叠，等效「相关算两次」。

**方向**：

- Prompt 与类型命名上偏向 **qualityScore**：证据质量、可信度、信息密度、可复核性、对裁决推理的帮助；**明确禁止**用其替代「是否切题」（切题归 relevance）。  
- 对外 JSON 可暂保留 `ai_score` 键以少改契约，文档与 prompt 内统一称 quality。

### P2-3 Semantic retrieval（检索侧）

关键词/BM25 与 **embedding 混合召回**（keyword recall + semantic recall），减轻同义词与改写损失。  
与 scoring 解耦：先扩大高质量候选进入 rerank，再谈精排。

---

## 5. P3：生产化与学习排序

- **Learning-to-rank**：用曝光、点击、停留、收藏、引用等构造特征与弱监督，逐步替代纯 magic number。  
- **特征平台化**：relevance / freshness / authority / quality / interaction 分层入库，便于离线评估与 A/B。

---

## 6. 推荐实施顺序（汇总）

| 阶段 | 项 | 说明 |
| --- | --- | --- |
| P0 | 分字段加权 relevance | 含 title/snippet 拆分 |
| P0 | 并发（限流）LLM / 打分路径 | 控延迟与 429 |
| P0 | stale 改造 + 原因拆分 | 去双杀、可解释 |
| P1 | authorityScore + 新加权 | 与产品确认权重 |
| P1 | batch rerank | 降本、提序稳定性 |
| P1 | term weighting + durability + inferUrgency 扩展 | 与 P0 可交错 |
| P2 | entity + quality 语义 + 向量召回 | 依赖略增 |
| P3 | LTR / 在线反馈 | 中长期 |

---

## 7. 非目标（本路线图文档不承诺交付期）

- 不规定具体 PR 数量与排期；落地时另起 implementation plan。  
- 不强制一次改对外 API；新增字段可走 optional 或内部 feature flag。

---

## 8. 与现有文档关系

- 检索缓存：[`2026-05-11-retrieval-cache-design.md`](./2026-05-11-retrieval-cache-design.md)（召回层）。  
- 本文：**精排 / rerank / 启发式演进** 的中期方向，可与缓存设计并行演进。
- **当前实现（事实基线）**：`backend/src/recommendations/query/README.md` §6.1、`backend/README.md`（Scoring & rerank 摘要）。
