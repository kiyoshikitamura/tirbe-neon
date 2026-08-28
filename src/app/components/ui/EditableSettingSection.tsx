"use client";

import React from "react";
import OutlawButton from "./OutlawButton";
import OutlawCard from "./OutlawCard";
import "./EditableSettingSection.css";

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="choice-group" disabled={disabled}>
      <legend>{label}</legend>
      <div className="choice-group-options" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? "is-selected" : ""}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function EditableSettingSection({
  title,
  summary,
  helper,
  editing,
  pending = false,
  canEdit = true,
  onEdit,
  children,
}: {
  title: string;
  summary: React.ReactNode;
  helper?: React.ReactNode;
  editing: boolean;
  pending?: boolean;
  canEdit?: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <OutlawCard className={`editable-setting-section ${pending ? "is-pending" : ""}`} aria-busy={pending}>
      <div className="editable-setting-heading">
        <div>
          <strong>{title}</strong>
          {helper && <small>{helper}</small>}
        </div>
        {!editing && canEdit && (
          <OutlawButton variant="secondary" disabled={pending} onClick={onEdit}>
            編集
          </OutlawButton>
        )}
      </div>
      {editing ? <div className="editable-setting-editor">{children}</div> : <div className="editable-setting-summary">{summary}</div>}
    </OutlawCard>
  );
}
