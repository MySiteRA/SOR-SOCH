import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Home, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import StudentAvatar from '../components/StudentAvatar';
import { useStudentProfiles } from '../hooks/useStudentProfiles';
import { useAvatarPreloader } from '../hooks/useAvatarPreloader';
import { getStudentsByClass } from '../lib/api';
import type { Student } from '../lib/supabase';

export default function StudentSelectionPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const location = useLocation();
  
  const { className } = location.state || {};
  
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Ref to prevent double-loading
  const loadedRef = useRef(false);

  const studentIds = students.map(s => s.id);
  const { profiles } = useStudentProfiles(studentIds);
  const { getAvatar, preloadAvatars } = useAvatarPreloader();

  // Check saved session on mount
  useEffect(() => {
    const savedId = localStorage.getItem('studentId');
    const savedTime = localStorage.getItem('createdAt');

    if (savedId && savedTime) {
      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);
      if (diff <= 31536000000) {
        setSuccessMessage('У вас есть активная сессия. Выберите ученика для быстрого входа.');
      }
    }
  }, []);

  // Load students ONCE when classId changes
  useEffect(() => {
    if (!classId) {
      navigate('/', { replace: true });
      return;
    }
    
    // Prevent double-loading from strict mode
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        const studentData = await getStudentsByClass(classId);
        setStudents(studentData);
        
        // Background avatar preload - fire and forget
        if (studentData.length > 0) {
          const ids = studentData.map(s => s.id);
          preloadAvatars(ids).catch(console.error);
        }
      } catch (err) {
        console.error('Error loading students:', err);
        setError(t('error.loadingStudents'));
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const selectStudent = (student: Student) => {
    localStorage.removeItem('skipAutoLogin');
    navigate(`/auth/${student.id}`, { 
      state: { student, classId, className } 
    });
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0">
              <motion.button
                onClick={handleBack}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all font-bold"
              >
                <Home className="w-6 h-6" />
              </motion.button>
              <div className="min-w-0">
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1 truncate">
                  Выбор ученика
                </h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 truncate">
                  {className}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl animate-card-appear">
        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center font-bold"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-3"></div>
              {successMessage}
            </motion.div>
          )}
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 p-4 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-100 flex items-center justify-between font-bold"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-10 sticky top-[80px] z-40">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500/5 blur-2xl group-focus-within:bg-indigo-500/10 transition-all rounded-3xl"></div>
            <div className="relative glass border-b-4 border-indigo-600 shadow-premium overflow-hidden rounded-[2rem]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени ученика..."
                className="w-full px-8 py-5 pl-16 bg-white/40 backdrop-blur-md outline-none text-slate-800 font-bold placeholder-slate-400 group-focus-within:bg-white/60 transition-all"
              />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500">
                <User className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((student, index) => {
            const savedId = localStorage.getItem('studentId');
            const isQuickLogin = savedId === student.id;
            
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectStudent(student)}
                className={`premium-card p-6 flex items-center cursor-pointer border-2 transition-all group ${
                  isQuickLogin ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent hover:border-indigo-200'
                }`}
              >
                <div className="relative mr-6">
                  <StudentAvatar 
                    student={student} 
                    avatarUrl={getAvatar(student.id) || profiles.get(student.id)?.avatar_url}
                    size="lg"
                  />
                  {isQuickLogin && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center">
                       <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                    {student.name}
                  </h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isQuickLogin ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {isQuickLogin
                      ? 'Твой аккаунт (быстрый вход)' 
                      : student.password_hash 
                        ? 'Пароль установлен' 
                        : 'Ждет входа'
                    }
                  </p>
                </div>
                
                <motion.div 
                   whileHover={{ x: 3 }}
                   className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"
                >
                   <ArrowRight className="w-5 h-5" />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
        
        {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
           <div className="py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300">
                 <User className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-400 tracking-tight">Ученик не найден</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Проверь правильность ввода имени</p>
           </div>
        )}
      </div>
    </div>
  );
}