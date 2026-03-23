import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, User, Key, Lock, ArrowLeft, Eye, EyeOff, CheckCircle, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import StudentAvatar from '../components/StudentAvatar';
import { useStudentProfiles } from '../hooks/useStudentProfiles';
import { useAvatarPreloader } from '../hooks/useAvatarPreloader';
import { 
  getClasses, 
  getStudentsByClass, 
  validateKey, 
  validatePassword, 
  createPassword,
  getStudent,
  checkStudentKeyValidity
} from '../lib/api';
import { getStudent as getStudentService } from '../services/student';
import { dataPreloader } from '../services/preloader';
import type { Class, Student } from '../lib/supabase';

type Step = 'classes' | 'students' | 'auth';
type AuthStep = 'key' | 'password' | 'create-password';

interface HomePageProps {
  onShowAdminModal: () => void;
  onStudentLogin: (student: Student, className: string) => void;
}

export default function HomePage({ onShowAdminModal, onStudentLogin }: HomePageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Main state
  const [step, setStep] = useState<Step>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [authStep, setAuthStep] = useState<AuthStep>('key');
  const [keyValue, setKeyValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedLogin, setSavedLogin] = useState<{studentId: string, expiresAt: number} | null>(null);
  const [isAutoLoginProcessing, setIsAutoLoginProcessing] = useState(false);

  // Загружаем профили студентов
  const studentIds = students.map(s => s.id);
  const { profiles } = useStudentProfiles(studentIds);
  
  // Используем предзагрузчик аватарок
  const { getAvatar, preloadAvatars } = useAvatarPreloader();

  // Проверяем сохраненные данные входа при загрузке
  useEffect(() => {
    // Проверяем, не был ли выполнен явный выход
    const shouldSkipAutoLogin = localStorage.getItem('skipAutoLogin') === 'true';
    if (!shouldSkipAutoLogin) {
      autoLoginWithSavedData();
    } else {
      setIsAutoLoginProcessing(false);
    }
    
    // Запускаем предзагрузку данных в фоне
    dataPreloader.initializePreloading().catch(console.error);
  }, []);

  const autoLoginWithSavedData = async () => {
    try {
      setIsAutoLoginProcessing(true);
      const savedId = localStorage.getItem('studentId');
      const savedTime = localStorage.getItem('createdAt');

      if (!savedId || !savedTime) {
        setIsAutoLoginProcessing(false);
        return;
      }

      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);

      // 365 дней = 31536000000 мс
      if (diff > 31536000000) {
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.removeItem('studentDashboardData');
        setIsAutoLoginProcessing(false);
        return;
      }

      // Проверяем валидность ключа студента в БД
      const isKeyValid = await checkStudentKeyValidity(savedId);
      if (!isKeyValid) {
        // Ключ больше не валиден, очищаем сессию
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.removeItem('studentDashboardData');
        localStorage.setItem('skipAutoLogin', 'true');
        setIsAutoLoginProcessing(false);
        return;
      }

      const student = await getStudentService(savedId);
      if (student) {
        // Загружаем классы если они еще не загружены
        let allClasses = classes;
        if (allClasses.length === 0) {
          allClasses = await getClasses();
          setClasses(allClasses);
        }
        
        const classData = allClasses.find(c => c.id === student.class_id);
        
        if (classData) {
          setSavedLogin({ studentId: savedId, expiresAt: parseInt(savedTime, 10) + 31536000000 });
          // Перенаправляем в дашборд с задержкой
          setTimeout(() => {
            onStudentLogin(student, classData.name);
          }, 500);
        } else {
          setIsAutoLoginProcessing(false);
        }
      } else {
        setIsAutoLoginProcessing(false);
      }
    } catch (err) {
      console.error('Auto login failed:', err);
      localStorage.removeItem('studentId');
      localStorage.removeItem('createdAt');
      localStorage.removeItem('studentDashboardData');
      setIsAutoLoginProcessing(false);
    }
  };
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const classData = await getClasses();
      setClasses(classData);
    } catch (err) {
      setError(t('error.loadingClasses'));
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classItem: Class) => {
    try {
      setLoading(true);
      setError(null);
      const studentData = await getStudentsByClass(classItem.id);
      setStudents(studentData);
      setSelectedClass(classItem);
      setStep('students');
      
      // Запускаем фоновую загрузку аватарок
      if (studentData.length > 0) {
        const studentIds = studentData.map(s => s.id);
        preloadAvatars(studentIds).catch(console.error);
      }
    } catch (err) {
      setError(t('error.loadingStudents'));
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: Student) => {
    // Очищаем флаг пропуска автологина при новом выборе студента
    localStorage.removeItem('skipAutoLogin');
    
    // Проверяем, есть ли сохраненный вход для этого ученика
    if (savedLogin && savedLogin.studentId === student.id) {
      handleSuccessfulAuth(student, true);
      return;
    }
    
    setSelectedStudent(student);
    // Определяем начальный шаг авторизации
    if (student.password_hash) {
      setAuthStep('password');
    } else {
      setAuthStep('key');
    }
    setStep('auth');
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validateKey(keyValue.toUpperCase(), selectedStudent.id);
      
      if (result.valid) {
        setAuthStep('create-password');
      } else {
        setError(t('auth.invalidOrUsedKey'));
      }
    } catch (err) {
      setError(t('error.keyValidation'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validatePassword(selectedStudent.id, password);
      
      if (result.valid && result.student) {
        // Показываем сообщение об успешном входе
        setSuccessMessage(t('auth.successfulLogin'));
        setTimeout(() => {
          handleSuccessfulAuth(result.student, false);
        }, 2000);
      } else {
        setError(t('auth.invalidPassword'));
      }
    } catch (err: any) {
      if (err.message === 'Пароль не установлен') {
        setError(t('auth.passwordNotSet'));
      } else {
        setError(t('error.passwordValidation'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (password.length < 4) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      await createPassword(selectedStudent.id, password);
      
      // Показываем сообщение о создании пароля
      setSuccessMessage(t('auth.passwordCreated'));
      setTimeout(() => {
        handleSuccessfulAuth(selectedStudent, false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('error.passwordCreation'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessfulAuth = (student: Student, isAutoLogin: boolean = false) => {
    if (!isAutoLogin) {
      // Очищаем флаг пропуска автологина при успешной авторизации
      localStorage.removeItem('skipAutoLogin');
      // Сохраняем данные входа на 3 дня
      localStorage.setItem('studentId', student.id);
      localStorage.setItem('createdAt', Date.now().toString());
      setSavedLogin({ studentId: student.id, expiresAt: Date.now() + 31536000000 });
    }
    
    // Получаем название класса
    const className = selectedClass?.name || classes.find(c => c.id === student.class_id)?.name || '';
    
    // Перенаправляем в личный кабинет или на URL ученика
    if (student.url) {
      // Если есть URL, перенаправляем туда
      setTimeout(() => {
        window.location.href = student.url!;
      }, isAutoLogin ? 500 : 1000);
    } else {
      // Перенаправляем в личный кабинет
      setTimeout(() => {
        onStudentLogin(student, className);
      }, isAutoLogin ? 500 : 1000);
    }
  };

  const handleLogout = () => {
    // Устанавливаем флаг, чтобы предотвратить автоматический вход
    localStorage.setItem('skipAutoLogin', 'true');
    
    // НЕ удаляем данные сеанса при обычном выходе
    setSavedLogin(null);
    setStep('classes');
    setSelectedClass(null);
    setSelectedStudent(null);
    setStudents([]);
    setKeyValue('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleForgetSession = () => {
    // Полностью удаляем сеанс только при явном действии "забыть сеанс"
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    
    // Очищаем состояние
    setSavedLogin(null);
    setStep('classes');
    setSelectedClass(null);
    setSelectedStudent(null);
    setStudents([]);
    setKeyValue('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    
    localStorage.removeItem('skipAutoLogin');
    setSavedLogin(null);
  };

  const handleBack = () => {
    if (step === 'auth') {
      // Используем history.back() для корректной работы системной кнопки "Назад"
      window.history.back();
    } else if (step === 'students') {
      // Используем history.back() для корректной работы системной кнопки "Назад"
      window.history.back();
    }
  };

  const formatKeyInput = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/g, '');
    const formatted = clean.match(/.{1,4}/g)?.join('-') || clean;
    return formatted.slice(0, 14);
  };

  // Если есть активная сессия и происходит автоматический вход, показываем загрузку
  if (isAutoLoginProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-white p-8 rounded-2xl shadow-xl"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Автоматический вход</h2>
          <p className="text-gray-600 mb-4">Перенаправление в личный кабинет...</p>
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </motion.div>
      </div>
    );
  }
  
  if (loading && step === 'classes') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="min-h-screen pb-safe">
      <Header 
        onShowAdminModal={onShowAdminModal} 
=======
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <Header
        onShowAdminModal={onShowAdminModal}
>>>>>>> d2b6ecfc1857db7139edc3caa4e6c1693abf4fdc
        showBackButton={false}
        onStudentLogin={onStudentLogin}
        showAdminButton={true}
      />
      
      <main className="container mx-auto px-4 py-16 md:py-24 max-w-7xl animate-card-appear">
        {/* Session Info Bar */}
        <AnimatePresence>
          {savedLogin && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 flex flex-wrap items-center justify-between gap-4 p-6 glass border-emerald-100 rounded-[2.5rem] shadow-premium"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                  <User className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                   <h4 className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1 uppercase">Активная сессия</h4>
                   <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Автоматический вход включен</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleForgetSession}
                className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Забыть сеанс
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <div className="text-center mb-20 relative px-4">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10 animate-float"></div>
           
           <motion.div
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 1, ease: "backOut" }}
             className="inline-flex p-6 bg-white rounded-[3rem] shadow-premium border border-slate-50 mb-10 transform hover:rotate-6 transition-transform cursor-pointer"
           >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-xl">
                 <GraduationCap className="w-10 h-10 text-white" />
              </div>
           </motion.div>

           <h1 className="text-4xl md:text-8xl font-black text-slate-900 tracking-tight leading-[0.9] mb-6">
              УЧИСЬ <span className="text-gradient">КРАСИВО</span>
           </h1>
           <p className="text-slate-500 font-bold text-lg md:text-xl max-w-2xl mx-auto uppercase tracking-widest leading-relaxed">
              Платформа для развития, <br />
              достижения целей и побед.
           </p>
        </div>

        {/* Class Selection Bento */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 px-2 pb-20">
           <div className="md:col-span-12 flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                 <div className="w-2 h-10 bg-indigo-600 rounded-full"></div>
                 Выбери свой класс
              </h2>
           </div>

           {classes.map((classItem, index) => (
             <motion.div
               key={classItem.id}
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               transition={{ delay: index * 0.05 }}
               whileHover={{ y: -8, scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={() => navigate(`/class/${classItem.id}`, { 
                 state: { 
                   classId: classItem.id, 
                   className: classItem.name 
                 } 
               })}
               className="md:col-span-4 lg:col-span-3 premium-card p-10 flex flex-col items-center justify-center cursor-pointer group hover:border-indigo-100 transition-all duration-300 min-h-[260px] relative overflow-hidden text-center"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition-all rounded-full -mr-16 -mt-16"></div>
                
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-12 transition-all duration-500 text-indigo-600">
                   <div className="font-black text-3xl">{classItem.name.split(' ')[0]}</div>
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">{classItem.name}</h3>
                <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-indigo-500 transition-colors">
                   Войти в класс <ArrowLeft className="w-3 h-3 ml-2 rotate-180" />
                </div>
             </motion.div>
           ))}

           {classes.length === 0 && !loading && (
              <div className="md:col-span-12 py-20 premium-card text-center flex flex-col items-center">
                 <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-6">
                    <GraduationCap className="w-10 h-10" />
                 </div>
                 <h3 className="text-xl font-black text-slate-400">Классы пока не созданы</h3>
              </div>
           )}
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="py-20 border-t border-slate-100/50 bg-slate-50/30 backdrop-blur-sm">
         <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-4 opacity-30">SOR-SOCH PORTAL &copy; 2026</h2>
            <div className="flex flex-wrap justify-center gap-8 mt-10">
               {['Помощь', 'Правила', 'О проекте'].map(link => (
                 <button key={link} className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 transition-colors">
                    {link}
                 </button>
               ))}
            </div>
         </div>
      </footer>
    </div>
  );
}