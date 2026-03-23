import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User, Shield, Camera, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Monitor, Smartphone, Clock, MessageCircle, Gamepad2, MoreVertical, Trash2, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { 
  getStudentProfile, 
  updateStudentAvatar, 
  getStudentLoginSessions,
  resetStudentPassword,
  changeStudentPassword,
  checkStudentKeyValidity
} from '../lib/api';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { dataPreloader } from '../services/preloader';
import type { Student, StudentProfile, LoginSession } from '../lib/supabase';

type ProfileTab = 'settings' | 'security';

export default function StudentProfilePage() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('settings');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use preloaded data hook
  const { data: preloadedData, refresh: refreshPreloadedData } = usePreloadedData();
  
  // Local state for profile data
  const [localProfile, setLocalProfile] = useState<StudentProfile | null>(null);
  const [localLoginSessions, setLocalLoginSessions] = useState<LoginSession[]>([]);
  
  // UI states
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Ref to track initialization to prevent infinite loops
  const initializedRef = useRef(false);

  const validateStudentKey = useCallback(async (studentId: string) => {
    try {
      const isValid = await checkStudentKeyValidity(studentId);
      if (!isValid) {
        localStorage.removeItem('studentDashboardData');
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.setItem('skipAutoLogin', 'true');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error validating student key:', error);
    }
  }, [navigate]);

  // Handle logout actions
  const handleLogout = useCallback(() => {
    localStorage.removeItem('studentDashboardData');
    navigate('/', { replace: true });
  }, [navigate]);

  const handleForgetSession = useCallback(() => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  }, [navigate]);

  // Load profile data logic - stabilized to avoid loops
  const loadProfileData = useCallback(async (studentId: string) => {
    try {
      // Load current profile
      const [profileData, sessionsData] = await Promise.all([
        getStudentProfile(studentId),
        getStudentLoginSessions(studentId, 5)
      ]);
      
      setLocalProfile(profileData);
      setLocalLoginSessions(sessionsData);
      
      if (profileData?.avatar_url) {
        setAvatarPreview(profileData.avatar_url);
      }
      
      // Update cache
      dataPreloader.invalidateCache();
      refreshPreloadedData();
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Ошибка загрузки данных профиля');
    }
  }, [refreshPreloadedData]);

  // Initial load
  useEffect(() => {
    if (initializedRef.current) return;

    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);
      
      // Validate and load
      validateStudentKey(data.student.id);
      loadProfileData(data.student.id);
      
      initializedRef.current = true;
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate, validateStudentKey, loadProfileData]);

  // Sync with preloaded data only if not just manually loaded
  useEffect(() => {
    if (preloadedData && localProfile === null) {
      setLocalProfile(preloadedData.profile);
      setLocalLoginSessions(preloadedData.loginSessions);
      if (preloadedData.profile?.avatar_url) {
        setAvatarPreview(preloadedData.profile.avatar_url);
      }
    }
  }, [preloadedData, localProfile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!studentData) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      setAvatarLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = (e) => resolve(e.target?.result as string);
        r.readAsDataURL(file);
      });

      await updateStudentAvatar(studentData.student.id, dataUrl);
      await loadProfileData(studentData.student.id); 
      
      setSuccess('Аватар успешно обновлен');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Ошибка загрузки аватара');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!studentData) return;
    
    if (!confirm('Вы уверены, что хотите сбросить пароль? После сброса вам потребуется новый ключ для входа.')) {
      return;
    }

    try {
      setPasswordLoading(true);
      setError(null);
      await resetStudentPassword(studentData.student.id);
      setSuccess('Пароль успешно сброшен. Теперь вам потребуется новый ключ для входа.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Ошибка сброса пароля');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    if (!studentData) return;
    e.preventDefault();
    
    if (newPassword.length < 4) {
      setError('Новый пароль должен содержать минимум 4 символа');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }

    try {
      setPasswordLoading(true);
      setError(null);
      await changeStudentPassword(studentData.student.id, oldPassword, newPassword);
      setSuccess('Пароль успешно изменен');
      setShowPasswordForm(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const message = error instanceof Error ? error.message : 'Ошибка изменения пароля';
      setError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!studentData) return null;

  const { student, className } = studentData;
  const getStudentInitials = () => student.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const formatDeviceInfo = (deviceInfo: any) => {
    if (!deviceInfo || typeof deviceInfo !== 'object') return 'Неизвестное устройство';
    const userAgent = deviceInfo.userAgent || '';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) return 'Мобильное устройство';
    if (userAgent.includes('Windows')) return 'Windows компьютер';
    if (userAgent.includes('Mac')) return 'Mac компьютер';
    return deviceInfo.platform || 'Неизвестное устройство';
  };

  return (
    <div className="min-h-screen pb-32 md:pb-8">
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/student-dashboard')}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all font-bold"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
              <div>
                 <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Профиль</h1>
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{className}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all"
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

              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl animate-card-appear">
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-8 p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5 mr-3" />
              {success}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-8 p-4 bg-rose-500 text-white rounded-2xl shadow-lg flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5 mr-3" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="premium-card p-8 text-center bg-gradient-to-b from-white to-indigo-50/30">
              <div className="relative inline-block mb-6 group">
                <motion.div whileHover={{ scale: 1.05, rotate: 2 }} className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl relative z-10">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-5xl">{getStudentInitials()}</span>
                  )}
                </motion.div>
                {avatarLoading && (
                  <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 z-30 w-12 h-12 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 active:scale-90">
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarLoading} />
                  <Camera className="w-6 h-6" />
                </label>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{student.name}</h2>
              <p className="text-indigo-500 text-xs font-black uppercase tracking-widest mb-8">{className}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                 <button onClick={() => setActiveTab('settings')} className={`p-4 rounded-2xl flex flex-col items-center justify-center transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><User className="w-5 h-5 mb-2" /><span className="text-[10px] font-black uppercase tracking-wider">Настройки</span></button>
                 <button onClick={() => setActiveTab('security')} className={`p-4 rounded-2xl flex flex-col items-center justify-center transition-all ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Shield className="w-5 h-5 mb-2" /><span className="text-[10px] font-black uppercase tracking-wider">Защита</span></button>
              </div>
            </div>

            <div className="premium-card p-6 bg-slate-900 text-white overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-20 blur-3xl -mr-16 -mt-16"></div>
               <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center"><Clock className="w-4 h-4 mr-2" />Последняя активность</h4>
               {localLoginSessions.length > 0 ? (
                  <div className="space-y-4">
                     <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-wider leading-none mb-1">Дата и время</p><p className="font-bold text-sm">{formatDateTime(localLoginSessions[0].login_time)}</p></div>
                     <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-wider leading-none mb-1">Устройство</p><p className="font-bold text-sm flex items-center">{formatDeviceInfo(localLoginSessions[0].device_info).includes('Мобильное') ? <Smartphone className="w-4 h-4 mr-2 text-indigo-400" /> : <Monitor className="w-4 h-4 mr-2 text-indigo-400" />}{formatDeviceInfo(localLoginSessions[0].device_info)}</p></div>
                  </div>
               ) : (<p className="text-slate-500 font-bold text-sm">Нет данных о входе</p>)}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'settings' ? (
                <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="premium-card p-8">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">Персональные данные</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Полное имя</label><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700">{student.name}</div></div>
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Прикрепленный класс</label><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700">{className}</div></div>
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Дата регистрации</label><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700">{student.created_at ? formatDateTime(student.created_at).split(',')[0] : '—'}</div></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <motion.button whileHover={{ y: -5 }} onClick={() => navigate('/student-chat')} className="premium-card p-8 group flex items-center justify-between bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><div className="flex items-center space-x-4"><div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><MessageCircle className="w-8 h-8" /></div><div><h4 className="text-lg font-black leading-none mb-1">Чат класса</h4><p className="text-white/70 text-[10px] font-black uppercase tracking-widest text-left">Общайся с друзьями</p></div></div><ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" /></motion.button>
                    <motion.button whileHover={{ y: -5 }} onClick={() => navigate('/student-games')} className="premium-card p-8 group flex items-center justify-between bg-gradient-to-br from-rose-500 to-pink-600 text-white"><div className="flex items-center space-x-4"><div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Gamepad2 className="w-8 h-8" /></div><div><h4 className="text-lg font-black leading-none mb-1">Игротека</h4><p className="text-white/70 text-[10px] font-black uppercase tracking-widest text-left">Играй и побеждай</p></div></div><ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" /></motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="premium-card p-8">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">Управление доступом</h3>
                    {!showPasswordForm ? (
                      <div className="space-y-6">
                        <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">Рекомендуем периодически обновлять пароль для безопасности.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button onClick={() => setShowPasswordForm(true)} className="p-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all font-black uppercase text-xs tracking-widest">Изменить пароль</button>
                          <button onClick={handlePasswordReset} disabled={passwordLoading} className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all font-black uppercase text-xs tracking-widest flex items-center justify-center disabled:opacity-50">{passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сбросить пароль'}</button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordChange} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                           <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Текущий пароль</label><div className="relative"><input type={showOldPassword ? 'text' : 'password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold outline-none" required /><button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500">{showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Новый пароль</label><div className="relative"><input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold outline-none" required minLength={4} /><button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500">{showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
                              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Подтверждение</label><div className="relative"><input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold outline-none" required /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
                           </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4"><button type="submit" disabled={passwordLoading} className="flex-1 p-5 bg-indigo-600 text-white rounded-2xl shadow-xl font-black uppercase text-xs tracking-widest disabled:opacity-50">{passwordLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Сохранить новый пароль'}</button><button type="button" onClick={() => setShowPasswordForm(false)} className="px-8 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest border border-slate-100">Отмена</button></div>
                      </form>
                    )}
                  </div>
                  <div className="premium-card p-8">
                     <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">История сессий</h3>
                     <div className="space-y-4">
                        {localLoginSessions.length === 0 ? (<div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl"><Monitor className="w-12 h-12 text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">История пуста</p></div>) : (localLoginSessions.map((session, idx) => (<motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-white rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between group"><div className="flex items-center space-x-6"><div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-50 transition-colors">{formatDeviceInfo(session.device_info).includes('Мобильное') ? <Smartphone className="w-7 h-7" /> : <Monitor className="w-7 h-7" />}</div><div><p className="font-black text-slate-800 tracking-tight">{formatDateTime(session.login_time)}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDeviceInfo(session.device_info)}</p></div></div><div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center"><CheckCircle className="w-3 h-3 mr-2" />Активно</div></motion.div>)))}
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}