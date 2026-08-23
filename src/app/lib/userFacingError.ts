const ERROR_RULES: Array<[RegExp, string]> = [
  [/maintenance|feature.+closed|operation.+closed/i, "現在この機能は利用できません。時間をおいて再度お試しください。"],
  [/insufficient|not enough|不足/i, "必要なポイントまたはアイテムが不足しています。"],
  [/guild.+full|member.+cap|満員/i, "このTRIBEは現在満員です。別のTRIBEをお試しください。"],
  [/pending|already applied|申請中/i, "加入申請はすでに送信済みです。承認をお待ちください。"],
  [/already.+claimed|claimed already|受取済/i, "この報酬はすでに受け取り済みです。"],
  [/network|fetch|timeout|failed to connect/i, "通信を確認して、もう一度お試しください。"],
];

export function userFacingErrorMessage(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value || "");
  const match = ERROR_RULES.find(([pattern]) => pattern.test(raw));
  if (match) return match[1];
  if (/[ぁ-んァ-ヶ一-龠]/.test(raw) && !/stack|postgres|supabase|rpc|sqlstate/i.test(raw)) return raw;
  return "処理を完了できませんでした。時間をおいて再度お試しください。";
}
