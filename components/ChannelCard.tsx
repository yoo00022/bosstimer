
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BossChannel, RESPAWN_CONFIG, TimerStatus } from '../types';
import { Clock, Send, Trash2, Zap, CheckCircle2, History, X, AlertTriangle, Eye, ShieldCheck, UserX, Megaphone, AlertCircle } from 'lucide-react';

interface Props {
  channel: BossChannel;
  currentUserId: string;
  isAdmin: boolean;
  onUpdate: (id: number, timestamp: number | null, thunderTime?: number | null) => void;
  onUpdateSupervisor: (id: number, supervisor: string | null) => void;
  onTriggerGlobalAlert: (id: number) => void;
  onDeleteHistoryItem: (channelId: number, index: number) => void;
  onWindowAlert: () => void;
  onBossAlert: (id: number) => void;
  onUpdateTimeInaccuracy: (id: number, isInaccurate: boolean) => void;
  now: number;
}

const ChannelCard: React.FC<Props> = ({ channel, currentUserId, isAdmin, onUpdate, onUpdateSupervisor, onTriggerGlobalAlert, onDeleteHistoryItem, onWindowAlert, onBossAlert, onUpdateTimeInaccuracy, now }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'NOW' | 'MANUAL' | 'THUNDER' | null>(null);
  const [hasAlerted, setHasAlerted] = useState(false);
  const prevAlertTimeRef = useRef<number | null>(channel.lastAlertTime || null);

  const [selH, setSelH] = useState('00');
  const [selM, setSelM] = useState('00');
  const [selS, setSelS] = useState('00');

  const [thunderH, setThunderH] = useState('00');
  const [thunderM, setThunderM] = useState('00');
  const [thunderS, setThunderS] = useState('00');

  const handleThunderMinus5 = () => {
    if (!channel.lastKillTime) return;
    const thunderDate = new Date(channel.lastKillTime - 5 * 60 * 1000);
    setThunderH(thunderDate.getHours().toString().padStart(2, '0'));
    setThunderM(thunderDate.getMinutes().toString().padStart(2, '0'));
    setThunderS(thunderDate.getSeconds().toString().padStart(2, '0'));
  };

  const stats = useMemo(() => {
    if (!channel.lastKillTime) return null;
    const windowStartTime = channel.lastKillTime + RESPAWN_CONFIG.MIN_HOURS * 60 * 60 * 1000;
    const windowEndTime = channel.lastKillTime + RESPAWN_CONFIG.MAX_HOURS * 60 * 60 * 1000;

    let status: TimerStatus;
    let diff = 0;
    let progress = 0;

    if (now < windowStartTime) {
      status = { status: 'WAITING', color: 'text-[#8FA6AC]', label: '🍃 冷卻中' };
      diff = windowStartTime - now;
    } else if (now <= windowEndTime) {
      status = { status: 'WINDOW_OPEN', color: 'text-red-500 font-black animate-pulse', label: '⚔️ 視窗開啟中' };
      diff = windowEndTime - now;
      const totalWindow = windowEndTime - windowStartTime;
      progress = ((now - windowStartTime) / totalWindow) * 100;
    } else {
      status = { status: 'OVERDUE', color: 'text-red-400 animate-pulse text-sm md:text-base', label: '🌫️ 時間丟失中' };
      diff = 0;
      progress = 100;
    }

    return { windowStartTime, windowEndTime, status, diff, progress };
  }, [channel.lastKillTime, now]);

  // 1. 開窗或時間丟失自動提醒 (wow.mp3)
  useEffect(() => {
    if ((stats?.status.status === 'WINDOW_OPEN' || stats?.status.status === 'OVERDUE') && !hasAlerted) {
      onWindowAlert();
      setHasAlerted(true);
    }
    if (stats?.status.status === 'WAITING' || !channel.lastKillTime) {
      setHasAlerted(false);
    }
  }, [stats?.status.status, hasAlerted, onWindowAlert, channel.lastKillTime]);

  // 2. 全域同步警報 (bossgo.mp3 + Xs.mp3)
  useEffect(() => {
    if (channel.lastAlertTime && channel.lastAlertTime !== prevAlertTimeRef.current) {
      onBossAlert(channel.id);
      prevAlertTimeRef.current = channel.lastAlertTime;
    }
  }, [channel.lastAlertTime, onBossAlert, channel.id]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatCountdown = (ms: number) => {
    const totalSec = Math.floor(Math.max(0, ms) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const renderPickerOptions = (max: number) => Array.from({ length: max }, (_, i) => {
    const v = i.toString().padStart(2, '0');
    return <option key={v} value={v} className="bg-white dark:bg-zinc-800">{v}</option>;
  });

  const canDeleteRecord = (killerId: string | null) => {
    if (isAdmin) return true;
    if (!killerId || !currentUserId) return false;
    return killerId.trim().toLowerCase() === currentUserId.trim().toLowerCase();
  };

  const handleRegisterSupervisor = () => {
    onUpdateSupervisor(channel.id, currentUserId);
  };

  const handleBossSpawned = () => {
    const supervisorIds = channel.supervisorIds || [];
    const isSupervisor = supervisorIds.includes(currentUserId);

    if (isSupervisor || isAdmin) {
      onTriggerGlobalAlert(channel.id);
    }
  };

  return (
    <div className={`morandi-panel rounded-[2.5rem] flex flex-col transition-all duration-300 overflow-hidden relative shadow-lg border-2 dark:bg-zinc-900 ${
      stats?.status.status === 'WINDOW_OPEN' ? 'border-red-400 ring-4 ring-red-400/10' : 'border-gray-100 dark:border-zinc-800'
    }`}>
      <div className={`p-5 flex justify-between items-center ${stats?.status.status === 'WINDOW_OPEN' || stats?.status.status === 'OVERDUE' ? 'bg-red-400/5' : 'bg-gray-50/50 dark:bg-zinc-800/50'}`}>
         <div className="flex items-center gap-4">
            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black shadow-md transition-all ${stats?.status.status === 'WINDOW_OPEN' || stats?.status.status === 'OVERDUE' ? 'bg-red-500 text-white rotate-3' : 'bg-white dark:bg-zinc-800 text-[#8FA6AC] border dark:border-zinc-700'}`}>
               {channel.id}
            </div>
            <div>
               <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-morandi-text leading-tight">{channel.name}</h3>
                  {channel.isTimeInaccurate && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800 animate-bounce">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">時間不準</span>
                    </div>
                  )}
               </div>
               <span className={`font-black uppercase tracking-[0.1em] ${stats?.status.color}`}>
                  {stats?.status.label || '🔍 情報待輸入'}
               </span>
            </div>
         </div>
         <div className="flex gap-2">
            {stats?.status.status === 'WINDOW_OPEN' && (
              <button 
                onClick={() => onUpdateTimeInaccuracy(channel.id, !channel.isTimeInaccurate)}
                className={`p-3 rounded-xl border-2 shadow-sm transition-all flex items-center gap-2 ${channel.isTimeInaccurate ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-zinc-800 text-gray-300 hover:text-amber-500 dark:border-zinc-700'}`}
                title="時間可能不準"
              >
                <AlertTriangle className="w-5 h-5"/>
                <span className="text-[10px] font-black hidden sm:inline">時間不準?</span>
              </button>
            )}
            <button onClick={()=>setShowHistory(!showHistory)} className={`p-3 rounded-xl border-2 shadow-sm transition-all ${showHistory ? 'bg-[#8FA6AC] text-white border-[#8FA6AC]' : 'bg-white dark:bg-zinc-800 text-gray-300 hover:text-[#8FA6AC] dark:border-zinc-700'}`}>
               <History className="w-5 h-5"/>
            </button>
         </div>
      </div>

      <div className="p-5 md:p-6 space-y-5 flex-1 flex flex-col">
         {showHistory && (
           <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700 shadow-inner animate-in slide-in-from-top-4 duration-300 relative z-10">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-zinc-700 pb-2">
                 <h4 className="text-[10px] font-black text-[#8FA6AC] uppercase tracking-[0.2em]">📜 重生紀錄</h4>
                 <button onClick={()=>setShowHistory(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors"><X className="w-4 h-4 text-gray-400 hover:text-red-500"/></button>
              </div>
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                 {channel.history.length === 0 ? <p className="text-center py-6 text-gray-300 text-sm font-black italic">無數據</p> : 
                   channel.history.map((h, i) => (
                     <div key={i} className="bg-white dark:bg-zinc-900 p-3 rounded-xl flex justify-between items-center border dark:border-zinc-700 shadow-xs hover:border-[#8FA6AC]/30 transition-all">
                        <div className="flex flex-col">
                           <div className="flex items-baseline gap-2">
                              <span className="text-xs font-black text-[#8FA6AC]">{formatDate(h.time)}</span>
                              <p className="text-xl font-mono-bold text-morandi-text leading-none tracking-tight">{formatTime(h.time)}</p>
                           </div>
                           {h.thunderTime && (
                             <div className="flex items-center gap-1 mt-1 text-[10px] font-black text-amber-500">
                               <Zap className="w-3 h-3 fill-current" />
                               <span>打雷：{formatTime(h.thunderTime)}</span>
                             </div>
                           )}
                           <p className={`text-[9px] font-black px-2 py-0.5 rounded-md inline-block w-fit mt-1.5 border ${canDeleteRecord(h.killerId) ? 'bg-[#B48A8A]/10 text-[#B48A8A] border-[#B48A8A]/20' : 'text-[#8FA6AC] bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                              🕵️ BY: {h.killerId}
                           </p>
                        </div>
                        {canDeleteRecord(h.killerId) && (
                          <button onClick={()=>{ if(confirm(`確定刪除此筆紀錄？`)) onDeleteHistoryItem(channel.id, i); }} className="text-red-300 hover:text-red-500 p-2 rounded-xl transition-all hover:bg-red-50 dark:hover:bg-red-900/20">
                             <Trash2 className="w-5 h-5"/>
                          </button>
                        )}
                     </div>
                   ))
                 }
              </div>
           </div>
         )}

         {!channel.lastKillTime ? (
           <div className="h-[150px] md:h-[180px] bg-gray-50 dark:bg-zinc-800/50 rounded-[2rem] border-4 border-dashed border-gray-200 dark:border-zinc-700 flex flex-col items-center justify-center opacity-40">
              <Clock className="w-12 h-12 mb-3 text-[#8FA6AC] animate-pulse" />
              <p className="text-sm font-black tracking-[0.3em] uppercase text-[#8FA6AC]">等待偵查情報</p>
           </div>
         ) : (
           <div className="space-y-5 flex-1 flex flex-col">
              <div className={`p-5 md:p-8 rounded-[2rem] border-2 text-center shadow-inner flex flex-col justify-center relative overflow-hidden transition-all ${stats!.status.status === 'WINDOW_OPEN' || stats!.status.status === 'OVERDUE' ? 'bg-red-400/5 border-red-400/20' : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700'}`}>
                 <p className="text-[11px] font-black text-[#8FA6AC] uppercase tracking-[0.2em] mb-2">
                    {stats!.status.status === 'WAITING' ? '⏳ 視窗開啟倒數' : stats!.status.status === 'WINDOW_OPEN' ? '🔥 視窗關閉倒數' : '🌫️ 時間丟失中'}
                 </p>
                 <div className="flex justify-center w-full">
                    <p className={`text-4xl md:text-6xl font-mono-bold leading-tight tabular-nums tracking-tighter ${stats!.status.color}`}>
                       {formatCountdown(stats!.diff)}
                    </p>
                 </div>
                 
                 {stats!.status.status === 'WINDOW_OPEN' && (
                    <div className="mt-4 w-full">
                       <div className="h-2 w-full bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 transition-all duration-1000" style={{ width: `${stats!.progress}%` }}></div>
                       </div>
                       <p className="text-[9px] font-black text-red-400 mt-2 uppercase tracking-widest">視窗進度: {Math.round(stats!.progress)}%</p>
                    </div>
                 )}
              </div>

              {(stats!.status.status === 'WINDOW_OPEN' || stats!.status.status === 'OVERDUE') && (
                 <div className={`p-4 rounded-3xl border-2 flex flex-col gap-4 transition-all shadow-md ${(channel.supervisorIds?.length || 0) > 0 ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700'}`}>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2.5">
                          {((channel.supervisorIds?.length || 0) > 0) ? <ShieldCheck className="w-6 h-6 text-green-500"/> : <Eye className="w-6 h-6 text-gray-400 animate-pulse"/>}
                          <div className="flex flex-col">
                             <span className={`text-[10px] font-black tracking-widest ${((channel.supervisorIds?.length || 0) > 0) ? 'text-green-600' : 'text-gray-400'}`}>監督人</span>
                             <div className="flex flex-wrap gap-1 mt-0.5">
                                {((channel.supervisorIds?.length || 0) > 0) ? (
                                   channel.supervisorIds?.map(id => (
                                      <span key={id} className="text-xs font-black bg-white/80 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border dark:border-zinc-700 text-morandi-text shadow-sm">
                                         {id}
                                      </span>
                                   ))
                                ) : (
                                   <span className="text-base font-black text-gray-300 italic">無人登記</span>
                                )}
                             </div>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <button 
                             onClick={handleRegisterSupervisor}
                             className={`px-4 py-2 rounded-2xl text-[11px] font-black transition-all shadow-sm flex items-center gap-2 ${(channel.supervisorIds?.includes(currentUserId)) ? 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20' : 'bg-[#8FA6AC] text-white hover:bg-[#7D949A]'}`}
                          >
                             {(channel.supervisorIds?.includes(currentUserId)) ? <><UserX className="w-4 h-4"/> 取消</> : <><ShieldCheck className="w-4 h-4"/> 守點</>}
                          </button>
                       </div>
                    </div>
                    
               {(channel.supervisorIds?.includes(currentUserId) || isAdmin) && (
                  <button 
                     onClick={handleBossSpawned}
                     className="w-full bg-[#B48A8A] text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#B48A8A]/30 active:scale-95 transition-all animate-pulse border-b-4 border-black/10"
                  >
                     <Megaphone className="w-6 h-6" /> 📢 王出了！
                  </button>
               )}
                 </div>
              )}

              <div className="space-y-3">
                 <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-700 shadow-sm flex justify-between items-center">
                    <div>
                       <p className="text-[9px] font-black text-[#8FA6AC] uppercase tracking-wider mb-1">🩸 上次擊殺時間</p>
                       <p className="text-xl md:text-2xl font-mono-bold text-morandi-text leading-none tracking-tight">{formatTime(channel.lastKillTime)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-[#8FA6AC] uppercase tracking-wider mb-1">📡 通報浣力</p>
                       <span className="bg-[#8FA6AC]/5 dark:bg-zinc-700/50 px-3 py-1 rounded-lg font-black text-[12px] text-morandi-text border border-[#8FA6AC]/10">{channel.lastKillerId}</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl border-2 border-gray-50 dark:border-zinc-700 shadow-sm text-center">
                        <p className="text-[8px] font-black text-[#8FA6AC] uppercase mb-1 tracking-tight">🌱 重生視窗開啟 (+2H)</p>
                        <p className="text-lg font-mono-bold text-[#8FA6AC]">{formatTime(stats!.windowStartTime)}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl border-2 border-red-50 dark:border-red-900/30 shadow-sm text-center">
                        <p className="text-[8px] font-black text-red-400 uppercase mb-1 tracking-tight">💀 重生視窗關閉 (+5H)</p>
                        <p className="text-lg font-mono-bold text-red-500">{formatTime(stats!.windowEndTime)}</p>
                    </div>
                 </div>
              </div>
           </div>
         )}

         <div className="space-y-4 mt-auto pt-6 border-t-2 border-gray-50 dark:border-zinc-800">
            <form onSubmit={(e)=>{ e.preventDefault(); setShowConfirm('THUNDER'); }} className="space-y-3">
               <div className="px-2">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> 打雷時間 (手動)
                  </span>
               </div>
               <div className="flex gap-3">
                  <div className="flex-1 flex gap-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl border-2 border-amber-400 dark:border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.2)] items-center justify-center transition-all hover:border-amber-500 group">
                     <select value={thunderH} onChange={(e)=>setThunderH(e.target.value)} className="bg-transparent text-2xl font-mono-bold outline-none cursor-pointer appearance-none text-amber-600 dark:text-amber-400">{renderPickerOptions(24)}</select>
                     <span className="text-xl font-mono-bold text-amber-300 group-hover:scale-110 transition-transform">:</span>
                     <select value={thunderM} onChange={(e)=>setThunderM(e.target.value)} className="bg-transparent text-2xl font-mono-bold outline-none cursor-pointer appearance-none text-amber-600 dark:text-amber-400">{renderPickerOptions(60)}</select>
                     <span className="text-xl font-mono-bold text-amber-300 group-hover:scale-110 transition-transform">:</span>
                     <select value={thunderS} onChange={(e)=>setThunderS(e.target.value)} className="bg-transparent text-2xl font-mono-bold outline-none cursor-pointer appearance-none text-amber-600 dark:text-amber-400">{renderPickerOptions(60)}</select>
                  </div>
                  <button 
                    type="button"
                    onClick={handleThunderMinus5}
                    disabled={!channel.lastKillTime}
                    className={`px-3 rounded-2xl border-2 font-black text-xs transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 ${!channel.lastKillTime ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400'}`}
                    title="設定為上次擊殺時間 -5 分鐘"
                  >
                    <Clock className="w-4 h-4" />
                    <span>K-5m</span>
                  </button>
                  <button type="submit" className="bg-amber-500 hover:bg-amber-600 px-4 rounded-2xl border-2 border-amber-400 active:scale-95 transition-all shadow-lg flex items-center justify-center group">
                     <Send className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform"/>
                  </button>
               </div>
            </form>

            <form onSubmit={(e)=>{ e.preventDefault(); setShowConfirm('MANUAL'); }} className="space-y-3">
               <div className="px-2">
                  <span className="text-[10px] font-black text-[#8FA6AC] uppercase tracking-widest">⚔️ 擊殺時間 (手動)</span>
               </div>
               <div className="flex gap-3">
                  <div className="flex-1 flex gap-2 bg-gray-50 dark:bg-zinc-800 p-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-700 shadow-inner items-center justify-center">
                     <select value={selH} onChange={(e)=>setSelH(e.target.value)} className="bg-transparent text-2xl font-mono-bold outline-none cursor-pointer appearance-none text-morandi-text">{renderPickerOptions(24)}</select>
                     <span className="text-xl font-mono-bold text-gray-300">:</span>
                     <select value={selM} onChange={(e)=>setSelM(e.target.value)} className="bg-transparent text-2xl font-mono-bold outline-none cursor-pointer appearance-none text-morandi-text">{renderPickerOptions(60)}</select>
                     <span className="text-xl font-mono-bold text-gray-300">:</span>
                     <select value={selS} onChange={(e)=>setSelS(e.target.value)} className="bg-transparent text-2xl font-mono-bold outline-none cursor-pointer appearance-none text-morandi-text">{renderPickerOptions(60)}</select>
                  </div>
                  <button type="submit" className="bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 px-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-700 active:scale-95 transition-all shadow-md flex items-center justify-center">
                     <Send className="w-6 h-6 text-[#8FA6AC]"/>
                  </button>
               </div>
            </form>

            <div className="flex gap-3">
               <button onClick={()=>setShowConfirm('NOW')} className="flex-1 bg-[#8FA6AC] hover:bg-[#7D949A] text-white font-black py-5 rounded-[1.5rem] text-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all border-b-4 border-black/10">
                  <Zap className="w-8 h-8" fill="white" /> 💥 擊殺時間
               </button>
               {isAdmin && (
                 <button onClick={()=>{ if(confirm("確定重設此頻道計時？")) onUpdate(channel.id, null); }} className="p-5 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 text-gray-200 hover:text-red-400 hover:border-red-100 rounded-[1.5rem] shadow-md active:scale-90 transition-all flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                 </button>
               )}
            </div>
         </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
           <div className="morandi-panel w-full max-sm p-10 rounded-[3rem] text-center shadow-2xl animate-in zoom-in-95 relative overflow-hidden dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#8FA6AC]"></div>
              <div className="w-20 h-20 bg-[#8FA6AC]/10 text-[#8FA6AC] rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-[#8FA6AC]/20">
                 <CheckCircle2 className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-black text-morandi-text mb-3">📝 回報確認</h4>
              <p className="text-lg text-[#8FA6AC] font-bold mb-10">
                 {showConfirm === 'NOW' ? '擊殺時間登記為「現在」？' : 
                  showConfirm === 'THUNDER' ? `僅登記打雷時間「${thunderH}:${thunderM}:${thunderS}」？` :
                  `擊殺時間登記為「${selH}:${selM}:${selS}」？`}
                 {showConfirm !== 'THUNDER' && (thunderH !== '00' || thunderM !== '00' || thunderS !== '00') && <><br/><span className="text-amber-500 text-sm">（包含打雷時間：{thunderH}:{thunderM}:{thunderS}）</span></>}
              </p>
              <div className="flex gap-5">
                 <button onClick={()=>setShowConfirm(null)} className="flex-1 bg-gray-100 dark:bg-zinc-800 py-4 rounded-2xl font-black text-xl dark:text-white transition-colors">取消</button>
                 <button onClick={()=>{
                    let thunderTs: number | null = null;
                    if (thunderH !== '00' || thunderM !== '00' || thunderS !== '00' || showConfirm === 'THUNDER') {
                       const td = new Date();
                       td.setHours(parseInt(thunderH), parseInt(thunderM), parseInt(thunderS), 0);
                       if(td.getTime() > Date.now()) td.setDate(td.getDate() - 1);
                       thunderTs = td.getTime();
                    }

                    if(showConfirm === 'NOW') onUpdate(channel.id, Date.now(), thunderTs);
                    else if(showConfirm === 'THUNDER') {
                      onUpdate(channel.id, thunderTs, thunderTs);
                    }
                    else {
                      const d = new Date();
                      d.setHours(parseInt(selH), parseInt(selM), parseInt(selS), 0);
                      if(d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
                      onUpdate(channel.id, d.getTime(), thunderTs);
                    }
                    setShowConfirm(null);
                 }} className="flex-1 bg-[#8FA6AC] hover:bg-[#7D949A] text-white py-4 rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95">核准 ✨</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ChannelCard;
