import React, { useState, useEffect } from 'react';
import { Calendar, Users, Plus, Trash2, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight, Settings, Sparkles } from 'lucide-react';

export default function ScheduleApp() {
  const colorPalette = [
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-lime-400 to-green-500',
    'from-cyan-400 to-blue-500',
  ];

  const [members, setMembers] = useState([
    { id: 1, name: 'メンバーA', color: colorPalette[0] },
    { id: 2, name: 'メンバーB', color: colorPalette[1] },
    { id: 3, name: 'メンバーC', color: colorPalette[2] },
    { id: 4, name: 'メンバーD', color: colorPalette[3] },
    { id: 5, name: 'メンバーE', color: colorPalette[4] },
  ]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    return new Date(today.setDate(today.getDate() - day));
  });

  const [memberDates, setMemberDates] = useState({});
  const [requiredCount, setRequiredCount] = useState(5);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [activeMember, setActiveMember] = useState(null);

  useEffect(() => {
    const initial = {};
    members.forEach(m => {
      initial[m.id] = memberDates[m.id] || [];
    });
    setMemberDates(initial);
  }, []);

  const toggleDate = (date, memberId) => {
    const dateStr = date.toISOString().split('T')[0];
    setMemberDates(prev => {
      const current = prev[memberId] || [];
      const exists = current.includes(dateStr);
      return {
        ...prev,
        [memberId]: exists
          ? current.filter(d => d !== dateStr)
          : [...current, dateStr]
      };
    });
  };

  const getDateStats = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const participants = members.filter(m => 
      memberDates[m.id]?.includes(dateStr)
    );
    return { count: participants.length, participants };
  };

  const addMember = () => {
    if (newMemberName.trim()) {
      const newId = Math.max(...members.map(m => m.id), 0) + 1;
      const colorIdx = members.length % colorPalette.length;
      setMembers([...members, { 
        id: newId, 
        name: newMemberName, 
        color: colorPalette[colorIdx] 
      }]);
      setMemberDates(prev => ({ ...prev, [newId]: [] }));
      setNewMemberName('');
    }
  };

  const removeMember = (id) => {
    setMembers(members.filter(m => m.id !== id));
    const { [id]: _, ...rest } = memberDates;
    setMemberDates(rest);
  };

  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeek);
      day.setDate(currentWeek.getDate() + i);
      day.setHours(0, 0, 0, 0);
      if (day >= today) {
        days.push(day);
      }
    }
    return days;
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  const getDateStatus = (date) => {
    const stats = getDateStats(date);
    if (stats.count >= requiredCount) return 'perfect';
    if (stats.count === requiredCount - 1) return 'close';
    if (stats.count > 0) return 'partial';
    return 'empty';
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isInCurrentWeek = (date) => {
    const start = new Date(currentWeek);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentWeek);
    end.setDate(currentWeek.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  const formatMonthYear = () => {
    return `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`;
  };

  const formatWeekRange = () => {
    if (weekDays.length === 0) return '今週は終了しました';
    const start = weekDays[0];
    const end = weekDays[weekDays.length - 1];
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + direction * 7);
    setCurrentWeek(newDate);
  };

  const getMonthMatchingDates = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const perfect = [];
    const close = [];
    
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const stats = getDateStats(date);
      if (stats.count >= requiredCount) {
        perfect.push(d);
      } else if (stats.count === requiredCount - 1) {
        close.push(d);
      }
    }
    
    return { perfect, close };
  };

  const { perfect: perfectDates, close: closeDates } = getMonthMatchingDates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Schedule</h1>
              <p className="text-sm text-slate-400">みんなの集まれる日を見つけよう</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs text-slate-400"
              title="必要人数を変更"
            >
              <span>必要 <span className="text-white font-semibold">{requiredCount}</span>人</span>
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-3 rounded-xl border transition-all ${
                showMembers
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-xl border transition-all ${
                showSettings
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                設定
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                必要参加人数
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setRequiredCount(n)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                      requiredCount === n
                        ? 'bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg shadow-violet-500/30'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {n}人
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showMembers && (
          <div className="mb-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Users className="w-4 h-4" />
                メンバー ({members.length}人)
              </h3>
              <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setActiveMember(activeMember === member.id ? null : member.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all ${
                    activeMember === member.id
                      ? 'ring-2 ring-violet-400 bg-white/10'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center font-bold text-white shadow-lg`}>
                        {member.name.charAt(member.name.length - 1)}
                      </div>
                      <div>
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-xs text-slate-400">
                          {(memberDates[member.id] || []).length}日入力済み
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMember(member.id);
                      }}
                      className="text-slate-400 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMember()}
                placeholder="新しいメンバーを追加..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400 focus:bg-white/10 transition-all"
              />
              <button
                onClick={addMember}
                className="px-5 py-3 bg-gradient-to-br from-violet-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {activeMember && (
              <div className="mt-4 p-3 bg-violet-500/20 border border-violet-500/30 rounded-xl text-sm text-violet-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <strong>{members.find(m => m.id === activeMember)?.name}</strong> を編集中 - カレンダーで日付をクリック
              </div>
            )}
          </div>
        )}

        {/* 月ビュー */}
        <div className="mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Month</div>
              <h2 className="text-xl lg:text-2xl font-bold">{formatMonthYear()}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                }}
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium"
              >
                今月
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayLabels.map((day, idx) => (
              <div key={day} className={`text-center text-xs font-medium uppercase tracking-wider py-2 ${
                idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-blue-400' : 'text-slate-400'
              }`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="aspect-square"></div>;

              const stats = getDateStats(date);
              const status = getDateStatus(date);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const today = isToday(date);
              const inWeek = isInCurrentWeek(date);

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => {
                    if (activeMember) {
                      toggleDate(date, activeMember);
                    } else {
                      setSelectedDate(isSelected ? null : date);
                      const newWeek = new Date(date);
                      newWeek.setDate(date.getDate() - date.getDay());
                      setCurrentWeek(newWeek);
                    }
                  }}
                  className={`aspect-square rounded-2xl border-2 cursor-pointer transition-all overflow-hidden p-2 ${
                    status === 'perfect' ? 'border-emerald-400/50 bg-gradient-to-br from-emerald-500/20 to-teal-600/20' :
                    status === 'close' ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-orange-600/20' :
                    status === 'partial' ? 'border-blue-400/30 bg-gradient-to-br from-blue-500/10 to-violet-600/10' :
                    'border-white/10 bg-white/5'
                  } ${isSelected ? 'ring-2 ring-violet-400' : 'hover:border-white/30'} ${
                    today ? 'ring-2 ring-violet-400/50' : ''
                  } ${inWeek && !today ? 'ring-1 ring-white/30' : ''}`}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-bold">{date.getDate()}</div>
                      {status === 'close' && <AlertCircle className="w-3 h-3 text-amber-400" />}
                      {status === 'perfect' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <div className="flex items-end justify-between">
                      <div className={`text-2xl font-bold ${
                        status === 'perfect' ? 'text-emerald-300' :
                        status === 'close' ? 'text-amber-300' :
                        status === 'partial' ? 'text-blue-300' :
                        'text-slate-600'
                      }`}>
                        {stats.count}
                      </div>
                      <div className="text-xs text-slate-500">/{requiredCount}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* コンパクト統計 */}
          <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">集合可能</span>
                <span className="text-sm font-bold text-emerald-300">
                  {perfectDates.length}<span className="text-xs font-normal text-emerald-400/70">日</span>
                </span>
              </div>
              {perfectDates.length > 0 && (
                <span className="text-xs text-emerald-200/80">
                  ({perfectDates.join(', ')})
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 shrink-0">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-300 font-medium">あと1人</span>
                <span className="text-sm font-bold text-amber-300">
                  {closeDates.length}<span className="text-xs font-normal text-amber-400/70">日</span>
                </span>
              </div>
              {closeDates.length > 0 && (
                <span className="text-xs text-amber-200/80">
                  ({closeDates.join(', ')})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 週ビュー */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Week</div>
              <h2 className="text-xl lg:text-2xl font-bold">{formatWeekRange()}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const day = today.getDay();
                  setCurrentWeek(new Date(today.setDate(today.getDate() - day)));
                }}
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium"
              >
                今週
              </button>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {weekDays.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
              <div className="text-slate-400 mb-2">この週はすべて過去の日です</div>
              <button
                onClick={() => navigateWeek(1)}
                className="mt-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 text-sm hover:bg-violet-500/30 transition-all"
              >
                次の週を見る →
              </button>
            </div>
          ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
            weekDays.length >= 5 ? 'lg:grid-cols-7' :
            weekDays.length === 4 ? 'lg:grid-cols-4' :
            weekDays.length === 3 ? 'lg:grid-cols-3' :
            weekDays.length === 2 ? 'lg:grid-cols-2' :
            'lg:grid-cols-1'
          }`}>
            {weekDays.map((date) => {
              const stats = getDateStats(date);
              const status = getDateStatus(date);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const today = isToday(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => {
                    if (activeMember) {
                      toggleDate(date, activeMember);
                    } else {
                      setSelectedDate(isSelected ? null : date);
                    }
                  }}
                  className={`relative rounded-3xl border-2 cursor-pointer transition-all overflow-hidden min-h-[200px] lg:min-h-[240px] ${
                    status === 'perfect' ? 'border-emerald-400/50 bg-gradient-to-br from-emerald-500/20 to-teal-600/20' :
                    status === 'close' ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-orange-600/20' :
                    status === 'partial' ? 'border-blue-400/30 bg-gradient-to-br from-blue-500/10 to-violet-600/10' :
                    'border-white/10 bg-white/5'
                  } ${isSelected ? 'ring-2 ring-violet-400' : 'hover:border-white/30'} ${
                    today ? 'ring-2 ring-violet-400/50' : ''
                  }`}
                >
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-xs font-medium uppercase tracking-wider ${
                          isWeekend ? (date.getDay() === 0 ? 'text-rose-400' : 'text-blue-400') : 'text-slate-400'
                        }`}>
                          {dayLabels[date.getDay()]}
                        </div>
                        <div className="text-3xl font-bold mt-1">{date.getDate()}</div>
                      </div>
                      {today && (
                        <div className="px-2 py-1 rounded-full bg-violet-500 text-white text-xs font-semibold">
                          TODAY
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-sm font-bold ${
                        status === 'perfect' ? 'text-emerald-300' :
                        status === 'close' ? 'text-amber-300' :
                        status === 'partial' ? 'text-blue-300' :
                        'text-slate-500'
                      }`}>
                        {status === 'perfect' && '✓ 集合可能'}
                        {status === 'close' && '⚠ 要1人'}
                        {status === 'partial' && '部分参加'}
                        {status === 'empty' && '未入力'}
                      </div>
                      <div className="text-2xl font-bold">
                        {stats.count}<span className="text-sm font-normal text-slate-400">/{requiredCount}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {members.map(m => {
                        const isParticipating = memberDates[m.id]?.includes(date.toISOString().split('T')[0]);
                        return (
                          <div
                            key={m.id}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                              isParticipating
                                ? `bg-gradient-to-br ${m.color} text-white border-white/20 shadow-lg`
                                : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                            }`}
                            title={m.name}
                          >
                            {m.name.charAt(m.name.length - 1)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                    <div 
                      className={`h-full transition-all ${
                        status === 'perfect' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
                        status === 'close' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                        status === 'partial' ? 'bg-gradient-to-r from-blue-400 to-violet-400' :
                        'bg-slate-700'
                      }`}
                      style={{ width: `${Math.min((stats.count / requiredCount) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {selectedDate && !activeMember && (
          <div className="fixed inset-x-4 bottom-4 lg:inset-x-auto lg:right-8 lg:bottom-8 lg:w-96 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl shadow-black/50 z-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-slate-400">{dayLabels[selectedDate.getDay()]}曜日</div>
                <h3 className="text-xl font-bold">
                  {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                </h3>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {members.map(member => {
                const isParticipating = memberDates[member.id]?.includes(selectedDate.toISOString().split('T')[0]);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleDate(selectedDate, member.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isParticipating
                        ? 'bg-emerald-500/20 border-emerald-500/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center font-bold text-white shadow-lg`}>
                        {member.name.charAt(member.name.length - 1)}
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                    {isParticipating && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
