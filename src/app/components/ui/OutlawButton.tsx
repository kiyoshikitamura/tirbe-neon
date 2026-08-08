import React from "react";
import "./OutlawButton.css";
import { useGame } from "../../context/GameContext";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "neon";

interface OutlawButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export default function OutlawButton({
  variant = "secondary",
  fullWidth = false,
  isLoading = false,
  className = "",
  onClick,
  children,
  ...props
}: OutlawButtonProps) {
  const { playCyberSe } = useGame();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // デフォルトでクリック音を鳴らす（disabledでない場合）
    if (!props.disabled && !isLoading) {
      playCyberSe("click");
    }
    if (isLoading) return;
    if (onClick) onClick(e);
  };

  return (
    <button
      className={`outlaw-button variant-${variant} ${fullWidth ? "full-width" : ""} active-scale-effect ${className}`}
      onClick={handleClick}
      disabled={props.disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      <span className="outlaw-button-inner">
        {isLoading && <span className="spinner outlaw-button-spinner" aria-hidden="true" />}
        {children}
      </span>
    </button>
  );
}
