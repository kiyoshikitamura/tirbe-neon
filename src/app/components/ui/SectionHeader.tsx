import React from "react";
import "./SectionHeader.css";

interface SectionHeaderProps {
  title: string;
  subTitle?: string;
  className?: string;
}

export default function SectionHeader({ title, subTitle, className = "" }: SectionHeaderProps) {
  return (
    <div className={`outlaw-section-header ${className}`}>
      <div className="section-header-accent" />
      <div className="section-header-texts">
        <h2 className="section-header-title">{title}</h2>
        {subTitle && <span className="section-header-subtitle">{subTitle}</span>}
      </div>
    </div>
  );
}
