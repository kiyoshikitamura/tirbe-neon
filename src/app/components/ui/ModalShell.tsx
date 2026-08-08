import React from "react";
import "./ModalShell.css";

interface ModalShellProps {
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
  className?: string;
  labelledBy?: string;
}

export default function ModalShell({ children, title, footer, className = "", labelledBy }: ModalShellProps) {
  const generatedId = React.useId();
  const titleId = labelledBy || generatedId;

  return (
    <section className={`modal-shell ${className}`} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      {title && <header className="modal-shell-header"><span className="modal-shell-accent" /><h2 id={titleId}>{title}</h2></header>}
      <div className="modal-shell-content custom-scrollbar">{children}</div>
      {footer && <footer className="modal-shell-footer">{footer}</footer>}
    </section>
  );
}
