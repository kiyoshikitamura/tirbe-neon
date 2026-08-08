import React from "react";
import "./ListRow.css";

interface ListRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  trailing?: React.ReactNode;
  interactive?: boolean;
}

export default function ListRow({
  leading,
  title,
  description,
  trailing,
  interactive = false,
  className = "",
  ...props
}: ListRowProps) {
  return (
    <div className={`ui-list-row ${interactive ? "ui-list-row-interactive" : ""} ${className}`} {...props}>
      {leading && <div className="ui-list-row-leading">{leading}</div>}
      <div className="ui-list-row-copy">
        <div className="ui-list-row-title">{title}</div>
        {description && <div className="ui-list-row-description">{description}</div>}
      </div>
      {trailing && <div className="ui-list-row-trailing">{trailing}</div>}
    </div>
  );
}
