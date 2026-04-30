/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight, Settings, Sword, Shield, Clock, Pencil } from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';

// LoLロール定義
const ROLES = [
  { id: 'TOP',   label: 'TOP',  icon: '🛡️' },
  { id: 'JG',    label: 'JG',   icon: '🌲' },
  { id: 'MID',   label: 'MID',  icon: '⚡' },
  { id: 'ADC',   label: 'ADC',  icon: '🏹' },
  { id: 'SUP',   label: 'SUP',  icon: '✨' },
];

// 時間ブロック定義
const TIME_BLOCKS = [
  { id: 10, label: '10' }, { id: 11, label: '11' }, { id: 12, label: '12' },
  { id: 13, label: '13' }, { id: 14, label: '14' }, { id: 15, label: '15' },
  { id: 16, label: '16' }, { id: 17, label: '17' }, { id: 18, label: '18' },
  { id: 19, label: '19' }, { id: 20, label: '20' }, { id: 21, label: '21' },
  { id: 22, label: '22' }, { id: 23, label: '23' }, { id: 0,  label: '0'  },
  { id: 1,  label: '1'  }, { id: 2,  label: '2'  }, { id: 3,  label: '3'  },
];

const TIME_GROUPS = [
  { label: '昼',  hours: [10,11,12] },
  { label: '午後', hours: [13,14,15,16,17] },
  { label: '夜',  hours: [18,19,20,21,22,23] },
  { label: '深夜', hours: [0,1,2,3] },
];

const COLOR_PALETTE = [
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-violet-400 to-purple-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500',
  'from-cyan-400 to-blue-500',
];

const ACTIVITY_TYPES = [
  { id: 'practice', label: '練習',  color: 'bg-sky-500/20 border-sky-400/40 text-sky-300' },
  { id: 'scrim',    label: 'スクリム', color: 'bg-amber-500/20 border-amber-400/40 text-amber-300' },
];

// 連続する時間帯をまとめて「HH:00〜HH:00」形式に変換
const formatTimeRanges = (hours) => {
  if (!hours || hours.length === 0) return null;
  const sorted = [...hours].sort((a, b) => {
    const na = a === 0 ? 24 : a === 1 ? 25 : a === 2 ? 26 : a === 3 ? 27 : a;
    const nb = b === 0 ? 24 : b === 1 ? 25 : b === 2 ? 26 : b === 3 ? 27 : b;
    return na - nb;
  });
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prevN = prev === 0 ? 24 : prev === 1 ? 25 : prev === 2 ? 26 : prev === 3 ? 27 : prev;
    const curN  = cur  === 0 ? 24 : cur  === 1 ? 25 : cur  === 2 ? 26 : cur  === 3 ? 27 : cur;
    if (curN !== prevN + 1) {
      ranges.push(`${String(start).padStart(2,'0')}:00〜${String(prev === 23 ? 0 : prev + 1).padStart(2,'0')}:00`);
      start = cur;
    }
    prev = cur;
  }
  ranges.push(`${String(start).padStart(2,'0')}:00〜${String(prev === 23 ? 0 : prev + 1).padStart(2,'0')}:00`);
  return ranges.join(' / ');
};

// 全メンバーが共通して参加可能な時間帯を計算
const getCommonHours = (dateStr, members, memberSchedules) => {
  const allHours = members.map(m => {
    const s = memberSchedules[m.id]?.[dateStr];
    return s?.available ? (s.hours || []) : [];
  });
  if (allHours.length === 0) return [];
  return allHours.reduce((acc, hours) => acc.filter(h => hours.includes(h)));
};

