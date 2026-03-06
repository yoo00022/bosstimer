
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellOff, Swords, Info, Lock, Unlock, X, Edit3, Save, Clock, ShieldAlert, Circle, RefreshCw, Star, Sun, Moon, MessageSquare, LayoutGrid, BarChart3 } from 'lucide-react';
import { BossChannel, ChatMessage, ADMIN_PASSWORD } from './types';
import ChannelCard from './components/ChannelCard';
import Sidebar from './components/Sidebar';
import HistoryStats from './components/HistoryStats';

// 確保引用正確的 db 實例
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, addDoc, query, orderBy, limit, deleteDoc, getDoc } from "firebase/firestore";

const INITIAL_CHANNELS: BossChannel[] = [
  { id: 1, lastKillTime: null, lastKillerId: null, name: '1 頻道', history: [], supervisorIds: [], lastAlertTime: null },
  { id: 2, lastKillTime: null, lastKillerId: null, name: '2 頻道', history: [], supervisorIds: [], lastAlertTime: null },
  { id: 3, lastKillTime: null, lastKillerId: null, name: '3 頻道', history: [], supervisorIds: [], lastAlertTime: null },
];

const WOW_SOUND_URL = "/wow.mp3";
const BOSS_GO_SOUND_URL = "/bossgo.mp3";

