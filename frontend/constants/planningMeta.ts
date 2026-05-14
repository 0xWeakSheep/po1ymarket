import type { QueryPlanningMetaWire } from "@/types/recommendation";

/** 与 `docs/superpowers/api-contract-and-errors.md` 附录一致的可读文案（中文）。 */
const FALLBACK_REASON_LABEL: Record<string, string> = {
  planner_disabled: "未启用 Planner（或未配置密钥）",
  llm_empty_content: "Planner 返回空内容",
  llm_request_failed: "Planner 请求失败",
  payload_parse_failed: "Planner 输出解析或校验失败",
  queries_sanitized_insufficient: "清洗后的检索词不足，无法继续",
};

export function formatFallbackReasonLabel(reason: string | undefined): string | null {
  if (!reason) return null;
  return FALLBACK_REASON_LABEL[reason] ?? reason;
}

export function describeQuerySource(meta: QueryPlanningMetaWire): string {
  return meta.query_source === "llm" ? "LLM" : "规则";
}
