import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, MoreVertical, LogOut, Trash2, User as UserIcon, Calendar, MessageCircle, Gamepad2, Timer, Clock, User, MapPin, ArrowRight, Menu, X, Home, Award } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import StudentAvatar from '../components/StudentAvatar';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { useRealtimeLessonTimer } from '../hooks/useRealtimeLessonTimer';
import { supabase } from '../lib/supabase';
import { checkStudentKeyValidity } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Student } from '../lib/supabase';

export default function StudentDashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Используем предзагруженные данные
  const { data: preloadedData } = usePreloadedData();

  // Используем хук для реального времени урока
  const currentLesson = useRealtimeLessonTimer({
    classId: studentData?.student.class_id || '',
    schedule
  });

  useEffect(() => {
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
  }, [navigate]);

  const validateStudentKey = async (studentId: string) => {
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
  };

  const loadSchedule = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week')
        .order('lesson_number');

      if (error) throw error;
      setSchedule(data || []);
    } catch (err) {
      console.error('Error loading schedule:', err);
    }
  };

  const handleLogout = () => {
    // НЕ удаляем данные сеанса при обычном выходе
    localStorage.removeItem('studentDashboardData');
    navigate('/', { replace: true });
  };

  const handleForgetSession = () => {
    // Полностью удаляем сеанс только при явном действии "забыть сеанс"
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/student-profile');
  };

  const handleScheduleClick = () => {
    navigate('/student-schedule');
  };

  const handleChatClick = () => {
    navigate('/student-chat');
  };

  const handleGamesClick = () => {
    navigate('/student-games');
  };
  
  const getStudentName = () => {
    if (!studentData) return '';
    const nameParts = studentData.student.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return studentData.student.name;
  };

  // Функция для получения текущего предмета по расписанию
  const getCurrentSubjectInfo = () => {
    if (!currentLesson.current) return null;
    
    const subject = currentLesson.current.subject;
    const timeRange = `${currentLesson.current.start_time.slice(0, 5)} - ${currentLesson.current.end_time.slice(0, 5)}`;
    
    return { subject, timeRange };
  };

  // Функция для получения следующего предмета по расписанию
  const getNextSubjectInfo = () => {
    if (!currentLesson.next) return null;
    
    const subject = currentLesson.next.subject;
    const timeRange = `${currentLesson.next.start_time.slice(0, 5)} - ${currentLesson.next.end_time.slice(0, 5)}`;
    
    return { subject, timeRange };
  };
  if (!studentData) {
    return null;
  }

  const { student, className } = studentData;

  return (
    <div className="min-h-screen pb-32 md:pb-8">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4 flex-1"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-premium transform hover:rotate-6 transition-transform">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">
                  {getStudentName()}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100/50">
                    {className}
                  </span>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                </div>
              </div>
            </motion.div>

            <div className="flex items-center space-x-2">
              {/* Desktop Nav Actions */}
              <nav className="hidden md:flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 mr-4">
                {[
                  { icon: UserIcon, label: 'Профиль', onClick: handleProfileClick, color: 'text-indigo-600' },
                  { icon: Calendar, label: 'Уроки', onClick: handleScheduleClick, color: 'text-emerald-600' },
                  { icon: MessageCircle, label: 'Чат', onClick: handleChatClick, color: 'text-blue-600' },
                  { icon: Gamepad2, label: 'Игры', onClick: handleGamesClick, color: 'text-rose-600' },
                ].map((item, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={item.onClick}
                    className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-indigo-600 flex items-center space-x-2 group"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-bold hidden lg:block">{item.label}</span>
                  </motion.button>
                ))}
              </nav>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all"
                  >
                    <MoreVertical className="w-6 h-6" />
                  </motion.button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 p-2 rounded-3xl border-slate-100 shadow-premium glass" asChild>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <DropdownMenuItem onClick={handleForgetSession} className="p-3 rounded-2xl cursor-pointer hover:bg-rose-50 text-rose-600 flex items-center font-bold">
                      <Trash2 className="w-5 h-5 mr-3" />
                      Забыть сеанс
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="p-3 rounded-2xl cursor-pointer hover:bg-slate-50 text-slate-600 flex items-center font-bold">
                      <LogOut className="w-5 h-5 mr-3" />
                      Выйти из кабинета
                    </DropdownMenuItem>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white active:scale-90 transition-transform"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Flyout Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white/80 backdrop-blur-xl border-t border-slate-100 overflow-hidden"
            >
              <div className="p-4 grid grid-cols-2 gap-3">
                {[
                  { icon: UserIcon, label: 'Профиль', onClick: handleProfileClick, bg: 'bg-indigo-50', text: 'text-indigo-600' },
                  { icon: Calendar, label: 'Уроки', onClick: handleScheduleClick, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                  { icon: MessageCircle, label: 'Чат', onClick: handleChatClick, bg: 'bg-blue-50', text: 'text-blue-600' },
                  { icon: Gamepad2, label: 'Игры', onClick: handleGamesClick, bg: 'bg-rose-50', text: 'text-rose-600' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.onClick(); setMobileMenuOpen(false); }}
                    className={`${item.bg} ${item.text} p-4 rounded-3xl flex flex-col items-center justify-center space-y-2 font-black text-xs active:scale-95 transition-transform border border-white`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl animate-card-appear">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight mb-2">
            Добрый день, <span className="text-gradient">{getStudentName().split(' ')[0]}</span>! 👋
          </h2>
          <p className="text-slate-500 font-medium">Желаем продуктивного учебного дня и отличных оценок!</p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          
          {/* Active Lesson Widget */}
          <div className="md:col-span-12 lg:col-span-7">
            {schedule.length > 0 && (currentLesson.current || currentLesson.isBreak) ? (
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2.5rem] p-8 md:p-10 text-white shadow-premium relative overflow-hidden h-full group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/15 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-24 -mb-24"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  {currentLesson.current ? (
                    <>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 font-bold text-sm tracking-wide">
                          <Timer className="w-4 h-4 animate-pulse" />
                          <span className="uppercase">Сейчас идет урок</span>
                        </div>
                        <div className="text-4xl md:text-5xl font-black font-mono tracking-tighter">
                          {String(currentLesson.timeLeft.hours).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.minutes).padStart(2, '0')}:
                          {String(currentLesson.timeLeft.seconds).padStart(2, '0')}
                        </div>
                      </div>

                      <div className="mb-10">
                        <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight group-hover:translate-x-2 transition-transform duration-500">
                          {currentLesson.current.subject}
                        </h2>
                        <div className="flex flex-wrap gap-3">
                          <span className="px-4 py-2 bg-black/20 backdrop-blur-md rounded-2xl flex items-center space-x-2 border border-white/5 font-bold">
                            <User className="w-4 h-4" />
                            <span>{currentLesson.current.teacher}</span>
                          </span>
                          <span className="px-4 py-2 bg-black/20 backdrop-blur-md rounded-2xl flex items-center space-x-2 border border-white/5 font-bold">
                            <MapPin className="w-4 h-4" />
                            <span>Кабинет {currentLesson.current.room}</span>
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                          initial={{ width: 0 }}
                          animate={{ width: "65%" }} // Should be calculated, but using placeholder for style
                          transition={{ duration: 1.5 }}
                        />
                      </div>
                    </>
                  ) : currentLesson.isBreak && currentLesson.next ? (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3 px-4 py-2 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-400/20 text-emerald-300 font-bold text-sm tracking-wide">
                          <Clock className="w-4 h-4" />
                          <span className="uppercase">Перемена</span>
                        </div>
                      </div>
                      <h3 className="text-white/60 font-bold text-lg mb-2 uppercase tracking-widest">Следующий урок</h3>
                      <h2 className="text-3xl md:text-5xl font-black mb-8">{currentLesson.next.subject}</h2>
                      <div className="flex items-center justify-between bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                        <span className="font-bold text-indigo-200">До начала осталось:</span>
                        <span className="text-3xl font-black font-mono">
                          {String(currentLesson.timeUntilNext.minutes).padStart(2, '0')}:
                          {String(currentLesson.timeUntilNext.seconds).padStart(2, '0')}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <div className="premium-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                  <Clock className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Уроки завершены</h3>
                <p className="text-slate-400 font-bold mt-2">Отдыхай и набирайся сил на завтра!</p>
              </div>
            )}
          </div>

          {/* Quick Info & Stats */}
          <div className="md:col-span-12 lg:col-span-5 grid grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={handleScheduleClick}
              className="col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group hover:border-emerald-200 transition-all duration-300"
            >
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight">Расписание</h4>
                  <p className="text-slate-500 font-bold">8 уроков сегодня</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-all group-hover:translate-x-2" />
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/student-sor')}
              className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer group hover:border-indigo-200 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-all">
                <BookOpen className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">СОР</h4>
              <p className="text-xs text-slate-400 font-bold mt-1">Архив заданий</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/student-soch')}
              className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer group hover:border-purple-200 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:-rotate-12 transition-all">
                <Award className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">СОЧ</h4>
              <p className="text-xs text-slate-400 font-bold mt-1">Финальные тесты</p>
            </motion.div>
          </div>

          {/* Social & Games Widget */}
          <div className="md:col-span-12 lg:col-span-12">
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={handleChatClick}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute top-1/2 left-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 -ml-40 group-hover:bg-white/20 transition-all duration-700"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center space-x-8 text-center md:text-left">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-all">
                    <MessageCircle className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black tracking-tight mb-2 uppercase">Чат твоего класса</h3>
                    <p className="text-indigo-100 font-bold text-lg max-w-xl">
                      Общайся, узнавай новости первым и всегда будь на связи с командой!
                    </p>
                  </div>
                </div>
                
                <div className="bg-white text-indigo-600 px-8 py-4 rounded-3xl font-black text-xl hover:scale-105 transition-all shadow-xl">
                  Присоединиться
                </div>
              </div>
            </motion.div>
          </div>

          {/* Games Promo Bento */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            onClick={handleGamesClick}
            className="md:col-span-12 bg-white rounded-[3rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 p-4">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner">
                  <Gamepad2 className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-1">Время отдохнуть? 🎮</h3>
                  <p className="text-slate-500 font-bold">Игры, викторины и турниры уже ждут тебя. Сразись с одноклассниками!</p>
                </div>
                <div className="flex -space-x-4">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-12 h-12 rounded-full border-4 border-white overflow-hidden bg-slate-200">
                       <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full object-cover" />
                     </div>
                   ))}
                   <div className="w-12 h-12 rounded-full border-4 border-white bg-indigo-600 flex items-center justify-center text-white text-xs font-black">+12</div>
                </div>
             </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}