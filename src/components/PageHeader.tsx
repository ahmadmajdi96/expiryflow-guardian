import { ReactNode } from "react";

interface Props { title: string; description?: string; actions?: ReactNode; badge?: ReactNode }
const PageHeader = ({ title, description, actions, badge }: Props) => (
  <div className="flex items-start justify-between mb-6 gap-4 animate-slide-up">
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {badge}
      </div>
      {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
  </div>
);
export default PageHeader;