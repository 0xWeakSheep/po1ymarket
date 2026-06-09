import { QueryConsole } from "@/components/dashboard/QueryConsole";

export function WorkbenchGrid() {
  return (
    <div className="flex w-full">
      <div
        id="console"
        className="h-full w-full"
        aria-label="查询工作台 — 主工作区"
      >
        <QueryConsole />
      </div>
    </div>
  );
}
