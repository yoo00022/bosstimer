
export interface KillRecord {
  time: number;
  killerId: string;
  thunderTime?: number | null;
  type?: 'KILL' | 'THUNDER';
}

export interface BossChannel {
  id: number;
  lastKillTime: number | null;
  lastKillerId: string | null;
  name: string;
  history: KillRecord[];
  supervisorIds?: string[]; // 新增：多位監督人
  lastAlertTime?: number | null; // 新增：全域警報時間戳記
  isTimeInaccurate?: boolean; // 新增：時間可能不準
}

export interface TimerStatus {
  status: 'IDLE' | 'WAITING' | 'WINDOW_OPEN' | 'OVERDUE';
  color: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: number;
}

export const RESPAWN_CONFIG = {
  MIN_HOURS: 2,
  MAX_HOURS: 5
};

export const ADMIN_PASSWORD = "bns888";
