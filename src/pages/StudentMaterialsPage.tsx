import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, MoreVertical, Trash2, User as UserIcon, Calendar, MessageCircle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MaterialCard from '../components/MaterialCard';
import MaterialModal from '../components/MaterialModal';
import { usePreloadedData } from '../hooks/usePreloadedData';
import { checkStudentKeyValidity } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Student, Subject, Material } from '../lib/supabase';

export default function StudentMaterialsPage() {
  const navigate = useNavigate();
  const { subjectId } = useParams<{ subjectId: string }>();
  const location = useLocation();
  
  // Состояние для хранения данных (если их нет в state)
  const [student, setStudent] = useState<Student | null>(location.state?.student || null);
  const [, setClassName] = useState<string>(location.state?.className || '');
  const [subject, setSubject] = useState<Subject | null>(location.state?.subject || null);
  const [type, setType] = useState<'SOR' | 'SOCH' | null>(location.state?.type || null);
  
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Используем предзагруженные данные
  const { data: preloadedData, loading } = usePreloadedData();
  
  // Получаем материалы из предзагруженных данных
  const allMaterials = type === 'SOR' 
    ? (preloadedData?.sorMaterials || [])
    : (preloadedData?.sochMaterials || []);
  
  // Фильтруем материалы по предмету
  const materials = allMaterials.filter(material => material.subject_id === subjectId);

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
    } catch (err) {
      console.error('Error validating student key:', err);
      // В случае ошибки проверки, не разлогиниваем
    }
  }, [navigate]);

  useEffect(() => {
    if (!student || !subject || !type) {
      const saved = localStorage.getItem('studentDashboardData');
      if (saved) {
        const data = JSON.parse(saved);
        setStudent(data.student);
        setClassName(data.className);
        
        // Попытаемся найти предмет в предзагруженных данных если его нет
        if (!subject && preloadedData?.subjects) {
          const foundSubject = preloadedData.subjects.find(s => s.id === subjectId);
          if (foundSubject) setSubject(foundSubject);
        }
        
        // Если тип не указан, попробуем определить из URL или дефолт
        if (!type) setType('SOR'); 
      } else {
        navigate('/student-dashboard');
        return;
      }
    }

    if (student) {
      // Проверяем валидность ключа студента
      validateStudentKey(student.id);
    }
  }, [student, subject, type, subjectId, preloadedData, navigate, validateStudentKey]);

  const handleBack = () => {
    // Используем history.back() для корректной работы системной кнопки "Назад"
    window.history.back();
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
  
  const handleMaterialClick = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const closeMaterialModal = () => {
    setShowMaterialModal(false);
    setSelectedMaterial(null);
  };

  // Если нет данных, показываем загрузку
  if (!student || !subject) {
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
                onClick={handleBack}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
              <div>
                 <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1 line-clamp-1">
                   {subject.name}
                 </h1>
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                    {type === 'SOR' ? 'СОР • Суммативное оценивание' : 'СОЧ • Итоговое оценивание'}
                 </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
               <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-full border border-slate-100 text-[10px] font-black uppercase">
                  {type} Материалы
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
                      <UserIcon className="w-4 h-4 mr-3" />
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
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Loading */}
        {loading && materials.length === 0 && <LoadingSpinner />}

        {/* Update Indicator */}
        {loading && materials.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 mb-6"
          >
            <div className="inline-flex items-center space-x-2 text-gray-600 bg-white/50 backdrop-blur px-4 py-2 rounded-full border border-gray-200">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Обновление материалов...</span>
            </div>
          </motion.div>
        )}

        {/* Materials List */}
        {(materials.length > 0 || !loading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {materials.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="bg-white/60 backdrop-blur rounded-2xl p-12 border border-gray-200 shadow-lg inline-block">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет материалов</h3>
                  <p className="text-gray-600">Материалы для этого предмета пока не добавлены</p>
                </div>
              </div>
            ) : (
              materials.map((material, index) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  index={index}
                  onClick={() => handleMaterialClick(material)}
                />
              ))
            )}
          </motion.div>
        )}

        {/* Material Modal */}
        {selectedMaterial && (
          <MaterialModal
            isOpen={showMaterialModal}
            onClose={closeMaterialModal}
            material={selectedMaterial}
          />
        )}
      </div>
    </div>
  );
}