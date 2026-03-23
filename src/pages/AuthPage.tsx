import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Lock, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import StudentAvatar from '../components/StudentAvatar';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LoadingSpinner from '../components/LoadingSpinner';
import { useStudentProfile } from '../hooks/useStudentProfiles';
import { 
  validateKey, 
  validatePassword, 
  createPassword
} from '../lib/api';
import { getStudent as getStudentService } from '../services/student';
import type { Student } from '../lib/supabase';

type AuthStep = 'key' | 'password' | 'create-password';

export default function AuthPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  
  // Получаем данные из state
  const { student: studentFromState, classId, className } = location.state || {};
  
  const [student, setStudent] = useState<Student | null>(studentFromState);
  const [authStep, setAuthStep] = useState<AuthStep>('key');
  const [keyValue, setKeyValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(!studentFromState);

  // Загружаем профиль студента
  const { profile } = useStudentProfile(student?.id || '');

  useEffect(() => {
    if (!studentFromState && studentId) {
      // Если нет данных в state, загружаем студента по ID
      loadStudent();
    } else if (student) {
      // Определяем начальный шаг авторизации
      determineAuthStep();
    }
  }, [studentId, student]);

  const loadStudent = async () => {
    if (!studentId) {
      navigate('/', { replace: true });
      return;
    }

    try {
      setLoading(true);
      const studentData = await getStudentService(studentId);
      if (studentData) {
        setStudent(studentData);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const determineAuthStep = () => {
    if (!student) return;

    // Проверяем быстрый вход
    const savedId = localStorage.getItem('studentId');
    const savedTime = localStorage.getItem('createdAt');

    if (savedId === student.id && savedTime) {
      const now = Date.now();
      const diff = now - parseInt(savedTime, 10);

      // 365 дней = 31536000000 мс (практически бесконечно)
      if (diff <= 31536000000) {
        handleSuccessfulAuth(student, true);
        return;
      }
    }

    // Определяем шаг авторизации
    if (student.password_hash) {
      setAuthStep('password');
    } else {
      setAuthStep('key');
    }
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validateKey(keyValue.toUpperCase(), student.id);
      
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
    if (!student) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await validatePassword(student.id, password);
      
      if (result.valid && result.student) {
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
    if (!student) return;

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
      
      await createPassword(student.id, password);
      
      setSuccessMessage(t('auth.passwordCreated'));
      setTimeout(() => {
        handleSuccessfulAuth(student, false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('error.passwordCreation'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessfulAuth = (student: Student, isAutoLogin: boolean = false) => {
    if (!isAutoLogin) {
      // Сохраняем данные входа на 3 дня
      localStorage.setItem('studentId', student.id);
      localStorage.setItem('createdAt', Date.now().toString());
      localStorage.removeItem('skipAutoLogin');
    }
    
    // Сохраняем данные для дашборда
    const dashboardData = { 
      student, 
      className: className || classId 
    };
    localStorage.setItem('studentDashboardData', JSON.stringify(dashboardData));
    
    // Перенаправляем в личный кабинет или на URL ученика
    if (student.url) {
      setTimeout(() => {
        window.location.href = student.url!;
      }, isAutoLogin ? 500 : 1000);
    } else {
      setTimeout(() => {
        navigate('/student-dashboard', { replace: true });
      }, isAutoLogin ? 500 : 1000);
    }
  };

  const handleBack = () => {
    // Используем history.back() для корректной работы системной кнопки "Назад"
    window.history.back();
  };

  const formatKeyInput = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/g, '');
    const formatted = clean.match(/.{1,4}/g)?.join('-') || clean;
    return formatted.slice(0, 14);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Студент не найден</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe flex flex-col">
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              onClick={handleBack}
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all font-bold"
            >
              <Key className="w-5 h-5 rotate-45" />
            </motion.button>
            <LanguageSwitcher showBackButton={false} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12 animate-card-appear">
        <div className="w-full max-w-md">
           {/* Messages */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8 p-4 bg-emerald-500 text-white rounded-[2rem] shadow-lg shadow-emerald-100 flex items-center justify-center font-black uppercase text-xs tracking-widest text-center"
              >
                <CheckCircle className="w-4 h-4 mr-3" />
                {successMessage}
              </motion.div>
            )}
            
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8 p-4 bg-rose-500 text-white rounded-[2rem] shadow-lg shadow-rose-100 flex items-center justify-between font-bold"
              >
                <div className="flex items-center">
                   <Lock className="w-4 h-4 mr-3" />
                   <span className="text-sm">{error}</span>
                </div>
                <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-10 relative overflow-hidden text-center"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-5 blur-3xl -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-8">
                <div className="relative p-1 bg-white rounded-[2.5rem] shadow-premium">
                  <StudentAvatar 
                    student={student} 
                    avatarUrl={profile?.avatar_url}
                    size="xl"
                  />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white transform rotate-12">
                     {authStep === 'key' ? <Key className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{student.name}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-10">
                {authStep === 'key' && 'Требуется ключ доступа'}
                {authStep === 'password' && 'Введите ваш пароль'}
                {authStep === 'create-password' && 'Придумайте пароль'}
              </p>

              <AnimatePresence mode="wait">
                {authStep === 'key' && (
                  <motion.form
                    key="key-form"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    onSubmit={handleKeySubmit}
                    className="space-y-6"
                  >
                    <div className="relative group">
                       <input
                        type="text"
                        value={keyValue}
                        onChange={(e) => setKeyValue(formatKeyInput(e.target.value.toUpperCase()))}
                        placeholder="0000-0000-0000"
                        className="w-full px-4 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none font-mono text-center text-xl font-black tracking-[0.2em] text-indigo-600 transition-all placeholder:text-slate-300 shadow-inner"
                        maxLength={14}
                        autoFocus
                        autoCapitalize="characters"
                        autoCorrect="off"
                        required
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isProcessing || keyValue.length < 14}
                      className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Продолжить'}
                    </motion.button>
                  </motion.form>
                )}

                {authStep === 'password' && (
                  <motion.form
                    key="password-form"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    onSubmit={handlePasswordSubmit}
                    className="space-y-6 text-left"
                  >
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Ваш пароль"
                          className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300 shadow-inner"
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-xl transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isProcessing || !password}
                        className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Войти в систему'}
                      </motion.button>
                      
                      <button
                        type="button"
                        onClick={() => setAuthStep('key')}
                        className="w-full py-4 text-slate-400 font-bold hover:text-indigo-600 transition-colors text-xs uppercase tracking-widest"
                      >
                        Использовать ключ доступа
                      </button>
                    </div>
                  </motion.form>
                )}

                {authStep === 'create-password' && (
                  <motion.form
                    key="create-password-form"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    onSubmit={handleCreatePasswordSubmit}
                    className="space-y-6 text-left"
                  >
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Новый пароль"
                          className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300 shadow-inner"
                          required
                          minLength={4}
                        />
                         <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-xl transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Повторите пароль"
                          className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300 shadow-inner"
                          required
                        />
                         <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-xl transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isProcessing || !password || !confirmPassword}
                      className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Создать и войти'}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}