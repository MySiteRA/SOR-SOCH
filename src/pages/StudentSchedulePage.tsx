import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, MapPin, User as UserIcon, MoreVertical, Trash2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { getLatestScheduleForClass, checkStudentKeyValidity } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Student } from '../lib/supabase';

interface ScheduleItem {
  id: string;
  class_id: string;
  day_of_week: string;
  lesson_number: number;
  subject: string;
  teacher: string;
  room: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function StudentSchedulePage() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleFileUrl, setScheduleFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'], []);
  const [selectedDay, setSelectedDay] = useState<string>('Понедельник');



  const validateStudentKey = useCallback(async (studentId: string) => {
    try {
      const isValid = await checkStudentKeyValidity(studentId);
      
      if (!isValid) {
        // Ключ больше не валиден, принудительно разлогиниваем
        localStorage.removeItem('studentDashboardData');
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.setItem('skipAutoLogin', 'true');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error validating student key:', error);
      // В случае ошибки проверки, не разлогиниваем
    }
  }, [navigate]);

  const loadSchedule = async (classId: string) => {
    try {
      setLoading(true);

      const { data, error: scheduleError } = await supabase
        .from('schedule')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week')
        .order('lesson_number');

      if (scheduleError) throw scheduleError;

      setSchedule(data || []);

      // Fetch the latest schedule file URL
      try {
        const scheduleFile = await getLatestScheduleForClass(classId);
        setScheduleFileUrl(scheduleFile?.public_url || null);
      } catch (error) {
        console.warn('Could not load schedule file URL:', error);
        setScheduleFileUrl(null);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Determine today's day to select by default
    const dayIndex = new Date().getDay();
    // 0 = Sunday, 1 = Monday. We map to array index (Monday=0)
    if (dayIndex >= 1 && dayIndex <= 6) {
      setSelectedDay(days[dayIndex - 1]);
    } else {
      setSelectedDay(days[0]); // Default to Monday on Sunday
    }
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);
      
      // Проверяем валидность ключа студента
      validateStudentKey(data.student.id);
      
      loadSchedule(data.student.class_id);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate, days, validateStudentKey]);

  const getScheduleForDay = (day: string) => {
    return schedule
      .filter(item => item.day_of_week === day)
      .sort((a, b) => a.lesson_number - b.lesson_number);
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Убираем секунды
  };

  const handleForgetSession = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/student-profile');
  };

  const handleChatClick = () => {
    navigate('/student-chat');
  };

