import { GVG_DAILY_SESSIONS } from "./game_constants";

export function getGvgPhase(date: Date): "DAILY" | "FINALS" | "OFF" {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const daysUntilLastSunday = (7 - lastDay.getDay()) % 7;
  const lastSundayDate = lastDay.getDate() + daysUntilLastSunday;
  const dayOfMonth = date.getDate();
  // 月末の金土日を本戦とする
  // 簡易実装: 最終3日間を本戦とする
  if (dayOfMonth >= lastSundayDate - 2 && dayOfMonth <= lastSundayDate) return "FINALS";
  return "DAILY";
}

export function getCurrentSession(date: Date): { id: number; isActive: boolean; endsAt: Date; nextStartsAt?: Date } | null {
  const hour = date.getHours();
  const min = date.getMinutes();
  const currentMin = hour * 60 + min;

  for (let i = 0; i < GVG_DAILY_SESSIONS.length; i++) {
    const s = GVG_DAILY_SESSIONS[i];
    const startMin = s.startHour * 60 + s.startMin;
    const endMin = startMin + s.durationMin;

    if (currentMin >= startMin && currentMin < endMin) {
      const endsAt = new Date(date);
      endsAt.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      return { id: s.id, isActive: true, endsAt };
    }
  }

  // Find next session today or tomorrow
  for (let i = 0; i < GVG_DAILY_SESSIONS.length; i++) {
    const s = GVG_DAILY_SESSIONS[i];
    const startMin = s.startHour * 60 + s.startMin;
    if (currentMin < startMin) {
      const nextStartsAt = new Date(date);
      nextStartsAt.setHours(s.startHour, s.startMin, 0, 0);
      return { id: s.id, isActive: false, endsAt: new Date(), nextStartsAt };
    }
  }
  
  // Next session is tomorrow's first session
  const nextStartsAt = new Date(date);
  nextStartsAt.setDate(date.getDate() + 1);
  nextStartsAt.setHours(GVG_DAILY_SESSIONS[0].startHour, GVG_DAILY_SESSIONS[0].startMin, 0, 0);
  return { id: GVG_DAILY_SESSIONS[0].id, isActive: false, endsAt: new Date(), nextStartsAt };
}
