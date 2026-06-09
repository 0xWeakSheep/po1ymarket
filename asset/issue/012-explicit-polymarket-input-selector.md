# 前端显式 Polymarket 输入模式

## 问题

当前前端把 `market id / market slug / event slug` 全部放在同一区域，虽然已去歧义，但交互仍偏重。

## 目标

提供显式 selector，让用户先选择输入类型，再填写对应字段。

## 最小范围

- 下拉或 tab：`market id / market slug / event slug / custom market`
- 表单只显示当前需要的输入项

## 验收标准

- 新用户更容易理解三类 Polymarket 标识的差异
- 表单复杂度下降
