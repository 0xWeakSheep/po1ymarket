# Git 协作规范

## 目标

本项目使用最简单的一套 Git 协作方式：

`基于 main 创建个人分支 -> 在个人分支开发 -> 让 AI 帮忙 commit -> 提 PR -> review -> 合并回 main`

这套流程的目标只有 3 个：

1. 每个人都在自己的分支上工作，避免互相覆盖
2. 所有改动都通过 PR 进入 `main`
3. commit 和说明尽量统一交给 AI 处理，减少风格混乱

## 基本规则

1. 所有人都以 `main` 为基线创建自己的分支
2. 不直接往 `main` 提交代码
3. 所有改动都在自己的分支完成
4. 通过 PR 合并，不口头合并
5. 不要强推
6. 不要改别人正在做的分支
7. commit 尽量让 AI 来做

## 一句话版本

每个人都从最新的 `main` 拉自己的分支，在自己的分支上改，改完让 AI 帮你整理并提交 commit，然后发 PR 合回 `main`。

## 分支规范

每个人开始开发前，都先切到最新的 `main`，然后从 `main` 拉出自己的功能分支。

推荐命名：

- `feat/xxx`
- `fix/xxx`
- `chore/xxx`

例如：

- `feat/add-market-skill`
- `fix/query-builder-edge-case`
- `chore/update-skill-template`

分支名尽量直接表达这次要做什么，不要用：

- `test`
- `new`
- `my-branch`
- `v2`

## 标准流程

### 0. 开始前先看 `main` 是不是最新

```bash
git checkout main
git pull origin main
```

先做这一步，是为了保证你拉分支时基线一致。

不要从别人分支拉自己的分支，也不要从一个过时的本地分支继续套娃开分支。

### 1. 先更新主分支

```bash
git checkout main
git pull origin main
```

这里默认主分支就是 `main`。本项目协作时，统一以 `main` 为准。

### 2. 基于 `main` 新建自己的分支

```bash
git checkout -b feat/your-change-name
```

这一步的意思是：

- 你的分支必须从 `main` 出来
- 不要从 `feat/a` 再拉 `feat/b`
- 不要直接在 `main` 上改完再想办法拆出去

正确思路是：

`main` 永远保持干净，具体工作都放在自己的分支里。

### 3. 在自己分支开发

开发过程中：

1. 只做这一个分支对应的事情
2. 不要顺手夹带不相关改动
3. 一个 PR 最好只解决一个问题

比如你这个分支是写 `skills`，就不要顺手把前端样式、后端接口、别人的文档一起改掉。

### 4. commit 尽量让 AI 来做

这里的建议是：

`你负责改代码，AI 负责整理 commit。`

这样做的好处：

1. commit message 风格更统一
2. AI 能顺手帮你检查改动范围是不是太杂
3. 新人不用一上来就纠结怎么写 commit message
4. 可以减少“做了很多但提交说明很乱”的情况

推荐做法：

1. 你先把改动做完
2. 自己先确认这次改动是不是只围绕一个主题
3. 让 AI 帮你看 diff、概括改动
4. 让 AI 帮你执行 commit

如果要手动 commit，也可以，但默认建议交给 AI。

### 5. 如果手动 commit，最小要求如下

```bash
git add .
git commit -m "feat: add initial market source skill"
```

commit message 不要求特别复杂，但至少要让人看得出你做了什么。

推荐格式：

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`

但在本项目里，默认更推荐让 AI 根据实际 diff 来生成 commit message。

## 推送规范

第一次推送自己的分支：

```bash
git push -u origin feat/your-change-name
```

后续继续推送：

```bash
git push
```

## PR 规范

当你已经在自己的分支完成一轮改动，并且 commit 好之后，再提 PR。

代码准备好后，发起 PR。

PR 里至少写清楚：

1. 你做了什么
2. 为什么要做
3. 主要改了哪些文件
4. 有没有需要别人特别注意的地方

如果改动可测试，最好补一句你怎么验证的。

PR 可以继续让 AI 帮你整理说明，尤其适合新人。

例如：

- 新增了一个 `fetch-market-sources` skill
- 增加了 skill 触发条件和输出格式
- 补充了失败路径说明
- 本地已检查文档结构和字段格式

## Review 规范

review 时重点看这几件事：

1. 这次改动是不是只做一件事情
2. 文件结构是否符合约定
3. 命名是否清楚
4. 这次分支是不是明确基于 `main` 开出来的
5. 改动是否会影响别人正在做的内容
6. 文档或 skill 是否真的可执行，而不是只有描述
7. commit 是否清楚表达了改动内容

## 明确禁止

下面这些默认不要做：

1. 不要直接提交到 `main`
2. 不要直接 push 到 `main`
3. 不要不经过 PR 直接合并
4. 不要 `git push --force`
5. 不要改写已经共享给别人的提交历史
6. 不要从别人分支继续拉自己的分支
7. 不要把不相关的大改动塞进同一个 PR

如果确实遇到必须处理的特殊情况，先沟通，再操作。

## 如果主分支更新了

你的分支开发期间，如果 `main` 有更新，优先用普通方式同步，不要强推覆盖。

最简单做法：

```bash
git checkout main
git pull origin main
git checkout feat/your-change-name
git merge main
```

如果有冲突，自己处理完再继续提交。

如果你处理完冲突，最好再让 AI 帮你检查一下当前 diff 是否还干净，再进行下一次 commit。

## 推荐给新人的完整操作顺序

如果你完全不熟 Git，就按这个顺序来：

1. 切到 `main`

```bash
git checkout main
git pull origin main
```

2. 从 `main` 创建自己的分支

```bash
git checkout -b feat/your-task-name
```

3. 在这个分支里完成改动

4. 改完后让 AI 帮你：
   - 看这次改动是否聚焦
   - 总结改动内容
   - 写 commit message
   - 执行 commit

5. 推送自己的分支

```bash
git push -u origin feat/your-task-name
```

6. 发起 PR 到 `main`

7. 根据 review 继续修改，继续让 AI 帮你 commit

8. PR 通过后再合并回 `main`

## 为什么 commit 推荐交给 AI

因为新人最容易在这几个地方出问题：

1. commit message 写得过于随意
2. 一次 commit 混入很多不相关改动
3. 不知道当前应该提交哪些文件
4. 改完后没有先检查 diff

让 AI 来辅助 commit，本质上是在做两件事：

1. 帮你把这次改动整理清楚
2. 帮团队保持提交风格统一

但要注意一件事：

`AI 帮你 commit，不等于你不用自己确认改动内容。`

提交前你自己仍然要确认：

- 这次改动是不是你想提交的
- 有没有混入不相关文件
- 有没有漏掉应该提交的内容

## 一个简单原则

任何时候，如果你不确定怎么做，就遵守下面这条：

`从 main 拉自己的分支，在自己的分支改，commit 尽量让 AI 帮你做，最后用 PR 合回 main，不要强推。`