  if (!studentData) {
    return (
      <div className="min-h-screen pb-24 md:pb-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/student-dashboard')}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
              <div>
                 <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">
                   Расписание
                 </h1>
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                    {studentData.className}
                 </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </motion.button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-100 shadow-premium glass" asChild>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <DropdownMenuItem onClick={handleProfileClick} className="p-3 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-600 flex items-center font-bold">
                      <UserIcon className="w-4 h-4 mr-3" />
                      Профиль
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleChatClick} className="p-3 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-600 flex items-center font-bold">
                      <MessageCircle className="w-4 h-4 mr-3 text-blue-500" />
                      Чат класса
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleForgetSession} className="p-3 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-600 flex items-center font-bold">
                      <Trash2 className="w-4 h-4 mr-3" />
                      Забыть сеанс
                    </DropdownMenuItem>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl animate-card-appear">
        {/* Day Selector - Modern Bento Style */}
        <div className="premium-card p-2 mb-8 flex overflow-x-auto hide-scrollbar scroll-smooth">
          <div className="flex space-x-2 w-full min-w-max">
            {days.map((day) => {
              const dayIndex = new Date().getDay();
              const isTodayStr = dayIndex >= 1 && dayIndex <= 6 && days[dayIndex - 1] === day;
              const isSelected = selectedDay === day;
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative overflow-hidden group min-w-[120px] ${
                    isSelected 
                    ? 'bg-indigo-600 text-white shadow-lg scale-105 z-10' 
                    : 'bg-white text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className="relative z-10">{day}</span>
                  {isTodayStr && (
                    <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'} animate-pulse`}></div>
                  )}
                  {isSelected && (
                    <motion.div 
                      layoutId="activeDay"
                      className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

<<<<<<< HEAD
        {/* Schedule Grid */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="wait">
            {getScheduleForDay(selectedDay).length > 0 ? (
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {getScheduleForDay(selectedDay).map((lesson, idx) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="premium-card p-5 group flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-50 hover:border-indigo-100 transition-all duration-500"
                  >
                    <div className="flex items-center space-x-6 w-full sm:w-auto">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-black text-slate-800 shadow-inner group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500">
                        {lesson.lesson_number}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-all">
                          {lesson.subject}
                        </h3>
                        <div className="flex flex-wrap gap-4 mt-2">
                          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-bold uppercase">
                            <UserIcon className="w-3.5 h-3.5" />
                            <span>{lesson.teacher}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-bold uppercase">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{lesson.room}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                       <div className="flex-1 sm:flex-none px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-500 text-center">
                          <div className="text-sm font-black text-slate-700 group-hover:text-white transition-colors">
                            {formatTime(lesson.start_time)} — {formatTime(lesson.end_time)}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-100 transition-colors">
                            Время урока
                          </div>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="premium-card p-20 text-center"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Нет занятий</h3>
                <p className="text-slate-400 font-bold">В этот день уроки не запланированы</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Download Schedule Action */}
        {scheduleFileUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
          >
            <a
              href={scheduleFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-6 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200 group transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                   <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                   <h3 className="text-lg font-black leading-none mb-1">Файл расписания</h3>
                   <p className="text-white/70 text-xs font-bold uppercase tracking-wider">PDF • Изображение</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                 <ArrowRight className="w-6 h-6" />
              </div>
            </a>
=======
        {/* Current Lesson Status */}
        {schedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-slate-200 p-6 mb-8 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2">
              <Timer className="w-5 h-5 text-blue-600" />
              <span>Текущий урок</span>
            </h2>
            
            {currentLesson.isFinished ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Занятия закончились</h3>
                <p className="text-slate-600">Хорошего дня!</p>
              </div>
            ) : currentLesson.isBreak ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Перемена</h3>
                {currentLesson.next && (
                  <>
                    <p className="text-slate-600 mb-4 text-sm">Следующий урок:</p>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 inline-block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-900 font-semibold">{currentLesson.next.subject}</span>
                        <span className="text-sm text-blue-700 ml-4">
                          {formatTime(currentLesson.next.start_time)} - {formatTime(currentLesson.next.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-blue-700 mb-3">
                        <span>{currentLesson.next.teacher}</span>
                        <span>•</span>
                        <span>{currentLesson.next.room}</span>
                      </div>
                      <div className="text-center">
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 text-sm">
                          <Timer className="w-4 h-4" />
                          <span className="font-mono font-bold">
                            {String(currentLesson.timeUntilNext.hours).padStart(2, '0')}:
                            {String(currentLesson.timeUntilNext.minutes).padStart(2, '0')}:
                            {String(currentLesson.timeUntilNext.seconds).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : currentLesson.current ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-5 border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-900">
                      {currentLesson.current.subject}
                    </h3>
                    <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                      Урок {currentLesson.current.lesson_number}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-blue-800">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{currentLesson.current.teacher}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-800">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{currentLesson.current.room}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-800">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">
                        {formatTime(currentLesson.current.start_time)} - {formatTime(currentLesson.current.end_time)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2">
                      <Timer className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-mono text-xl font-bold">
                          {String(currentLesson.timeLeft.hours).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.minutes).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-xs text-blue-100">осталось</div>
                      </div>
                    </div>
                  </div>
                </div>

                {currentLesson.next && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Следующий урок:</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-800 font-medium text-sm">{currentLesson.next.subject}</span>
                      <span className="text-xs text-slate-600">
                        {formatTime(currentLesson.next.start_time)} - {formatTime(currentLesson.next.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-600">
                      <span>{currentLesson.next.teacher}</span>
                      <span>•</span>
                      <span>{currentLesson.next.room}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Сегодня уроков нет</h3>
                <p className="text-slate-600 text-sm">Расписание не загружено или выходной</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Weekly Schedule 3D */}
        {schedule.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm"
          >
            <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Расписание не загружено</h3>
            <p className="text-slate-600 text-sm">Обратитесь к администратору</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Расписание на неделю</h2>
              {scheduleFileUrl && (
                <motion.a
                  href={scheduleFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Скачать</span>
                </motion.a>
              )}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {days.map((day, dayIndex) => {
                const daySchedule = getScheduleForDay(day);
                const today = new Date();
                const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                const currentDayName = dayNames[today.getDay()];
                const isToday = day === currentDayName;

                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: 20, rotateX: -10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: dayIndex * 0.05 }}
                    whileHover={{ y: -8, rotateX: 5 }}
                    className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                      isToday
                        ? 'border-emerald-400 shadow-2xl shadow-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50'
                        : 'border-slate-200 shadow-lg hover:shadow-xl bg-white'
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                  >
                    {/* Header */}
                    <div className={`px-4 py-4 ${
                      isToday
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">{day}</h3>
                        {isToday && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-3 h-3 bg-white rounded-full shadow-lg"
                          />
                        )}
                      </div>
                      {isToday && (
                        <p className="text-xs text-emerald-100 mt-1 font-semibold">Сегодня</p>
                      )}
                    </div>

                    {/* Lessons */}
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {daySchedule.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-sm">Нет уроков</p>
                        </div>
                      ) : (
                        daySchedule.map((lesson, idx) => (
                          <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`rounded-lg p-3 backdrop-blur-sm border transition-all ${
                              isToday
                                ? 'bg-emerald-100/50 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-bold text-sm text-slate-900 line-clamp-2">
                                  {lesson.subject}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Урок {lesson.lesson_number}
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ml-2 ${
                                isToday
                                  ? 'bg-emerald-200 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {formatTime(lesson.start_time)}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 text-xs text-slate-600">
                              <div className="truncate">👨‍🏫 {lesson.teacher}</div>
                              <div className="truncate">📍 {lesson.room}</div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className={`px-4 py-2 border-t text-center text-xs font-medium ${
                      isToday
                        ? 'bg-emerald-50/50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50/50 text-slate-600 border-slate-200'
                    }`}>
                      {daySchedule.length} уроков
                    </div>
                  </motion.div>
                );
              })}
            </div>
>>>>>>> d2b6ecfc1857db7139edc3caa4e6c1693abf4fdc
          </motion.div>
        )}
      </div>
    </div>
  );
}