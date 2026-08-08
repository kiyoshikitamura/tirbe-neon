import React from "react";
import "./PageHeader.css";

interface PageHeaderProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export default function PageHeader({ title, eyebrow, description, action }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header-copy">
        {eyebrow && <div className="ui-page-header-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="ui-page-header-action">{action}</div>}
    </header>
  );
}
