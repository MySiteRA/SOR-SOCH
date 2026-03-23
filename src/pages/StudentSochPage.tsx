import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, MoreVertical, Trash2, Calendar, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import SubjectCard from '../components/SubjectCard';
import CurrentLessonBanner from '../components/CurrentLessonBanner';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { checkStudentKeyValidity } from '../lib/api';
import { useRealtimeLessonTimer } from '../hooks/useRealtimeLessonTimer';
import { supabase } from '../lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Student, Subject, Material } from '../lib/supabase';

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

export default function StudentSochPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  // Используем предзагруженные данные
  const { data: preloadedData, loading } = usePreloadedData();

  // Используем хук для реального времени урока
  const currentLesson = useRealtimeLessonTimer({
    classId: studentData?.student.class_id || '',
    schedule
  });

  // Получаем предметы и материалы из предзагруженных данных
  const subjects = preloadedData?.subjects || [];

  useEffect(() => {
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);

      // Проверяем валидность ключа студента
      validateStudentKey(data.student.id);

      // Загружаем расписание
      loadSchedule(data.student.class_id);
    } else {
      navigate('/', { replace: true });
      return;
    }
  }, []);

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
    }
  };

  const loadSchedule = async (classId: string) => {
    try {
      const { data, error: scheduleError } = await supabase
        .from('schedule')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week')
        .order('lesson_number');

      if (scheduleError) throw scheduleError;
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const loadSubjectMaterials = (subject: Subject) => {
    if (!studentData) return;
    navigate(`/student-soch-materials/${subject.id}`, { 
      state: { 
        student: studentData.student, 
        className: studentData.className, 
        subject,
        type: 'SOCH'
      } 
    });
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

  const handleScheduleClick = () => {
    navigate('/student-schedule');
  };

  const handleChatClick = () => {
    navigate('/student-chat');
  };

  if (!studentData) {
    return null;
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
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
                   {t('dashboard.soch')}
                 </h1>
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                    Итоговое оценивание
                 </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
               <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[10px] font-black uppercase">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                  Библиотека СОЧ
               </div>

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
                      <Calendar className="w-4 h-4 mr-3" />
                      Профиль
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleScheduleClick} className="p-3 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-600 flex items-center font-bold">
                      <Calendar className="w-4 h-4 mr-3 text-amber-500" />
                      Расписание
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleChatClick} className="p-3 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-600 flex items-center font-bold">
                      <MessageCircle className="w-4 h-4 mr-3 text-blue-500" />
                      Чат
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

      <div className="container mx-auto px-4 py-8 max-w-7xl animate-card-appear">
        {currentLesson && (
          <div className="mb-8">
            <CurrentLessonBanner lesson={currentLesson} />
          </div>
        )}

        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
              <BookOpen className="w-8 h-8 mr-3 text-blue-500" />
              Предметы
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {subjects.map((subject, index) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                index={index}
                onClick={() => loadSubjectMaterials(subject)}
              />
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}