import React, { useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LanguageProvider } from './contexts/LanguageContext';
import { dataPreloader } from './services/preloader';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminSchedulePage from './pages/AdminSchedulePage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentSorPage from './pages/StudentSorPage';
import StudentSochPage from './pages/StudentSochPage';
import StudentMaterialsPage from './pages/StudentMaterialsPage';
import StudentSchedulePage from './pages/StudentSchedulePage';
import StudentChatPage from './pages/StudentChatPage';
import StudentGamesPage from './pages/StudentGamesPage';
import StudentGamePage from './pages/StudentGamePage';
import ClassSelectionPage from './pages/ClassSelectionPage';
import StudentSelectionPage from './pages/StudentSelectionPage';
import AuthPage from './pages/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';
import Modal from './components/Modal';
import { validateAdminCredentials } from './lib/api';
import { checkStudentKeyValidity } from './lib/api';
import { Lock } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';
import { useNavigationGuard } from './hooks/useNavigationGuard';
import LoadingSpinner from './components/LoadingSpinner';
import BottomNav from './components/BottomNav';

function RouterSelector({ children }: { children: React.ReactNode }) {
  // Если приложение открыто внутри WebView (например, Android)
  const isMobileApp = /wv/.test(navigator.userAgent.toLowerCase());

  if (isMobileApp) {
    return <HashRouter>{children}</HashRouter>;
  }
  return <BrowserRouter>{children}</BrowserRouter>;
}

function AppContent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  useNavigationGuard();
  
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('adminLoggedIn') === 'true';
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showStudentsPage, setShowStudentsPage] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Инициализация предзагрузки данных
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Проверяем валидность сохраненной сессии студента
        await validateStudentSession();
        
        // Инициализируем предзагрузку при старте приложения
        await dataPreloader.initializePreloading();
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        // Даем минимальное время для инициализации
        setTimeout(() => {
          setInitialLoading(false);
        }, dataPreloader.hasCachedData() ? 100 : 500);
      }
    };

    initializeApp();
  }, []);

  const validateStudentSession = async () => {
    try {
      const dashboardData = localStorage.getItem('studentDashboardData');
      if (!dashboardData) return;

      const parsed = JSON.parse(dashboardData);
      if (!parsed.student?.id) return;

      // Проверяем валидность ключа студента в БД
      const isValid = await checkStudentKeyValidity(parsed.student.id);
      
      if (!isValid) {
        // Ключ больше не валиден, очищаем сессию
        localStorage.removeItem('studentDashboardData');
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.setItem('skipAutoLogin', 'true');
        
        // Если мы находимся на студенческой странице, перенаправляем на главную
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/student-')) {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error validating student session:', error);
      // В случае ошибки проверки, не очищаем сессию
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('adminLoggedIn', 'true');
    setShowAdminModal(false);
    setAdminUsername('');
    setAdminPassword('');
    setAdminError(null);
    navigate('/admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('adminLoggedIn');
    navigate('/');
  };

  const handleStudentLogin = (student: any, className: string) => {
    const dashboardData = { student, className };
    localStorage.setItem('studentDashboardData', JSON.stringify(dashboardData));
    navigate('/student-dashboard');
  };
  
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateAdminCredentials(adminUsername, adminPassword)) {
      handleAdminLoginSuccess();
    } else {
      setAdminError(t('admin.invalidCredentials'));
    }
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminUsername('');
    setAdminPassword('');
    setAdminError(null);
  };

  // Показываем загрузку только при первой инициализации
  if (initialLoading) {
    // Если есть кэшированные данные, показываем минимальную загрузку
    const hasCache = dataPreloader.hasCachedData();
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        {hasCache ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Инициализация...</p>
          </motion.div>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            <HomePage 
              onShowAdminModal={() => setShowAdminModal(true)} 
              onStudentLogin={handleStudentLogin}
            />
          } 
        />
        
        <Route 
          path="/class/:classId" 
          element={<StudentSelectionPage />} 
        />
        
        <Route 
          path="/auth/:studentId" 
          element={<AuthPage />} 
        />
        
        {/* Student Protected Routes */}
        <Route 
          path="/student-dashboard" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentDashboardPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-profile" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentProfilePage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-sor" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentSorPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-soch" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentSochPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-schedule" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentSchedulePage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-chat" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentChatPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-games" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentGamesPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-game/:gameId" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentGamePage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-sor-materials/:subjectId" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentMaterialsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/student-soch-materials/:subjectId" 
          element={
            <ProtectedRoute requiresStudentSession={true}>
              <StudentMaterialsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Protected Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiresAdminSession={true}>
              <AdminPage onLogout={handleAdminLogout} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/students" 
          element={
            <ProtectedRoute requiresAdminSession={true}>
              <AdminStudentsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/schedule" 
          element={
            <ProtectedRoute requiresAdminSession={true}>
              <AdminSchedulePage />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Admin Login Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={closeAdminModal}
        title={t('admin.login')}
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600">{t('admin.login')}</p>
          </div>

          {adminError && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {adminError}
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.username')}
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.password')}
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 font-medium"
            >
              {t('auth.login')}
            </button>
          </form>
        </div>
      </Modal>

      {/* Render BottomNav only on student pages, except auth/selection which don't have the full bottom bar layout */}
      {location.pathname.startsWith('/student') && (
        <BottomNav />
      )}
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <RouterSelector>
        <AppContent />
      </RouterSelector>
    </LanguageProvider>
  );
}

export default App;