export default function ScheduleApp() {
  const [members, setMembers] = useState([
    { id: 1, name: 'メンバーA', summonerName: '', role: 'TOP', color: COLOR_PALETTE[0] },
    { id: 2, name: 'メンバーB', summonerName: '', role: 'JG',  color: COLOR_PALETTE[1] },
    { id: 3, name: 'メンバーC', summonerName: '', role: 'MID', color: COLOR_PALETTE[2] },
    { id: 4, name: 'メンバーD', summonerName: '', role: 'ADC', color: COLOR_PALETTE[3] },
    { id: 5, name: 'メンバーE', summonerName: '', role: 'SUP', color: COLOR_PALETTE[4] },
  ]);

  // memberSchedules[memberId][dateStr] = { available: bool, hours: [18,19,20,...], activityType: 'practice'|'scrim' }
  const [memberSchedules, setMemberSchedules] = useState({});
  const [requiredCount, setRequiredCount] = useState(5);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [currentWeek, setCurrentWeek] = useState(() => {
    const t = new Date(); const d = t.getDay();
    return new Date(t.setDate(t.getDate() - d));
  });

  const [selectedDate, setSelectedDate]   = useState(null);
  const [showSettings, setShowSettings]   = useState(false);
  const [showMembers, setShowMembers]     = useState(false);
  const [activeMember, setActiveMember]   = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [newMember, setNewMember]         = useState({ name: '', summonerName: '', role: 'MID' });
  const [isLoaded, setIsLoaded]           = useState(false);

  // Firebase 読み込み
  useEffect(() => {
    const dataRef = ref(db, 'scheduleData');
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.members)         setMembers(data.members);
        if (data.memberSchedules) setMemberSchedules(data.memberSchedules);
        if (data.requiredCount)   setRequiredCount(data.requiredCount);
      }
      setIsLoaded(true);
    });
  }, []);

  // Firebase 書き込み
  useEffect(() => {
    if (!isLoaded) return;
    set(ref(db, 'scheduleData'), { members, memberSchedules, requiredCount });
  }, [members, memberSchedules, requiredCount, isLoaded]);

  // 日付の参加状況を取得
  const getDateStats = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const participants = members.filter(m => memberSchedules[m.id]?.[dateStr]?.available);
    return { count: participants.length, participants, dateStr };
  };

  const getDateStatus = (date) => {
    const { count } = getDateStats(date);
    if (count >= requiredCount)     return 'perfect';
    if (count === requiredCount - 1) return 'close';
    if (count > 0)                  return 'partial';
    return 'empty';
  };

  const isToday = (date) => new Date().toDateString() === date.toDateString();
  const isPast  = (date) => { const t = new Date(); t.setHours(0,0,0,0); return date < t; };

  const isInCurrentWeek = (date) => {
    const s = new Date(currentWeek); s.setHours(0,0,0,0);
    const e = new Date(currentWeek); e.setDate(e.getDate()+6); e.setHours(23,59,59,999);
    return date >= s && date <= e;
  };

  // 週の日付（過去除外）
  const getWeekDays = () => {
    const days = []; const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeek); d.setDate(currentWeek.getDate()+i); d.setHours(0,0,0,0);
      if (d >= today) days.push(d);
    }
    return days;
  };

  // 月の日付
  const getMonthDays = () => {
    const y = currentMonth.getFullYear(), mo = currentMonth.getMonth();
    const first = new Date(y, mo, 1), last = new Date(y, mo+1, 0);
    const days = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let i = 1; i <= last.getDate(); i++) days.push(new Date(y, mo, i));
    return days;
  };

  const weekDays  = getWeekDays();
  const monthDays = getMonthDays();
  const DAY_LABELS = ['日','月','火','水','木','金','土'];

  // 月の集合可能日・要1人日
  const getMonthSummary = () => {
    const y = currentMonth.getFullYear(), mo = currentMonth.getMonth();
    const last = new Date(y, mo+1, 0).getDate();
    const perfect = [], close = [];
    for (let d = 1; d <= last; d++) {
      const date = new Date(y, mo, d);
      const status = getDateStatus(date);
      if (status === 'perfect') perfect.push(d);
      if (status === 'close')   close.push(d);
    }
    return { perfect, close };
  };

  const { perfect: perfectDates, close: closeDates } = getMonthSummary();

  // メンバー追加
  const addMember = () => {
    if (!newMember.name.trim()) return;
    const newId = Math.max(...members.map(m => m.id), 0) + 1;
    const colorIdx = members.length % COLOR_PALETTE.length;
    setMembers([...members, { id: newId, ...newMember, color: COLOR_PALETTE[colorIdx] }]);
    setMemberSchedules(prev => ({ ...prev, [newId]: {} }));
    setNewMember({ name: '', summonerName: '', role: 'MID' });
  };

  const removeMember = (id) => {
    setMembers(members.filter(m => m.id !== id));
    setMemberSchedules(prev => { const { [id]: _, ...rest } = prev; return rest; });
  };

  const updateMember = (id, updates) => {
    setMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // 日付の参加状況をトグル
  const toggleDateAvailable = (date, memberId) => {
    const dateStr = date.toISOString().split('T')[0];
    setMemberSchedules(prev => {
      const cur = prev[memberId]?.[dateStr];
      return {
        ...prev,
        [memberId]: {
          ...prev[memberId],
          [dateStr]: cur?.available
            ? { ...cur, available: false }
            : { available: true, hours: cur?.hours || [], activityType: cur?.activityType || 'practice' }
        }
      };
    });
  };

  // 時間帯トグル
  const toggleHour = (date, memberId, hour) => {
    const dateStr = date.toISOString().split('T')[0];
    setMemberSchedules(prev => {
      const cur = prev[memberId]?.[dateStr] || { available: true, hours: [], activityType: 'practice' };
      const hours = cur.hours || [];
      return {
        ...prev,
        [memberId]: {
          ...prev[memberId],
          [dateStr]: {
            ...cur,
            hours: hours.includes(hour) ? hours.filter(h => h !== hour) : [...hours, hour]
          }
        }
      };
    });
  };

  // 活動タイプ変更
  const setActivityType = (date, memberId, type) => {
    const dateStr = date.toISOString().split('T')[0];
    setMemberSchedules(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [dateStr]: { ...prev[memberId]?.[dateStr], activityType: type }
      }
    }));
  };

  const formatWeekRange = () => {
    if (weekDays.length === 0) return '今週は終了しました';
    const s = weekDays[0], e = weekDays[weekDays.length-1];
    return `${s.getFullYear()}年${s.getMonth()+1}月 ${s.getDate()} - ${e.getDate()}`;
  };

  const formatMonthYear = () =>
    `${currentMonth.getFullYear()}年 ${currentMonth.getMonth()+1}月`;

  const navigateMonth = (d) => {
    const n = new Date(currentMonth); n.setMonth(n.getMonth()+d); setCurrentMonth(n);
  };
  const navigateWeek = (d) => {
    const n = new Date(currentWeek); n.setDate(n.getDate()+d*7); setCurrentWeek(n);
  };

  // ステータス別スタイル
  const statusStyle = (status, past = false) => {
    if (past) return 'border-white/5 bg-white/[0.02] opacity-40';
    if (status === 'perfect') return 'border-yellow-500/60 bg-gradient-to-br from-yellow-900/30 to-amber-900/20';
    if (status === 'close')   return 'border-amber-400/40 bg-gradient-to-br from-amber-900/20 to-orange-900/10';
    if (status === 'partial') return 'border-blue-400/20 bg-gradient-to-br from-blue-900/10 to-slate-900/10';
    return 'border-white/10 bg-white/[0.03]';
  };

  const progressStyle = (status) => {
    if (status === 'perfect') return 'bg-gradient-to-r from-yellow-400 to-amber-300';
    if (status === 'close')   return 'bg-gradient-to-r from-amber-400 to-orange-400';
    if (status === 'partial') return 'bg-gradient-to-r from-blue-400 to-sky-400';
    return 'bg-slate-700';
  };

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0c14 0%, #0d1117 40%, #0c1020 100%)' }}>
      {/* 装飾背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(180,130,20,0.08) 0%, transparent 70%)' }}></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(20,40,100,0.15) 0%, transparent 70%)' }}></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(120,80,0,0.06) 0%, transparent 70%)' }}></div>
        {/* ゴールドライン装飾 */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(180,130,20,0.4) 50%, transparent 100%)' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto p-4 lg:p-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)', boxShadow: '0 0 20px rgba(180,130,20,0.4)' }}>
              <Sword className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ background: 'linear-gradient(90deg, #ffd700, #fff8dc, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                GG Schedule
              </h1>
              <p className="text-xs text-slate-500 tracking-widest uppercase">League of Legends</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-3 rounded-xl border transition-all ${showMembers ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400'}`}
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-xl border transition-all ${showSettings ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 設定パネル */}
        {showSettings && (
          <div className="mb-6 rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(10,12,20,0.9)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                <Settings className="w-4 h-4" /> 設定
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-5">
              <label className="block text-sm text-slate-400 mb-3">必要参加人数</label>
              <div className="flex gap-2">
                {[2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => setRequiredCount(n)}
                    className={`flex-1 py-2.5 rounded-lg font-bold transition-all ${requiredCount === n ? 'text-black' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}
                    style={requiredCount === n ? { background: 'linear-gradient(135deg, #b8860b, #ffd700)' } : {}}
                  >{n}人</button>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-slate-500 mb-2">サポート</p>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-400 text-sm hover:bg-white/10 transition-all">
                  🐛 不具合報告
                </button>
                <button className="flex-1 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-400 text-sm hover:bg-white/10 transition-all">
                  💡 ご意見・ご要望
                </button>
              </div>
            </div>
          </div>
        )}

        {/* メンバーパネル */}
        {showMembers && (
          <div className="mb-6 rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(10,12,20,0.9)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> メンバー ({members.length}人)
              </h3>
              <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {members.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>メンバーを登録してください</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {members.map(member => {
                const role = ROLES.find(r => r.id === member.role);
                const isEditing = editingMember === member.id;
                return (
                  <div key={member.id}
                    onClick={() => !isEditing && setActiveMember(activeMember === member.id ? null : member.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${activeMember === member.id && !isEditing ? 'ring-2 ring-yellow-500/50 border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    {isEditing ? (
                      <div onClick={e => e.stopPropagation()} className="space-y-2">
                        <input
                          value={member.name}
                          onChange={e => updateMember(member.id, { name: e.target.value })}
                          placeholder="名前"
                          className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                        />
                        <input
                          value={member.summonerName}
                          onChange={e => updateMember(member.id, { summonerName: e.target.value })}
                          placeholder="サモナーネーム"
                          className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                        />
                        <div className="flex gap-1 flex-wrap">
                          {ROLES.map(r => (
                            <button key={r.id} onClick={() => updateMember(member.id, { role: r.id })}
                              className={`px-2 py-1 rounded text-xs font-bold transition-all ${member.role === r.id ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300' : 'bg-white/5 border border-white/10 text-slate-400'}`}
                            >{r.icon} {r.label}</button>
                          ))}
                        </div>
                        <button onClick={() => setEditingMember(null)}
                          className="w-full py-1 rounded-lg text-xs text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10"
                        >保存</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">{member.name}</div>
                            {member.summonerName && <div className="text-xs text-slate-400">{member.summonerName}</div>}
                            <div className="text-xs text-slate-500">{role?.icon} {role?.label}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); setEditingMember(member.id); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                          ><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={e => { e.stopPropagation(); removeMember(member.id); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          ><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* メンバー追加フォーム */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex gap-2">
                <input
                  value={newMember.name}
                  onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                  onKeyPress={e => e.key === 'Enter' && addMember()}
                  placeholder="メンバー名"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-yellow-500/50"
                />
                <input
                  value={newMember.summonerName}
                  onChange={e => setNewMember(p => ({ ...p, summonerName: e.target.value }))}
                  placeholder="サモナーネーム"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-yellow-500/50"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex gap-1 flex-1 flex-wrap">
                  {ROLES.map(r => (
                    <button key={r.id} onClick={() => setNewMember(p => ({ ...p, role: r.id }))}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${newMember.role === r.id ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}
                    >{r.icon} {r.label}</button>
                  ))}
                </div>
                <button onClick={addMember}
                  className="px-4 py-1.5 rounded-xl font-bold text-black text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #b8860b, #ffd700)' }}
                ><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {activeMember && (
              <div className="mt-4 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-sm text-yellow-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <strong>{members.find(m => m.id === activeMember)?.name}</strong> を編集中 - カレンダーで日付をクリック
              </div>
            )}
          </div>
        )}

        {/* 月カレンダー */}
        <div className="mb-8 rounded-2xl border border-white/10 p-5 lg:p-6" style={{ background: 'rgba(10,12,20,0.8)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Month</div>
              <h2 className="text-xl font-bold">{formatMonthYear()}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs">今月</button>
              <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className={`text-center text-xs font-medium py-1.5 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date, idx) => {
              if (!date) return <div key={`e-${idx}`} className="aspect-square" />;
              const stats    = getDateStats(date);
              const status   = getDateStatus(date);
              const today    = isToday(date);
              const past     = isPast(date);
              const inWeek   = isInCurrentWeek(date);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const commonHours = getCommonHours(stats.dateStr, stats.participants, memberSchedules);

              return (
                <div key={date.toISOString()}
                  onClick={() => {
                    if (past) return;
                    if (activeMember) {
                      toggleDateAvailable(date, activeMember);
                    } else {
                      setSelectedDate(isSelected ? null : date);
                      const w = new Date(date); w.setDate(date.getDate() - date.getDay()); setCurrentWeek(w);
                    }
                  }}
                  className={`rounded-xl border-2 cursor-pointer transition-all overflow-hidden p-1.5 ${statusStyle(status, past)} ${isSelected ? 'ring-2 ring-yellow-500/60' : past ? '' : 'hover:border-white/20'} ${today ? 'ring-2 ring-yellow-400/60' : ''} ${inWeek && !today && !past ? 'ring-1 ring-white/20' : ''}`}
                  style={{ aspectRatio: '1' }}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex items-start justify-between">
                      <span className={`text-xs font-bold ${past ? 'text-slate-600' : today ? 'text-yellow-300' : 'text-slate-300'}`}>
                        {date.getDate()}
                      </span>
                      {status === 'perfect' && !past && <span className="text-yellow-400 text-[10px]">✓</span>}
                      {status === 'close'   && !past && <span className="text-amber-400 text-[10px]">!</span>}
                    </div>

                    {/* 参加者アイコン */}
                    {stats.participants.length > 0 && !past && (
                      <div className="flex flex-wrap gap-0.5">
                        {stats.participants.slice(0, 4).map(m => (
                          <div key={m.id} className={`w-4 h-4 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold border border-black/20`} style={{ fontSize: '7px' }}>
                            {m.name.charAt(0)}
                          </div>
                        ))}
                        {stats.participants.length > 4 && (
                          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-slate-400" style={{ fontSize: '7px' }}>
                            +{stats.participants.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 共通時間帯（集合可能な日のみ） */}
                    {status === 'perfect' && commonHours.length > 0 && !past && (
                      <div className="text-yellow-400/80 leading-tight" style={{ fontSize: '6px' }}>
                        {formatTimeRanges(commonHours)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* サマリー */}
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <CheckCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span className="text-xs text-yellow-300 font-medium">集合可能</span>
              <span className="text-sm font-bold text-yellow-300">{perfectDates.length}<span className="text-xs font-normal text-yellow-400/70">日</span></span>
              {perfectDates.length > 0 && <span className="text-xs text-yellow-200/70">({perfectDates.join(', ')})</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300 font-medium">あと1人</span>
              <span className="text-sm font-bold text-amber-300">{closeDates.length}<span className="text-xs font-normal text-amber-400/70">日</span></span>
              {closeDates.length > 0 && <span className="text-xs text-amber-200/70">({closeDates.join(', ')})</span>}
            </div>
          </div>
        </div>

        {/* 週ビュー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Week</div>
              <h2 className="text-xl font-bold">{formatWeekRange()}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigateWeek(-1)} className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => { const t = new Date(); setCurrentWeek(new Date(t.setDate(t.getDate()-t.getDay()))); }} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs">今週</button>
              <button onClick={() => navigateWeek(1)} className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {weekDays.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-white/10 p-12 text-center">
              <p className="text-slate-400 mb-3">この週はすべて過去の日です</p>
              <button onClick={() => navigateWeek(1)} className="px-4 py-2 rounded-xl text-sm border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 transition-all">次の週を見る →</button>
            </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${weekDays.length >= 5 ? 'lg:grid-cols-7' : weekDays.length === 4 ? 'lg:grid-cols-4' : weekDays.length === 3 ? 'lg:grid-cols-3' : weekDays.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
              {weekDays.map(date => {
                const stats   = getDateStats(date);
                const status  = getDateStatus(date);
                const today   = isToday(date);
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const isWeekend  = date.getDay() === 0 || date.getDay() === 6;
                const commonHours = getCommonHours(stats.dateStr, stats.participants, memberSchedules);

                return (
                  <div key={date.toISOString()}
                    onClick={() => {
                      if (activeMember) {
                        toggleDateAvailable(date, activeMember);
                      } else {
                        setSelectedDate(isSelected ? null : date);
                      }
                    }}
                    className={`relative rounded-2xl border-2 cursor-pointer transition-all overflow-hidden min-h-[220px] ${statusStyle(status)} ${isSelected ? 'ring-2 ring-yellow-500/60' : 'hover:border-white/20'} ${today ? 'ring-2 ring-yellow-400/50' : ''}`}
                  >
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-xs font-medium uppercase tracking-wider ${isWeekend ? (date.getDay() === 0 ? 'text-rose-400' : 'text-blue-400') : 'text-slate-500'}`}>{DAY_LABELS[date.getDay()]}</div>
                          <div className="text-3xl font-bold mt-0.5">{date.getDate()}</div>
                        </div>
                        {today && (
                          <div className="px-2 py-1 rounded-full text-black text-xs font-bold" style={{ background: 'linear-gradient(135deg, #b8860b, #ffd700)' }}>TODAY</div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${status === 'perfect' ? 'text-yellow-300' : status === 'close' ? 'text-amber-300' : status === 'partial' ? 'text-blue-300' : 'text-slate-500'}`}>
                          {status === 'perfect' && '⚔️ 集合可能'}
                          {status === 'close'   && '⚠️ 要1人'}
                          {status === 'partial' && '部分参加'}
                          {status === 'empty'   && '未入力'}
                        </span>
                        <span className="text-xl font-bold">{stats.count}<span className="text-xs font-normal text-slate-500">/{requiredCount}</span></span>
                      </div>

                      {/* 参加者アイコン */}
                      <div className="flex flex-wrap gap-1.5">
                        {members.map(m => {
                          const participating = memberSchedules[m.id]?.[stats.dateStr]?.available;
                          const memberHours = memberSchedules[m.id]?.[stats.dateStr]?.hours || [];
                          const role = ROLES.find(r => r.id === m.role);
                          return (
                            <div key={m.id} title={`${m.name} ${role?.icon}${role?.label}${m.summonerName ? ` / ${m.summonerName}` : ''}`}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${participating ? `bg-gradient-to-br ${m.color} text-white border-white/20 shadow-lg` : 'bg-slate-800/50 text-slate-600 border-slate-700/50'}`}
                            >
                              {m.name.charAt(0)}
                            </div>
                          );
                        })}
                      </div>

                      {/* 共通参加可能時間 */}
                      {commonHours.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-yellow-400/70 shrink-0" />
                          <span className="text-xs text-yellow-300/80">{formatTimeRanges(commonHours)}</span>
                        </div>
                      )}

                      {/* 活動タイプ（集合可能な場合） */}
                      {status === 'perfect' && (
                        <div className="flex gap-1">
                          {ACTIVITY_TYPES.map(type => {
                            const count = stats.participants.filter(m => memberSchedules[m.id]?.[stats.dateStr]?.activityType === type.id).length;
                            if (count === 0) return null;
                            return (
                              <span key={type.id} className={`px-2 py-0.5 rounded-full text-xs border ${type.color}`}>
                                {type.label} {count}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 進捗バー */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                      <div className={`h-full transition-all ${progressStyle(status)}`} style={{ width: `${Math.min((stats.count / requiredCount) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 日付詳細パネル（フローティング） */}
        {selectedDate && !activeMember && (
          <div className="fixed inset-x-4 bottom-4 lg:inset-x-auto lg:right-8 lg:bottom-8 lg:w-[420px] rounded-2xl border border-white/20 p-5 shadow-2xl z-50"
            style={{ background: 'rgba(10,12,20,0.97)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-slate-500">{DAY_LABELS[selectedDate.getDay()]}曜日</div>
                <h3 className="text-lg font-bold">{selectedDate.getMonth()+1}月{selectedDate.getDate()}日</h3>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 rounded-lg hover:bg-white/10 transition-all text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {members.map(member => {
                const dateStr   = selectedDate.toISOString().split('T')[0];
                const schedule  = memberSchedules[member.id]?.[dateStr];
                const isAvail   = schedule?.available;
                const hours     = schedule?.hours || [];
                const actType   = schedule?.activityType || 'practice';
                const role      = ROLES.find(r => r.id === member.role);

                return (
                  <div key={member.id} className={`rounded-xl border transition-all ${isAvail ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                    {/* メンバーヘッダー */}
                    <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleDateAvailable(selectedDate, member.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-slate-500">{role?.icon} {role?.label}{member.summonerName ? ` / ${member.summonerName}` : ''}</div>
                        </div>
                      </div>
                      {isAvail
                        ? <CheckCircle className="w-5 h-5 text-yellow-400" />
                        : <div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>
                      }
                    </div>

                    {/* 時間帯・活動タイプ（参加可能な場合のみ） */}
                    {isAvail && (
                      <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                        {/* 活動タイプ */}
                        <div className="flex gap-2">
                          {ACTIVITY_TYPES.map(type => (
                            <button key={type.id} onClick={() => setActivityType(selectedDate, member.id, type.id)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${actType === type.id ? type.color : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                            >{type.label}</button>
                          ))}
                        </div>

                        {/* 時間帯選択 */}
                        <div className="space-y-1.5">
                          {TIME_GROUPS.map(group => (
                            <div key={group.label} className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500 w-6 shrink-0">{group.label}</span>
                              <div className="flex gap-1 flex-wrap">
                                {group.hours.map(h => (
                                  <button key={h} onClick={() => toggleHour(selectedDate, member.id, h)}
                                    className={`w-7 h-7 rounded text-xs font-medium transition-all ${hours.includes(h) ? 'text-black font-bold' : 'bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10'}`}
                                    style={hours.includes(h) ? { background: 'linear-gradient(135deg, #b8860b, #ffd700)' } : {}}
                                  >{h}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {hours.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <Clock className="w-3 h-3 text-yellow-400/70" />
                            <span className="text-xs text-yellow-300/80">{formatTimeRanges(hours)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 空の状態ガイド */}
        {members.length > 0 && Object.keys(memberSchedules).length === 0 && isLoaded && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm flex items-center gap-2 shadow-lg">
            <span>⚔️</span>
            <span>メンバーを選択してカレンダーで参加日を登録しよう</span>
          </div>
        )}
      </div>
    </div>
  );
}
