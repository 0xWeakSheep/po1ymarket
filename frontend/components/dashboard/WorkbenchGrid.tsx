import { FadeUpPanel } from "@/components/ui/FadeUpPanel";
import { QueryConsole } from "@/components/dashboard/QueryConsole";

export function WorkbenchGrid() {
  return (
    <div className="flex w-full" style={{ perspective: "1000px" }}>
      <FadeUpPanel className="min-h-0 w-full" delay={0.06}>
        <div
          id="console"
          className="h-full min-h-[min(72vh,820px)] w-full"
          aria-label="查询工作台 — 主工作区"
        >
          <QueryConsole />
        </div>
      </FadeUpPanel>
    </div>
  );
}
