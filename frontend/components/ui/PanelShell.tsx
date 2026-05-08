import type { HTMLAttributes, ReactNode } from "react";

type PanelShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  energyBorder?: boolean;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PanelShell({ className, children, energyBorder, ...props }: PanelShellProps) {
  return (
    <section
      className={joinClasses(
        "group relative overflow-hidden rounded-[30px] border border-white/10",
        energyBorder ? "energy-border" : undefined,
        className,
      )}
      {...props}
    >
      {energyBorder && (
        <>
          <div className="energy-core" aria-hidden="true" />
          <div className="energy-mask" aria-hidden="true" />
          <span className="corner corner-tl" aria-hidden="true" />
          <span className="corner corner-tr" aria-hidden="true" />
          <span className="corner corner-bl" aria-hidden="true" />
          <span className="corner corner-br" aria-hidden="true" />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
