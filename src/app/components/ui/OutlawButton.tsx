import React from "react";
import "./OutlawButton.css";
import { useGame } from "../../context/GameContext";

type ButtonVariant = "primary" | "secondary" | "danger" | "neon";

interface OutlawButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export default function OutlawButton({
  variant = "secondary",
  fullWidth = false,
  className = "",
  onClick,
  children,
  ...props
}: OutlawButtonProps) {
  const { playCyberSe } = useGame();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // デフォルトでクリック音を鳴らす（disabledでない場合）
    if (!props.disabled) {
      playCyberSe("click");
    }
    if (onClick) onClick(e);
  };

  return (
    <button
      className={`outlaw-button variant-${variant} ${fullWidth ? "full-width" : ""} active-scale-effect ${className}`}
      onClick={handleClick}
      {...props}
    >
      <span className="outlaw-button-inner">{children}</span>
    </button>
  );
}