const App: React.FC = () => {
  const [channels, setChannels] = useState<BossChannel[]>(INITIAL_CHANNELS);
  const [userId, setUserId] = useState<string>(() => (localStorage.getItem('bns_user_id') || '').trim());
  const [certifiedUsers, setCertifiedUsers] = useState<string[]>(["管理員"]);
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isEntered, setIsEntered] = useState<boolean>(!!localStorage.getItem('bns_user_id'));
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notice, setNotice] = useState("正在啟動雲端連線...");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [now, setNow] = useState(Date.now());
  const [isBanned, setIsBanned] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  
  const [mobileTab, setMobileTab] = useState<'timers' | 'chat'>('timers');
  const [showStats, setShowStats] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const audioWowRef = useRef<HTMLAudioElement | null>(null);
  const audioBossRef = useRef<HTMLAudioElement | null>(null);
  const channelSoundsRef = useRef<Record<number, HTMLAudioElement>>({});
  const wakeLockRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);



  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Wake Lock API - 防止閒置時休眠
  useEffect(() => {
    if (!isEntered) return;
    
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Wake Lock request failed', err);
        }
      }
    };

    requestWakeLock();
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isEntered]);

  // 背景音效保活機制 (Silent Heartbeat)
  useEffect(() => {
    if (!soundEnabled || !isEntered) return;

    const interval = setInterval(() => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioCtx();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') ctx.resume();
          
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001; 
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        }
      } catch (e) {}
    }, 25000);

    return () => clearInterval(interval);
  }, [soundEnabled, isEntered]);

  useEffect(() => {
    audioWowRef.current = new Audio(WOW_SOUND_URL);
    audioWowRef.current.preload = "auto";
    audioBossRef.current = new Audio(BOSS_GO_SOUND_URL);
    audioBossRef.current.preload = "auto";

    for (let i = 1; i <= 3; i++) {
      const soundFile = `/${i}s.mp3`;
      const audio = new Audio(soundFile);
      audio.preload = "auto";
      channelSoundsRef.current[i] = audio;
    }
  }, []);

  const unlockAudio = useCallback(() => {
    if (isAudioUnlocked) return;
    
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx && !audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    [audioWowRef, audioBossRef].forEach(ref => {
      if (ref.current) {
        ref.current.play().then(() => { 
          ref.current?.pause(); 
          ref.current!.currentTime = 0; 
        }).catch(() => {});
      }
    });
    Object.values(channelSoundsRef.current).forEach((audio: HTMLAudioElement) => {
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    });
    
    setIsAudioUnlocked(true);
  }, [isAudioUnlocked]);

  useEffect(() => {
    if (isAudioUnlocked) {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    } else {
      window.addEventListener('click', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
    }
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [isAudioUnlocked, unlockAudio]);

  useEffect(() => {
    if (!isEntered || !userId) return;
    const unsubRename = onSnapshot(doc(db, "renames", userId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const nextName = data.newName;
        if (nextName && nextName !== userId) {
          localStorage.setItem('bns_user_id', nextName);
          setUserId(nextName);
          alert(`🔔 您的名稱已被管理員修改為：${nextName}`);
        }
      }
    });
    return () => unsubRename();
  }, [isEntered, userId]);

  useEffect(() => {
    if (!isEntered || !userId || isBanned) return;
    const userPresenceRef = doc(db, "presence", userId);
    const heartbeat = async () => {
      try {
        await setDoc(userPresenceRef, { name: userId, lastSeen: Date.now() });
      } catch (e) {}
    };
    heartbeat();
    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [isEntered, userId, isBanned]);

  const startSync = useCallback(() => {
    if (!isEntered) return () => {};
    setIsSyncing(true);
    const unsubState = onSnapshot(doc(db, "state", "global"), (docSnap) => {
      setIsSyncing(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.channels) setChannels(data.channels);
        if (data.notice) setNotice(data.notice);
        if (data.certifiedUsers) setCertifiedUsers(data.certifiedUsers);
      }
    }, (error) => {
      setIsSyncing(false);
      setSyncError(error.code);
    });
    const unsubPresence = onSnapshot(collection(db, "presence"), (snapshot) => {
      const now = Date.now();
      const online: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (now - data.lastSeen < 120000) online.push(data.name);
      });
      setOnlineUsers(online);
    });
    const msgsQuery = query(collection(db, "messages"), orderBy("time", "desc"), limit(50));
    const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs.reverse());
    });
    const unsubBanned = onSnapshot(doc(db, "state", "banned"), (docSnap) => {
      if (docSnap.exists()) {
        const list = docSnap.data().users || [];
        setBannedUsers(list);
        if (list.includes(userId)) setIsBanned(true);
        else setIsBanned(false);
      }
    });
    return () => { unsubState(); unsubMsgs(); unsubBanned(); unsubPresence(); };
  }, [isEntered, userId]);

  useEffect(() => {
    const unsub = startSync();
    return () => unsub && unsub();
  }, [startSync]);

  useEffect(() => {
    const workerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => {
            self.postMessage('tick');
          }, 1000);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
          timer = null;
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = () => {
      const t = Date.now();
      setNow(t);
      setCurrentTime(new Date(t));
    };
    
    worker.postMessage('start');
    
    return () => {
      worker.postMessage('stop');
      worker.terminate();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let name = userId.trim();
    if (!name) return;
    setIsLoggingIn(true);
    
    // 登入時順便嘗試解鎖音效
    unlockAudio();
    
    try {
      let finalName = name;
      let checkName = name;
      for(let i=0; i<5; i++) {
        const snap = await getDoc(doc(db, "renames", checkName));
        if (snap.exists() && snap.data().newName !== checkName) {
          finalName = snap.data().newName;
          checkName = finalName;
        } else break;
      }
      localStorage.setItem('bns_user_id', finalName);
      setUserId(finalName);
      setIsEntered(true);
    } catch (error) {
      localStorage.setItem('bns_user_id', name);
      setIsEntered(true);
    } finally { setIsLoggingIn(false); }
  };

  const playWowSound = useCallback(() => {
    if (audioWowRef.current && soundEnabled) {
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      audioWowRef.current.currentTime = 0;
      audioWowRef.current.play().catch(e => {
        if (e.name === 'NotAllowedError') {
          setIsAudioUnlocked(false);
        } else {
          console.error("Wow音效播放失敗:", e);
        }
      });
    }
  }, [soundEnabled]);

  const playBossSound = useCallback((channelId: number) => {
    if (!soundEnabled) return;
    if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    
    const mainAudio = audioBossRef.current;
    const subAudio = channelSoundsRef.current[channelId];
    
    if (mainAudio) {
      mainAudio.currentTime = 0;
      mainAudio.onended = () => {
        if (subAudio) {
          subAudio.currentTime = 0;
          subAudio.play().catch(e => {
            if (e.name === 'NotAllowedError') setIsAudioUnlocked(false);
            else console.error(`${channelId}s 音效播放失敗:`, e);
          });
        }
        mainAudio.onended = null;
      };
      mainAudio.play().catch(e => {
        if (e.name === 'NotAllowedError') setIsAudioUnlocked(false);
        else console.error("BossGo音效播放失敗:", e);
      });
    }
  }, [soundEnabled]);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState && audioWowRef.current) { 
      audioWowRef.current.currentTime = 0; 
      audioWowRef.current.play().catch(() => {}); 
    }
  };

  const updateKillRecord = async (id: number, timestamp: number | null, thunderTime: number | null = null) => {
    const channel = channels.find(ch => ch.id === id);
    if (!channel) return;

    // 如果是登記擊殺（不是重置），且 5 分鐘內已經有人登記過，則忽略
    if (timestamp !== null && channel.lastKillTime !== null) {
      const diff = Math.abs(timestamp - channel.lastKillTime);
      if (diff < 5 * 60 * 1000) {
        console.log(`忽略 5 分鐘內的重複登記: 頻道 ${id}`);
        return;
      }
    }

    const newChannels = channels.map(ch => {
      if (ch.id === id) {
        if (timestamp === null) return { ...ch, lastKillTime: null, lastKillerId: null, history: [], supervisorIds: [], lastAlertTime: null, isTimeInaccurate: false };
        const newHistory = [{ time: timestamp, killerId: userId.trim(), thunderTime }, ...ch.history].slice(0, 20);
        return { ...ch, lastKillTime: timestamp, lastKillerId: userId.trim(), history: newHistory, supervisorIds: [], lastAlertTime: null, isTimeInaccurate: false };
      }
      return ch;
    });
    await updateDoc(doc(db, "state", "global"), { channels: newChannels });
  };

  const updateSupervisor = async (id: number, supervisor: string | null) => {
    const newChannels = channels.map(ch => {
      if (ch.id === id) {
        let newIds = ch.supervisorIds || [];
        
        if (supervisor === null) {
          // 清空所有監督人 (通常是王出了或重置時)
          return { ...ch, supervisorIds: [] };
        } else {
          // 切換單一監督人狀態
          if (newIds.includes(supervisor)) {
            newIds = newIds.filter(uid => uid !== supervisor);
          } else {
            newIds = [...newIds, supervisor];
          }
          return { ...ch, supervisorIds: newIds };
        }
      }
      return ch;
    });
    await updateDoc(doc(db, "state", "global"), { channels: newChannels });
  };

  const updateTimeInaccuracy = async (id: number, isInaccurate: boolean) => {
    const newChannels = channels.map(ch => ch.id === id ? { ...ch, isTimeInaccurate: isInaccurate } : ch);
    await updateDoc(doc(db, "state", "global"), { channels: newChannels });
  };

  const triggerGlobalAlert = async (id: number) => {
    const newChannels = channels.map(ch => ch.id === id ? { ...ch, lastAlertTime: Date.now() } : ch);
    await updateDoc(doc(db, "state", "global"), { channels: newChannels });
  };

  const deleteHistoryItem = async (channelId: number, index: number) => {
    const newChannels = channels.map(ch => {
      if (channelId === ch.id) {
        const newHistory = [...ch.history];
        newHistory.splice(index, 1);
        if (newHistory.length === 0) return { ...ch, history: [], lastKillTime: null, lastKillerId: null, supervisorIds: [], lastAlertTime: null };
        return { ...ch, history: newHistory, lastKillTime: newHistory[0].time, lastKillerId: newHistory[0].killerId };
      }
      return ch;
    });
    await updateDoc(doc(db, "state", "global"), { channels: newChannels });
  };

  const renameUser = async (oldName: string, newName: string) => {
    if (!isAdmin) return;
    const cleanNewName = newName.trim();
    if (!cleanNewName || cleanNewName === oldName) return;
    try {
      await setDoc(doc(db, "renames", oldName), { newName: cleanNewName, timestamp: Date.now() });
      if (certifiedUsers.includes(oldName)) {
        const newList = certifiedUsers.map(u => u === oldName ? cleanNewName : u);
        await updateDoc(doc(db, "state", "global"), { certifiedUsers: newList });
      }
    } catch (e) {}
  };

  const sendMessage = async (text: string) => {
    try { await addDoc(collection(db, "messages"), { user: userId, text: text, time: Date.now() }); } catch (e) {}
  };

  const updateNotice = async (val: string) => {
    setNotice(val);
    await updateDoc(doc(db, "state", "global"), { notice: val });
  };

  const updateCertify = async (name: string) => {
    if (!isAdmin) return;
    const newList = [...new Set([...certifiedUsers, name])];
    const newBannedList = bannedUsers.filter(u => u !== name);
    await updateDoc(doc(db, "state", "global"), { certifiedUsers: newList });
    await setDoc(doc(db, "state", "banned"), { users: newBannedList }, { merge: true });
  };

  const kickUser = async (name: string) => {
    if (!isAdmin) return;
    const newBannedList = [...new Set([...bannedUsers, name])];
    const newCertList = certifiedUsers.filter(u => u !== name);
    await setDoc(doc(db, "state", "banned"), { users: newBannedList }, { merge: true });
    await updateDoc(doc(db, "state", "global"), { certifiedUsers: newCertList });
  };

  const unbanUser = async (name: string) => {
    if (!isAdmin) return;
    const newBannedList = bannedUsers.filter(u => u !== name);
    await setDoc(doc(db, "state", "banned"), { users: newBannedList }, { merge: true });
  };

  if (isBanned) return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A] text-red-500 text-center flex-col p-10 font-black">
      <ShieldAlert className="w-24 h-24 mb-6 animate-pulse"/>
      <h1 className="text-4xl">🚫 權限已關閉</h1>
      <p className="mt-4 text-gray-500">由於違反規定，浣力已被請離計時器。</p>
      <button onClick={() => { localStorage.removeItem('bns_user_id'); window.location.reload(); }} className="mt-10 text-gray-400 underline underline-offset-4">返回登入畫面</button>
    </div>
  );

  if (!isEntered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-morandi-bg transition-colors duration-300">
        <div className="morandi-panel w-full max-w-lg p-10 md:p-16 rounded-[3rem] text-center shadow-2xl relative overflow-hidden dark:bg-zinc-900">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#8FA6AC] via-[#B48A8A] to-[#8FA6AC]"></div>
          <Swords className="w-20 h-20 text-[#8FA6AC] mx-auto mb-10" />
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-morandi-text">帝王木重生計時</h1>
          <p className="text-[#8FA6AC] font-bold mb-12 flex items-center justify-center gap-2">作者：霜笙 ✍️</p>
          <form onSubmit={handleLogin} className="space-y-8">
            <input type="text" placeholder="📜 請輸入您的角色名稱" value={userId} onChange={(e)=>setUserId(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 rounded-2xl py-6 text-center font-black text-2xl outline-none border-2 focus:border-[#8FA6AC] transition-all disabled:opacity-50" required disabled={isLoggingIn} />
            <button className="w-full bg-[#8FA6AC] text-white font-black py-6 rounded-2xl text-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50" disabled={isLoggingIn}>
              {isLoggingIn ? '正在檢查更名...' : '✨ 進入雲端 ⚔️'}
            </button>
          </form>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="mt-8 p-3 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 transition-colors">
            {isDarkMode ? <Sun className="w-6 h-6"/> : <Moon className="w-6 h-6"/>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-morandi-bg transition-colors duration-300">
      <div className={`flex-1 overflow-hidden flex flex-col ${mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
        <header className="sticky top-0 z-50 bg-morandi-bg/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 md:p-5 border-b-2 border-gray-200 dark:border-zinc-800 flex flex-col xl:flex-row justify-between items-center gap-4 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[#8FA6AC] to-[#B48A8A] rounded-2xl text-white shadow-lg shadow-[#8FA6AC]/20">
              <Swords className="w-6 h-6 md:w-8 md:h-8"/>
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <h1 className="text-xl md:text-3xl font-black text-morandi-text tracking-tighter flex items-center gap-2">🌳 帝王木重生計時器 ⏳</h1>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-zinc-800/50 rounded-full border border-white dark:border-zinc-700 text-[10px] font-black text-[#8FA6AC] shadow-sm">
                  <Star className="w-3 h-3 fill-current" /> 作者：霜笙 ✍️
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1.5 font-bold text-[#8FA6AC] text-[10px] md:text-xs">
                 <button onClick={() => { localStorage.removeItem('bns_user_id'); window.location.reload(); }} className="text-red-400 font-black hover:underline underline-offset-4 flex items-center gap-1">🚪 登出：{userId}</button>
                 <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-sm">
                    <Circle className={`w-2 h-2 fill-current ${syncError ? 'text-red-500 animate-pulse' : isSyncing ? 'text-yellow-400 animate-spin' : 'text-green-500'}`} />
                    <span className="uppercase font-black text-[8px]">{syncError ? `ERR: ${syncError}` : isSyncing ? 'SYNCING' : '☁️ CLOUD ONLINE'}</span>
                 </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
             <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-md flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#8FA6AC]"/>
                <span className="text-xl md:text-3xl font-mono-bold text-morandi-text tabular-nums tracking-tight">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
             </div>
             <div className="flex gap-1.5">
               <button onClick={() => setShowStats(true)} className="p-3 rounded-2xl shadow-md transition-all border-2 bg-white dark:bg-zinc-800 text-[#8FA6AC] border-gray-100 dark:border-zinc-700" title="歷史數據統計"><BarChart3 className="w-5 h-5"/></button>
               <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl shadow-md transition-all border-2 bg-white dark:bg-zinc-800 text-gray-400 dark:text-gray-300 border-gray-100 dark:border-zinc-700">{isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
               <button onClick={toggleSound} className={`p-3 rounded-2xl shadow-md transition-all border-2 ${soundEnabled ? 'bg-[#8FA6AC] text-white border-[#8FA6AC]' : 'bg-white dark:bg-zinc-800 text-gray-300 border-gray-100 dark:border-zinc-700'}`} title={soundEnabled ? "關閉音效" : "開啟音效"}>{soundEnabled ? <Bell className="w-5 h-5"/> : <BellOff className="w-5 h-5"/>}</button>
               <button onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminModal(true)} className={`p-3 rounded-2xl shadow-md transition-all border-2 ${isAdmin ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-white dark:bg-zinc-800 text-gray-300 border-gray-100 dark:border-zinc-700'}`}>{isAdmin ? <Unlock className="w-5 h-5"/> : <Lock className="w-5 h-5"/>}</button>
               <button onClick={startSync} className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-700 shadow-md text-[#8FA6AC] active:rotate-180 transition-all"><RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /></button>
             </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8 pb-32 lg:pb-8">
           <section className={`morandi-panel p-5 md:p-7 rounded-[2rem] border-l-[12px] flex gap-5 items-start shadow-lg transition-all ${syncError ? 'border-l-red-400 bg-red-50/30' : 'border-l-[#8FA6AC] dark:bg-zinc-900'}`}>
              <div className={`p-3 rounded-2xl shrink-0 ${syncError ? 'bg-red-100 text-red-500' : 'bg-[#8FA6AC]/10 text-[#8FA6AC]'}`}><Info className="w-6 h-6" /></div>
              <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-xs text-[#8FA6AC] tracking-[0.2em] uppercase flex items-center gap-2">📢 系統公告 📜</span>
                    {isAdmin && <button onClick={()=>setIsEditingNotice(!isEditingNotice)} className="text-gray-300 hover:text-[#8FA6AC] transition-colors">{isEditingNotice ? <Save className="w-6 h-6"/> : <Edit3 className="w-6 h-6"/>}</button>}
                 </div>
                 {isEditingNotice ? (
                    <textarea value={notice} onChange={(e)=>updateNotice(e.target.value)} onBlur={()=>setIsEditingNotice(false)} className="w-full bg-white/50 dark:bg-zinc-800/50 dark:text-white p-4 text-lg md:text-2xl font-black rounded-2xl h-40 border-2 border-[#8FA6AC]/20 outline-none focus:border-[#8FA6AC] transition-all" autoFocus />
                 ) : (
                    <p className={`text-lg md:text-2xl font-black leading-relaxed break-words whitespace-pre-wrap text-morandi-text`}>{notice}</p>
                 )}
              </div>
           </section>
           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
             {channels.slice(0, 3).map(ch => (
               <ChannelCard key={ch.id} channel={ch} currentUserId={userId} isAdmin={isAdmin} onUpdate={updateKillRecord} onUpdateSupervisor={updateSupervisor} onTriggerGlobalAlert={triggerGlobalAlert} onDeleteHistoryItem={deleteHistoryItem} onWindowAlert={playWowSound} onBossAlert={() => playBossSound(ch.id)} onUpdateTimeInaccuracy={updateTimeInaccuracy} now={now} />
             ))}
           </div>
        </main>
      </div>
      <div className={`flex-1 lg:flex-none lg:w-[350px] xl:w-[450px] overflow-hidden ${mobileTab === 'timers' ? 'hidden lg:flex' : 'flex'}`}>
        <Sidebar messages={messages} onSendMessage={sendMessage} currentUserId={userId} isAdmin={isAdmin} certifiedUsers={certifiedUsers} bannedUsers={bannedUsers} onlineUsers={onlineUsers} onKick={kickUser} onUnban={unbanUser} onCertify={updateCertify} onRenameUser={renameUser} />
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-zinc-900 border-t-2 border-gray-200 dark:border-zinc-800 p-3 flex justify-around items-center z-[80] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => setMobileTab('timers')} className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'timers' ? 'text-[#8FA6AC]' : 'text-gray-300'}`}><LayoutGrid className="w-6 h-6" /><span className="text-[10px] font-black uppercase tracking-widest">報時器</span></button>
        <button onClick={() => setMobileTab('chat')} className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'chat' ? 'text-[#8FA6AC]' : 'text-gray-300'}`}><div className="relative"><MessageSquare className="w-6 h-6" /><span className="absolute -top-1 -right-1 bg-[#B48A8A] text-white text-[8px] px-1 rounded-full">{onlineUsers.length}</span></div><span className="text-[10px] font-black uppercase tracking-widest">浣力通訊</span></button>
      </nav>
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="morandi-panel w-full max-sm p-10 rounded-[3rem] text-center shadow-2xl animate-in zoom-in-95 relative overflow-hidden dark:bg-zinc-900">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#8FA6AC] to-transparent"></div>
              <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-morandi-text flex items-center gap-3">🔐 管理員授權</h3><button onClick={()=>setShowAdminModal(false)} className="p-2 hover:bg-red-50 rounded-full transition-colors"><X className="w-6 h-6 text-gray-300"/></button></div>
              <form onSubmit={(e)=>{ e.preventDefault(); if(adminPwdInput === ADMIN_PASSWORD) { setIsAdmin(true); setShowAdminModal(false); setAdminPwdInput(''); } else alert("❌ 密碼錯誤"); }} className="space-y-8">
                <input type="password" placeholder="🔑 請輸入管理密碼" value={adminPwdInput} onChange={(e)=>setAdminPwdInput(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 dark:text-white py-5 text-center font-black text-3xl rounded-2xl tracking-[0.5em] border-2 focus:border-[#8FA6AC] outline-none" autoFocus />
                <button className="w-full bg-[#8FA6AC] text-white font-black py-5 rounded-2xl text-xl shadow-xl transition-all">✨ 確認驗證</button>
              </form>
           </div>
        </div>
      )}
      {showStats && <HistoryStats channels={channels} onClose={() => setShowStats(false)} />}
      
      {isEntered && !isAudioUnlocked && (
        <div 
          onClick={unlockAudio}
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex items-center justify-center cursor-pointer group p-6"
        >
          <div className="morandi-panel w-full max-w-sm p-10 rounded-[3rem] text-center shadow-2xl animate-in zoom-in-95 dark:bg-zinc-900 border-2 border-[#8FA6AC]/20">
            <div className="w-24 h-24 bg-[#8FA6AC]/10 text-[#8FA6AC] rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-[#8FA6AC]/20 animate-bounce group-hover:scale-110 transition-transform">
              <Bell className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-morandi-text mb-3">點擊畫面啟用音效</h2>
            <p className="text-[#8FA6AC] font-bold mb-8">
              為了確保警報正常運作<br/>請先點擊一次畫面
            </p>
            <button className="w-full bg-[#8FA6AC] text-white font-black py-4 rounded-2xl text-xl shadow-xl transition-all group-hover:bg-[#7D949A]">
              ✨ 立即啟用
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
