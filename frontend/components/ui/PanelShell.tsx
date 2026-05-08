import type { HTMLAttributes, ReactNode } from "react";

type PanelShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PanelShell({ className, children, ...props }: PanelShellProps) {
  return (
    <section
      className={joinClasses(
        "relative overflow-hidden rounded-[30px] border border-white/10",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </section>
  );
}
