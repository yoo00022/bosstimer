
import React, { useMemo } from 'react';
import { BossChannel, KillRecord } from '../types';
import { X, Calendar, BarChart3, ChevronRight, ChevronLeft, Zap } from 'lucide-react';

interface Props {
  channels: BossChannel[];
  onClose: () => void;
}

interface GroupedData {
  cycleStart: Date;
  cycleEnd: Date;
  killsByChannel: Record<number, KillRecord[]>;
}

const HistoryStats: React.FC<Props> = ({ channels, onClose }) => {
  const [selectedCycleIndex, setSelectedCycleIndex] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'KILL' | 'THUNDER' | 'BOTH'>('BOTH');

  const getCycleStart = (date: Date) => {
    const d = new Date(date);
    d.setHours(11, 0, 0, 0);
    const day = d.getDay();
    // Wednesday is 3. If before Wed 11:00, go back to last Wed.
    const diff = (day < 3 || (day === 3 && date.getHours() < 11)) ? (day + 4) : (day - 3);
    d.setDate(d.getDate() - diff);
    return d;
  };

  const stats = useMemo(() => {
    const groups: Record<string, GroupedData> = {};

    channels.forEach(ch => {
      ch.history.forEach(record => {
        const start = getCycleStart(new Date(record.time));
        const key = start.getTime().toString();

        if (!groups[key]) {
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          groups[key] = {
            cycleStart: start,
            cycleEnd: end,
            killsByChannel: {}
          };
        }

        if (!groups[key].killsByChannel[ch.id]) {
          groups[key].killsByChannel[ch.id] = [];
        }
        groups[key].killsByChannel[ch.id].push(record);
      });
    });

    return Object.values(groups).sort((a, b) => b.cycleStart.getTime() - a.cycleStart.getTime());
  }, [channels]);

  const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:00`;

  const currentGroup = stats[selectedCycleIndex];

  return (
    <div className="fixed inset-0 z-[150] bg-morandi-bg dark:bg-zinc-950 overflow-y-auto animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#8FA6AC] rounded-2xl text-white shadow-lg">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-morandi-text">歷史數據統計</h2>
              <p className="text-[#8FA6AC] font-bold">每週三 11:00 循環更新</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            {stats.length > 0 && (
              <div className="flex-1 md:flex-none relative">
                <select 
                  value={selectedCycleIndex} 
                  onChange={(e) => setSelectedCycleIndex(parseInt(e.target.value))}
                  className="w-full md:w-auto bg-white dark:bg-zinc-900 border-2 border-[#8FA6AC]/20 rounded-2xl px-6 py-4 font-black text-morandi-text outline-none focus:border-[#8FA6AC] transition-all appearance-none pr-12 shadow-md"
                >
                  {stats.map((group, idx) => (
                    <option key={idx} value={idx}>
                      {formatDate(group.cycleStart)} ~ {formatDate(group.cycleEnd)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8FA6AC]">
                  <ChevronRight className="w-6 h-6 rotate-90" />
                </div>
              </div>
            )}
            <button 
              onClick={onClose}
              className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 text-gray-400 hover:text-red-500 transition-all shadow-md active:scale-95"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
        </header>

        {stats.length === 0 ? (
          <div className="text-center py-40">
            <Calendar className="w-20 h-20 text-gray-200 mx-auto mb-6" />
            <p className="text-2xl font-black text-gray-300 italic">目前尚無足夠的歷史資料</p>
          </div>
        ) : (
          <div className="space-y-12">
            {currentGroup && (
              <section className="morandi-panel p-6 md:p-8 rounded-[2.5rem] border-t-8 border-[#8FA6AC] shadow-xl dark:bg-zinc-900">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-gray-50 dark:border-zinc-800 pb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-[#8FA6AC]" />
                    <h3 className="text-xl font-black text-morandi-text">
                      週期：{formatDate(currentGroup.cycleStart)} ~ {formatDate(currentGroup.cycleEnd)}
                    </h3>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl border border-gray-200 dark:border-zinc-700">
                    {[
                      { id: 'KILL', label: '擊殺' },
                      { id: 'THUNDER', label: '打雷' },
                      { id: 'BOTH', label: '綜合' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                          viewMode === mode.id 
                            ? 'bg-white dark:bg-zinc-700 text-[#8FA6AC] shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-12">
                  {channels
                    .filter(ch => (currentGroup.killsByChannel[ch.id] || []).length > 0)
                    .map(ch => {
                      const channelKillsInCycle = currentGroup.killsByChannel[ch.id] || [];
                      
                      // Group kills by day of week (0-6, Sun-Sat)
                      const killsByDay: Record<number, KillRecord[]> = {
                        1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: []
                      };
                      
                      channelKillsInCycle.forEach(k => {
                        const day = new Date(k.time).getDay();
                        killsByDay[day].push(k);
                      });

                      const days = [
                        { label: '星期一', id: 1 },
                        { label: '星期二', id: 2 },
                        { label: '星期三', id: 3 },
                        { label: '星期四', id: 4 },
                        { label: '星期五', id: 5 },
                        { label: '星期六', id: 6 },
                        { label: '星期天', id: 0 },
                      ];

                      // Find max kills in any day to determine row count
                      const maxKills = Math.max(...Object.values(killsByDay).map(v => v.length), 1);

                      return (
                        <div key={ch.id} className="overflow-hidden rounded-3xl border-2 border-gray-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                          <div className="bg-zinc-800 text-white p-4 text-center">
                            <h4 className="text-xl font-black tracking-[0.3em]">{ch.name} 重生時間表</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[800px]">
                              <thead>
                                <tr className="bg-zinc-700 text-white">
                                  {days.map(d => (
                                    <th key={d.id} className="border border-zinc-600 p-3 text-sm font-black w-[14.28%]">{d.label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: maxKills }).map((_, rowIndex) => (
                                  <tr key={rowIndex} className="border-b border-gray-100 dark:border-zinc-800">
                                    {days.map(d => {
                                      const kills = killsByDay[d.id].sort((a,b) => a.time - b.time);
                                      const kill = kills[rowIndex];
                                      return (
                                        <td key={d.id} className="border border-gray-100 dark:border-zinc-800 p-2 text-center h-14">
                                          {kill ? (
                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                              {(viewMode === 'KILL' || viewMode === 'BOTH') && (
                                                <span className="text-sm font-mono-bold text-morandi-text leading-none">
                                                  {new Date(kill.time).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                              )}
                                              {(viewMode === 'THUNDER' || viewMode === 'BOTH') && (
                                                kill.thunderTime ? (
                                                  <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5 leading-none">
                                                    <Zap className="w-2 h-2 fill-current" />
                                                    {new Date(kill.thunderTime).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                  </span>
                                                ) : (
                                                  viewMode === 'THUNDER' && <span className="text-[10px] text-gray-300 italic">無紀錄</span>
                                                )
                                              )}
                                            </div>
                                          ) : null}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryStats;
