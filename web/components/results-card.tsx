import type { ReactNode } from "react";

type ResultsCardProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export default function ResultsCard({ children, subtitle, title }: ResultsCardProps) {
  return (
    <section className="card">
      <div className="stack">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}