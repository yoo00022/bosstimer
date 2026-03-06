
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Users, Send, User, UserMinus, Signal, BadgeCheck, CheckCircle, ShieldX, UserCheck, Trash2, Edit3 } from 'lucide-react';
import { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserId: string;
  isAdmin: boolean;
  certifiedUsers: string[];
  bannedUsers: string[];
  onlineUsers: string[];
  onKick: (name: string) => void;
  onUnban: (name: string) => void;
  onCertify: (name: string) => void;
  onRenameUser?: (oldName: string, newName: string) => void;
}

const Sidebar: React.FC<Props> = ({ messages, onSendMessage, currentUserId, isAdmin, certifiedUsers, bannedUsers, onlineUsers, onKick, onUnban, onCertify, onRenameUser }) => {
  const [inputText, setInputText] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'BANNED'>('ACTIVE');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const displayOnlineList = Array.from(new Set([currentUserId, ...onlineUsers])).sort((a, b) => {
    if (a === currentUserId) return -1;
    if (b === currentUserId) return 1;
    return a.localeCompare(b);
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const isUserCertified = (name: string) => certifiedUsers.includes(name);

  const handleRename = (oldName: string) => {
    const newName = prompt(`請輸入「${oldName}」的新名稱：`, oldName);
    if (newName && newName.trim() && newName.trim() !== oldName) {
      onRenameUser?.(oldName, newName.trim());
    }
  };

  return (
    <aside className="w-full lg:w-[350px] xl:w-[450px] h-full flex flex-col p-4 md:p-6 bg-[#EAE7E2] dark:bg-zinc-950 border-l-2 border-gray-200 dark:border-zinc-800 shadow-inner transition-all duration-300">
      <div className="morandi-panel rounded-[2rem] h-[180px] md:h-[280px] flex flex-col mb-6 overflow-hidden shadow-md border-none bg-white dark:bg-zinc-900">
         <div className="p-5 border-b dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
            <h2 className="text-lg md:text-xl font-black text-[#8FA6AC] flex items-center gap-3">
               {viewMode === 'ACTIVE' ? <Users className="w-6 h-6"/> : <ShieldX className="w-6 h-6 text-red-400"/>} 
               {viewMode === 'ACTIVE' ? `👥 在線浣力 (${onlineUsers.length})` : '🚫 封鎖名單'}
            </h2>
            <div className="flex items-center gap-2">
               {isAdmin && (
                  <button 
                    onClick={() => setViewMode(viewMode === 'ACTIVE' ? 'BANNED' : 'ACTIVE')} 
                    className={`p-1.5 rounded-lg transition-all border-2 ${viewMode === 'BANNED' ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                    title={viewMode === 'ACTIVE' ? '管理封鎖名單' : '回到在線名單'}
                  >
                    {viewMode === 'ACTIVE' ? <ShieldX className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </button>
               )}
               {viewMode === 'ACTIVE' && (
                  <div className="flex items-center gap-2 text-green-500 font-black">
                     <Signal className="w-4 h-4 animate-pulse" />
                     <span className="text-[10px] tracking-widest uppercase">Connected</span>
                  </div>
               )}
            </div>
         </div>
         <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {viewMode === 'ACTIVE' ? (
               displayOnlineList.map((name, i) => (
                  <div key={i} className="flex justify-between items-center animate-in fade-in slide-in-from-left-2 duration-300">
                     <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${name === currentUserId ? 'bg-[#B48A8A] text-white border-[#B48A8A] shadow-md' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-gray-200 dark:border-zinc-700'}`}><User className="w-5 h-5"/></div>
                        <div className="flex flex-col">
                           <span className={`text-base md:text-lg font-black flex items-center gap-1.5 ${name === currentUserId ? 'text-[#B48A8A]' : 'text-morandi-text'}`}>
                             {name}
                             {isUserCertified(name) && <span title="認證浣力"><BadgeCheck className="w-4 h-4 text-[#8FA6AC]" /></span>}
                           </span>
                        </div>
                     </div>
                     {isAdmin && name !== currentUserId && (
                       <div className="flex gap-1.5">
                          <button onClick={()=>handleRename(name)} className="p-2 bg-gray-50 dark:bg-zinc-800 text-gray-400 rounded-xl hover:text-[#8FA6AC] transition-all shadow-sm" title="更名">
                             <Edit3 className="w-4 h-4" />
                          </button>
                          {!isUserCertified(name) && (
                            <button onClick={()=>onCertify(name)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl hover:bg-blue-100 transition-all shadow-sm" title="給予認證">
                              <UserCheck className="w-4 h-4"/>
                            </button>
                          )}
                          <button onClick={()=>onKick(name)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-400 rounded-xl hover:bg-red-100 transition-all shadow-sm" title="封鎖此人">
                            <UserMinus className="w-4 h-4"/>
                          </button>
                       </div>
                     )}
                  </div>
               ))
            ) : (
               bannedUsers.length === 0 ? (
                  <p className="text-center py-10 text-gray-300 font-black italic">尚無封鎖對象</p>
               ) : (
                  bannedUsers.map((name, i) => (
                     <div key={i} className="flex justify-between items-center animate-in zoom-in-95 duration-300 bg-red-50/50 dark:bg-red-900/10 p-2 rounded-xl border border-red-100 dark:border-red-900/20">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-red-100 text-red-500 flex items-center justify-center"><ShieldX className="w-4 h-4"/></div>
                           <span className="text-morandi-text font-black">{name}</span>
                        </div>
                        <button onClick={()=>onUnban(name)} className="p-2 text-gray-400 hover:text-green-500 transition-all" title="解除封鎖">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  ))
               )
            )}
         </div>
      </div>

      <div className="morandi-panel rounded-[2.5rem] flex-1 flex flex-col overflow-hidden shadow-lg border-none bg-white dark:bg-zinc-900 relative">
         <div className="p-5 border-b dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-800/80 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-[#8FA6AC]"/>
            <h2 className="text-lg md:text-xl font-black text-[#8FA6AC] uppercase tracking-[0.2em]">💬 密語頻道</h2>
         </div>
         
         <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin bg-white/50 dark:bg-zinc-900/50">
            {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-10 text-center grayscale select-none dark:invert">
                  <MessageSquare className="w-20 h-20 mb-4"/>
                  <p className="text-sm font-black uppercase tracking-[0.4em]">靜默中 ...</p>
               </div>
            ) : (
               messages.map(m => (
                  <div key={m.id} className={`flex flex-col ${m.user === currentUserId ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                     <div className={`flex items-baseline gap-2 mb-1.5 ${m.user === currentUserId ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-[11px] md:text-xs font-black flex items-center gap-1.5 ${m.user === currentUserId ? 'text-[#B48A8A]' : 'text-[#8FA6AC]'}`}>
                           {m.user}
                           {isUserCertified(m.user) && <BadgeCheck className="w-3.5 h-3.5 text-[#8FA6AC]" />}
                        </span>
                        <span className="text-[9px] text-gray-300 font-mono-bold opacity-70">{new Date(m.time).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                     <div className={`max-w-[90%] px-5 py-3 rounded-2xl text-lg md:text-xl font-black shadow-md border-2 transition-all ${m.user === currentUserId ? 'bg-[#8FA6AC] text-white border-[#8FA6AC] rounded-tr-none shadow-[#8FA6AC]/20' : 'bg-gray-50 dark:bg-zinc-800 text-morandi-text border-gray-100 dark:border-zinc-700 rounded-tl-none'}`}>
                        {m.text}
                     </div>
                  </div>
               ))
            )}
            <div ref={chatEndRef} />
         </div>

         <div className="p-5 bg-gray-50/80 dark:bg-zinc-800/80 border-t-2 border-gray-100 dark:border-zinc-700 shadow-inner">
            <form onSubmit={handleSubmit} className="flex gap-3">
               <input type="text" placeholder="📜 輸入訊息..." value={inputText} onChange={(e)=>setInputText(e.target.value)} className="flex-1 bg-white dark:bg-zinc-900 dark:text-white border-2 border-gray-100 dark:border-zinc-700 rounded-2xl px-6 py-3 text-base md:text-xl font-black outline-none focus:border-[#8FA6AC] transition-all shadow-sm" />
               <button type="submit" className="p-4 bg-[#8FA6AC] text-white rounded-2xl shadow-xl active:scale-90 transition-all hover:bg-[#7D949A] flex items-center justify-center">
                  <Send className="w-6 h-6"/>
               </button>
            </form>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
