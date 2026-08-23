import React from "react";
import "./RewardReceipt.css";

export interface RewardReceiptItem {
  id?: string;
  name: string;
  quantity: number;
}

interface RewardReceiptProps {
  items: RewardReceiptItem[];
  delivery?: "PRESENT" | "INVENTORY";
  note?: string;
}

export default function RewardReceipt({ items, delivery = "INVENTORY", note }: RewardReceiptProps) {
  return (
    <div className="reward-receipt" data-delivery={delivery}>
      <div className="reward-receipt-list" aria-label="獲得報酬">
        {items.map((item, index) => (
          <div className="reward-receipt-item" key={`${item.id || item.name}-${index}`}>
            <span className="reward-receipt-mark" aria-hidden="true">◆</span>
            <span className="reward-receipt-name">{item.name}</span>
            <strong className="reward-receipt-quantity">× {Number(item.quantity).toLocaleString()}</strong>
          </div>
        ))}
      </div>
      <p className="reward-receipt-note">
        {note || (delivery === "PRESENT" ? "報酬はプレゼントへ送られました。" : "報酬を受け取りました。")}
      </p>
    </div>
  );
}
