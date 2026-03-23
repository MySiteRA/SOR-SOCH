import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Key, Edit, Trash2, Copy, Plus, Calendar, Upload, FileText,
  Users, BookOpen, Home, LogOut, X, Download, ExternalLink, Image, Minus, File,
  RefreshCw, Loader2, CheckCircle, AlertCircle, Clock, MapPin, User, FileSpreadsheet
} from 'lucide-react';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import FileUpload from '../components/FileUpload';
import FilePreview from '../components/FilePreview';
import FilePreviewModal from '../components/FilePreviewModal';
import {
  getClasses, getStudentsByClass, getStudent, getStudentKeys,
  getSubjects, getMaterialsBySubjectAndGrade, generateKey,
  revokeKey, updateStudentUrl, updateKeyExpiration,
  createMaterial, deleteMaterial, resetStudentPassword, extractGradeFromClassName
} from '../lib/api';
import { generateFileId, validateImageFile, validateFile, fileToDataUrl, getFileNameFromUrl, isImageFile } from '../utils/fileUtils';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import type { Class, Student, Key as KeyType, Subject, Material } from '../lib/supabase';

type AdminView = 'main' | 'classes' | 'students' | 'student-profile' | 'sor' | 'soch' | 'subjects' | 'materials' | 'schedule';

interface ContentItem {
  type: 'text' | 'link' | 'image' | 'file';
  value: string;
}

interface FileItem {
  id: string;
  type: 'file' | 'image';
  name: string;
  url: string;
  isLocal?: boolean;
}

interface AdminPageProps {
  onLogout: () => void;
  onShowStudents: () => void;
}

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

export default function AdminPage({ onLogout, onShowStudents }: AdminPageProps) {
  // ====== Основные состояния ======
  const [view, setView] = useState<AdminView>('main');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [currentSection, setCurrentSection] = useState<'SOR' | 'SOCH'>('SOR');
  const [studentKeys, setStudentKeys] = useState<KeyType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ====== Расписание ======
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [uploadingClass, setUploadingClass] = useState<string | null>(null);

  // ====== Модальные окна ======
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState(false);
  const [showKeyResultModal, setShowKeyResultModal] = useState(false);
  const [showEditUrlModal, setShowEditUrlModal] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);

  // ====== Формы ======
  const [generatedKey, setGeneratedKey] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [keyExpiration, setKeyExpiration] = useState('');
  const [selectedKey, setSelectedKey] = useState<KeyType | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  
  // Форма материала
  const [materialTitle, setMaterialTitle] = useState('');
  const [enabledContentTypes, setEnabledContentTypes] = useState<Set<string>>(new Set());
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  // ====== Загрузка данных ======
  useEffect(() => {
    if (view === 'classes' || view === 'sor' || view === 'soch' || view === 'students' || view === 'subjects' || view === 'schedule') {
      loadClasses();
    }
  }, [view]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const classData = await getClasses();
      setClasses(classData);
    } catch (err) {
      setError('Ошибка загрузки классов');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classItem: Class) => {
    try {
      setLoading(true);
      const studentData = await getStudentsByClass(classItem.id);
      setStudents(studentData);
      setSelectedClass(classItem);
      if (view === 'students') {
        // Остаемся в разделе студентов
      } else {
        setView('student-profile');
      }
    } catch (err) {
      setError('Ошибка загрузки учеников');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentProfile = async (student: Student) => {
    try {
      setLoading(true);
      const [studentData, keys] = await Promise.all([
        getStudent(student.id),
        getStudentKeys(student.id)
      ]);
      if (studentData) {
        setSelectedStudent(studentData);
        setStudentKeys(keys);
        setEditingUrl(studentData.url || '');
        setView('student-profile');
      }
    } catch (err) {
      setError('Ошибка загрузки профиля ученика');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (grade: number) => {
    try {
      setLoading(true);
      const subjectData = await getSubjects();
      setSubjects(subjectData);
      setSelectedGrade(grade);
      setView('subjects');
    } catch (err) {
      setError('Ошибка загрузки предметов');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async (subject: Subject, grade: number) => {
    try {
      setLoading(true);
      const materialData = await getMaterialsBySubjectAndGrade(subject.id, grade, currentSection);
      setMaterials(materialData);
      setSelectedSubject(subject);
      setView('materials');
    } catch (err) {
      setError('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (classItem: Class) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedClass(classItem);

      const { data, error: scheduleError } = await supabase
        .from('schedule')
        .select('*')
        .eq('class_id', classItem.id)
        .order('day_of_week')
        .order('lesson_number');

      if (scheduleError) throw scheduleError;

      setSchedule(data || []);
    } catch (err) {
      setError('Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  };

  // ====== Обработчики действий ======
  const handleSectionChange = (section: 'SOR' | 'SOCH') => {
    setCurrentSection(section);
    setView(section.toLowerCase() as 'sor' | 'soch');
    setSelectedGrade(null);
    setSelectedSubject(null);
    setMaterials([]);
    setSubjects([]);
  };

  const handleGenerateKey = async () => {
    if (!selectedStudent) return;
    try {
      const expiresAt = keyExpiration ? new Date(keyExpiration).toISOString() : undefined;
      
      const keyValue = await generateKey(selectedStudent.id, expiresAt);
      
      setGeneratedKey(keyValue);
      setShowGenerateKeyModal(false);
      setShowKeyResultModal(true);
      setKeyExpiration('');
      const updatedKeys = await getStudentKeys(selectedStudent.id);
      setStudentKeys(updatedKeys);
      setSuccess('Ключ успешно сгенерирован');
    } catch (err) {
      setError('Ошибка генерации ключа');
    }
  };

  const handleRevokeKey = async (key: KeyType) => {
    if (!confirm('Вы уверены, что хотите отозвать этот ключ?')) return;
    try {
      await revokeKey(key.id);
      const updatedKeys = await getStudentKeys(selectedStudent!.id);
      setStudentKeys(updatedKeys);
      setSuccess('Ключ успешно отозван');
    } catch (err) {
      setError('Ошибка аннулирования ключа');
    }
  };

  const handleUpdateUrl = async () => {
    if (!selectedStudent) return;
    try {
      await updateStudentUrl(selectedStudent.id, editingUrl);
      setSelectedStudent({ ...selectedStudent, url: editingUrl });
      setShowEditUrlModal(false);
      setSuccess('URL успешно обновлен');
    } catch (err) {
      setError('Ошибка обновления URL');
    }
  };

  const handleUpdateExpiration = async () => {
    if (!selectedKey) return;
    try {
      const expiresAt = keyExpiration ? new Date(keyExpiration).toISOString() : null;
      await updateKeyExpiration(selectedKey.id, expiresAt);
      const updatedKeys = await getStudentKeys(selectedStudent!.id);
      setStudentKeys(updatedKeys);
      setShowExpirationModal(false);
      setSelectedKey(null);
      setKeyExpiration('');
      setSuccess('Срок действия ключа обновлен');
    } catch (err) {
      setError('Ошибка обновления срока действия');
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'file') => {
    try {
      // Валидация файла
      const validation = type === 'image' ? validateImageFile(file) : validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Ошибка валидации файла');
        return;
      }

      // Конвертируем файл в data URL для локального хранения
      const dataUrl = await fileToDataUrl(file);
      
      const fileItem: FileItem = {
        id: generateFileId(),
        type,
        name: file.name,
        url: dataUrl,
        isLocal: true
      };

      setUploadedFiles(prev => [...prev, fileItem]);
      setSuccess(`${type === 'image' ? 'Изображение' : 'Файл'} успешно добавлен`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Ошибка загрузки файла');
    }
  };

  const handleUrlAdd = (url: string, type: 'image' | 'file') => {
    const fileItem: FileItem = {
      id: generateFileId(),
      type,
      name: getFileNameFromUrl(url),
      url,
      isLocal: false
    };

    setUploadedFiles(prev => [...prev, fileItem]);
    setSuccess(`${type === 'image' ? 'Изображение' : 'Файл'} по ссылке добавлен`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFilePreview = (file: FileItem) => {
    setPreviewFile(file);
    setShowFilePreview(true);
  };

  const handleAddMaterial = async () => {
    if (!materialTitle.trim() || !selectedSubject || !selectedGrade || (contentItems.length === 0 && uploadedFiles.length === 0)) {
      setError('Заполните все обязательные поля');
      return;
    }

    // Проверяем, что все элементы контента заполнены
    const hasEmptyContent = contentItems.some(item => !item.value.trim());
    if (hasEmptyContent) {
      setError('Заполните все поля контента');
      return;
    }

    try {
      // Объединяем обычные элементы контента с загруженными файлами
      const allContentItems = [
        ...contentItems,
        ...uploadedFiles.map(file => ({
          type: file.type === 'image' ? 'image' : 'file' as 'text' | 'link' | 'image' | 'file',
          value: file.url
        }))
      ];

      // Создаем один материал с JSON контентом
      await createMaterial(
        selectedSubject.id,
        materialTitle.trim(),
        currentSection,
        allContentItems,
        selectedGrade
      );

      setSuccess('Материал успешно добавлен');
      setShowAddMaterialModal(false);
      resetMaterialForm();
      
      // Обновляем список материалов
      const updatedMaterials = await getMaterialsBySubjectAndGrade(selectedSubject.id, selectedGrade, currentSection);
      setMaterials(updatedMaterials);
    } catch (err) {
      setError('Ошибка добавления материала');
    }
  };

  const handleDeleteMaterial = async (material: Material) => {
    if (!confirm(`Удалить материал "${material.title}"?`)) return;

    try {
      await deleteMaterial(material.id);
      setSuccess('Материал удален');
      
      // Обновляем список материалов
      const updatedMaterials = await getMaterialsBySubjectAndGrade(selectedSubject!.id, selectedGrade!, currentSection);
      setMaterials(updatedMaterials);
    } catch (err) {
      setError('Ошибка удаления материала');
    }
  };

  const handleResetPassword = async (student: Student) => {
    if (!confirm(`Сбросить пароль для ${student.name}?`)) return;

    try {
      await resetStudentPassword(student.id);

// Ждём, чтобы Supabase точно сохранил
await new Promise(res => setTimeout(res, 500));

// Берём свежие данные
const updatedStudent = await getStudent(student.id);
setSelectedStudent(updatedStudent);

// Обновляем список учеников
setStudents(prevStudents => 
  prevStudents.map(s => 
    s.id === student.id ? updatedStudent : s
  )
);

      
      // Обновляем локальное состояние студента
      setStudents(prevStudents => 
        prevStudents.map(s => 
          s.id === student.id 
            ? { ...s, password_hash: null }
            : s
        )
      );
      
      // Если это текущий выбранный студент, обновляем и его
      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent({ ...selectedStudent, password_hash: null });
      }
      
      setSuccess(`Пароль для ${student.name} сброшен`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сброса пароля';
      setError(errorMessage);
    }
  };

  const parseExcelFile = (file: File): Promise<Omit<ScheduleItem, 'id' | 'class_id' | 'created_at'>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const scheduleItems: Omit<ScheduleItem, 'id' | 'class_id' | 'created_at'>[] = [];
          
          // Предполагаем, что первая строка содержит заголовки
          // Формат: Урок | Понедельник | Вторник | Среда | Четверг | Пятница | Суббота
          for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex] as any[];
            if (!row || row.length < 2) continue;

            const lessonNumber = parseInt(row[0]) || rowIndex;
            
            // Обрабатываем каждый день недели
            for (let dayIndex = 1; dayIndex < Math.min(row.length, 7); dayIndex++) {
              const cellValue = row[dayIndex];
              if (!cellValue || typeof cellValue !== 'string') continue;

              const dayName = days[dayIndex - 1];
              
              // Парсим содержимое ячейки
              // Ожидаемый формат: "Предмет\nУчитель\nКабинет\n09:00-09:45"
              const lines = cellValue.split('\n').map(line => line.trim()).filter(line => line);
              
              if (lines.length >= 1) {
                const subject = lines[0] || '';
                const teacher = lines[1] || '';
                const room = lines[2] || '';
                const timeRange = lines[3] || '';
                
                // Парсим время
                let startTime = '09:00';
                let endTime = '09:45';
                
                if (timeRange && timeRange.includes('-')) {
                  const [start, end] = timeRange.split('-');
                  if (start && end) {
                    startTime = start.trim();
                    endTime = end.trim();
                  }
                } else {
                  // Стандартное время уроков
                  const lessonTimes = [
                    { start: '08:00', end: '08:45' },
                    { start: '08:55', end: '09:40' },
                    { start: '09:50', end: '10:35' },
                    { start: '10:55', end: '11:40' },
                    { start: '11:50', end: '12:35' },
                    { start: '12:45', end: '13:30' },
                    { start: '13:40', end: '14:25' },
                    { start: '14:35', end: '15:20' },
                    { start: '15:30', end: '16:15' },
                    { start: '16:25', end: '17:10' }
                  ];
                  
                  if (lessonNumber >= 1 && lessonNumber <= lessonTimes.length) {
                    const time = lessonTimes[lessonNumber - 1];
                    startTime = time.start;
                    endTime = time.end;
                  }
                }

                scheduleItems.push({
                  day_of_week: dayName,
                  lesson_number: lessonNumber,
                  subject,
                  teacher,
                  room,
                  start_time: startTime,
                  end_time: endTime
                });
              }
            }
          }

          resolve(scheduleItems);
        } catch (error) {
          reject(new Error('Ошибка парсинга Excel файла'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleScheduleFileUpload = async (classItem: Class, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/i)) {
      setError('Пожалуйста, выберите файл Excel (.xls или .xlsx)');
      return;
    }

    try {
      setUploadingClass(classItem.id);
      setError(null);
      setSuccess(null);

      // Не загружаем файл в Supabase Storage (ибо нет необходимости хранить сам файл, нам нужны только спарсенные данные для таблицы)
      // Парсим Excel файл напрямую
      const scheduleItems = await parseExcelFile(file);
      
      if (scheduleItems.length === 0) {
        setError('В файле не найдено данных расписания');
        return;
      }

      // Удаляем существующее расписание для класса
      const { error: deleteError } = await supabase
        .from('schedule')
        .delete()
        .eq('class_id', classItem.id);

      if (deleteError) throw deleteError;

      // Добавляем новое расписание
      const scheduleData = scheduleItems.map(item => ({
        class_id: classItem.id,
        ...item
      }));

      const { error: insertError } = await supabase
        .from('schedule')
        .insert(scheduleData);

      if (insertError) throw insertError;

      setSuccess(`Расписание для класса ${classItem.name} успешно загружено (${scheduleItems.length} записей)`);
      setTimeout(() => setSuccess(null), 5000);
      
      // Если это выбранный класс, обновляем расписание
      if (selectedClass?.id === classItem.id) {
        await loadSchedule(classItem);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки расписания');
    } finally {
      setUploadingClass(null);
      // Сбрасываем значение input
      event.target.value = '';
    }
  };

  const resetMaterialForm = () => {
    setMaterialTitle('');
    setEnabledContentTypes(new Set());
    setContentItems([]);
    setUploadedFiles([]);
  };

  const handleContentTypeToggle = (type: string) => {
    setEnabledContentTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
        // Удаляем все элементы этого типа
        setContentItems(prevItems => prevItems.filter(item => item.type !== type));
      } else {
        newSet.add(type);
        // Добавляем первый элемент этого типа
        setContentItems(prevItems => [...prevItems, { type: type as any, value: '' }]);
      }
      return newSet;
    });
  };

  const addContentItem = (type: string) => {
    setContentItems(prev => [...prev, { type: type as any, value: '' }]);
  };

  const updateContentItem = (index: number, value: string) => {
    setContentItems(prev => prev.map((item, i) => 
      i === index ? { ...item, value } : item
    ));
  };

  const removeContentItem = (index: number) => {
    setContentItems(prev => {
      const newItems = prev.filter((_, i) => i !== index);
      // Если удалили все элементы типа, отключаем чекбокс
      const removedType = prev[index].type;
      const hasOtherItemsOfType = newItems.some(item => item.type === removedType);
      if (!hasOtherItemsOfType) {
        setEnabledContentTypes(prevTypes => {
          const newSet = new Set(prevTypes);
          newSet.delete(removedType);
          return newSet;
        });
      }
      return newItems;
    });
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Текст';
      case 'image': return 'Изображение';
      case 'file': return 'Файл';
      case 'link': return 'Ссылка';
      default: return type;
    }
  };

  const getScheduleForDay = (day: string) => {
    return schedule
      .filter(item => item.day_of_week === day)
      .sort((a, b) => a.lesson_number - b.lesson_number);
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Убираем секунды
  };

  const handleBack = () => {
    if (view === 'materials') {
      setView('subjects');
      setSelectedSubject(null);
      setMaterials([]);
    } else if (view === 'subjects') {
      setView(currentSection.toLowerCase() as 'sor' | 'soch');
      setSelectedGrade(null);
      setSubjects([]);
    } else if (view === 'sor' || view === 'soch') {
      setView('main');
      setSelectedGrade(null);
    } else if (view === 'student-profile') {
      setView('students');
      setSelectedStudent(null);
      setStudentKeys([]);
    } else if (view === 'students') {
      if (selectedClass) {
        setView('students');
        setSelectedClass(null);
        setStudents([]);
      } else {
        setView('main');
      }
    } else if (view === 'classes') {
      setView('main');
      setSelectedClass(null);
      setStudents([]);
    } else if (view === 'schedule') {
      if (selectedClass) {
        setSelectedClass(null);
        setSchedule([]);
      } else {
        setView('main');
      }
    }
  };

  const closeAllModals = () => {
    setShowGenerateKeyModal(false);
    setShowKeyResultModal(false);
    setShowEditUrlModal(false);
    setShowExpirationModal(false);
    setShowAddMaterialModal(false);
    setShowImageModal(false);
    setShowFilePreview(false);
    setGeneratedKey('');
    setKeyExpiration('');
    setSelectedKey(null);
    setSelectedImage('');
    setPreviewFile(null);
    resetMaterialForm();
    setError(null);
    setSuccess(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Скопировано в буфер обмена');
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const handleContentClick = (material: Material) => {
    // Открываем модальное окно материала
    // Эта функция будет обрабатываться в родительском компоненте
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'file': return <Download className="w-4 h-4" />;
      case 'link': return <ExternalLink className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // ====== Рендер ======
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 transform rotate-12">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">
                  Админ<span className="text-indigo-600">Панель</span>
                </h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">System v5.0</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center bg-slate-100/50 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/40 shadow-inner">
              <button
                onClick={() => setView('main')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-[1.5rem] transition-all duration-300 font-black uppercase text-[10px] tracking-widest ${
                  view === 'main' 
                    ? 'bg-white text-indigo-600 shadow-premium' 
                    : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Главная</span>
              </button>

              <button
                onClick={() => handleSectionChange('SOR')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-[1.5rem] transition-all duration-300 font-black uppercase text-[10px] tracking-widest ${
                  view === 'sor' || (view === 'materials' && currentSection === 'SOR')
                    ? 'bg-white text-emerald-600 shadow-premium'
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>СОР</span>
              </button>

              <button
                onClick={() => handleSectionChange('SOCH')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-[1.5rem] transition-all duration-300 font-black uppercase text-[10px] tracking-widest ${
                  view === 'soch' || (view === 'materials' && currentSection === 'SOCH')
                    ? 'bg-white text-indigo-600 shadow-premium'
                    : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>СОЧ</span>
              </button>

              <button
                onClick={() => setView('students')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-[1.5rem] transition-all duration-300 font-black uppercase text-[10px] tracking-widest ${
                  view === 'students' || view === 'student-profile'
                    ? 'bg-white text-orange-600 shadow-premium'
                    : 'text-slate-500 hover:text-orange-600'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Ученики</span>
              </button>

              <button
                onClick={() => setView('schedule')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-[1.5rem] transition-all duration-300 font-black uppercase text-[10px] tracking-widest ${
                  view === 'schedule'
                    ? 'bg-white text-purple-600 shadow-premium'
                    : 'text-slate-500 hover:text-purple-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Расписание</span>
              </button>
            </nav>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="flex items-center space-x-2 bg-rose-50 text-rose-600 px-5 py-3 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm font-black uppercase text-[10px] tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Выход</span>
            </motion.button>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden mt-6 grid grid-cols-5 gap-2 bg-slate-100/50 p-1.5 rounded-[2rem] border border-white/40">
            {[
              { id: 'main', icon: Home, label: 'Обзор', color: 'indigo' },
              { id: 'sor', icon: BookOpen, label: 'СОР', color: 'emerald' },
              { id: 'soch', icon: FileText, label: 'СОЧ', color: 'indigo' },
              { id: 'students', icon: Users, label: 'Дети', color: 'orange' },
              { id: 'schedule', icon: Calendar, label: 'Уроки', color: 'purple' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => item.id === 'sor' || item.id === 'soch' ? handleSectionChange(item.id.toUpperCase() as any) : setView(item.id as any)}
                className={`flex flex-col items-center justify-center space-y-1 py-3 rounded-2xl transition-all ${
                  (view === item.id || (item.id === 'sor' && currentSection === 'SOR' && view === 'materials') || (item.id === 'soch' && currentSection === 'SOCH' && view === 'materials'))
                    ? `bg-white text-${item.color}-600 shadow-premium` 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        {view !== 'main' && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад</span>
          </motion.button>
        )}

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </motion.div>
          )}
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Dashboard */}
        {view === 'main' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-6xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter mb-4">
                Панель <span className="text-indigo-600 italic">Управления</span>
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Центральный узел SOR-SOCH System</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* СОР Widget */}
              <motion.div
                whileHover={{ scale: 1.02, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSectionChange('SOR')}
                className="col-span-1 lg:col-span-2 premium-card relative overflow-hidden group cursor-pointer p-10 flex flex-col justify-between min-h-[280px] border-emerald-100"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-emerald-500/10 transition-all duration-700"></div>
                <div className="bg-emerald-500 w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-emerald-100 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Архив СОР</h3>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Управление суммативным оцениванием</p>
                </div>
              </motion.div>

              {/* СОЧ Widget */}
              <motion.div
                whileHover={{ scale: 1.02, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSectionChange('SOCH')}
                className="col-span-1 lg:col-span-2 premium-card relative overflow-hidden group cursor-pointer p-10 flex flex-col justify-between min-h-[280px] border-indigo-100"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-indigo-500/10 transition-all duration-700"></div>
                <div className="bg-indigo-600 w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100 transform -rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Архив СОЧ</h3>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Итоговое оценивание за четверть</p>
                </div>
              </motion.div>

              {/* Ученики Widget */}
              <motion.div
                whileHover={{ scale: 1.02, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('students')}
                className="col-span-1 lg:col-span-2 premium-card relative overflow-hidden group cursor-pointer p-10 flex flex-col justify-between min-h-[280px] border-orange-100 bg-gradient-to-br from-white to-orange-50/30"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-orange-500/10 transition-all duration-700"></div>
                <div className="bg-orange-500 w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-orange-100 transform rotate-45 group-hover:rotate-0 transition-transform duration-500">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Ученики</h3>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Контроль доступа и профили</p>
                </div>
              </motion.div>

              {/* Расписание Widget */}
              <motion.div
                whileHover={{ scale: 1.02, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('schedule')}
                className="col-span-1 lg:col-span-2 premium-card relative overflow-hidden group cursor-pointer p-10 flex flex-col justify-between min-h-[280px] border-purple-100 bg-gradient-to-br from-white to-purple-50/30"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-purple-500/10 transition-all duration-700"></div>
                <div className="bg-purple-600 w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-purple-100 transform -rotate-45 group-hover:rotate-0 transition-transform duration-500">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Расписание</h3>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Адаптивный учебный график</p>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}

        {/* Classes Grid */}
        {(view === 'sor' || view === 'soch') && !selectedGrade && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-4 uppercase">
                {view === 'sor' ? 'Архив СОР' : 'Архив СОЧ'}
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Выберите параллель обучения</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {Array.from(new Set(classes.map(cls => extractGradeFromClassName(cls.name))))
                .sort((a, b) => b - a)
                .map((grade, index) => (
                <motion.div
                  key={grade}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => loadSubjects(grade)}
                  className="premium-card relative overflow-hidden group cursor-pointer p-8 flex flex-col items-center justify-center aspect-square border-slate-100"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${view === 'sor' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${view === 'sor' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-50' : 'bg-indigo-50 text-indigo-600 shadow-indigo-50'}`}>
                    <span className="text-3xl font-black tracking-tighter">{grade}</span>
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-600 transition-colors">КЛАСС</h3>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Students Classes Grid */}
        {view === 'students' && !selectedClass && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-4 uppercase">
                Ученики
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Выберите класс для управления</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => loadStudents(classItem)}
                  className="premium-card relative overflow-hidden group cursor-pointer p-8 flex flex-col items-center justify-center border-orange-100"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all duration-700"></div>
                  <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-xl shadow-orange-50 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12 group-hover:bg-orange-500 group-hover:text-white">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{classItem.name}</h3>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Subjects Grid */}
        {view === 'subjects' && selectedGrade && !selectedSubject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-4 uppercase">
                {currentSection} • {selectedGrade} КЛАСС
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Выберите предмет для управления контентом</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => loadMaterials(subject, selectedGrade)}
                  className="premium-card p-6 group cursor-pointer border-slate-100 flex items-center space-x-5"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl ${currentSection === 'SOR' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-50' : 'bg-indigo-50 text-indigo-600 shadow-indigo-50'}`}>
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{subject.name}</h3>
                    <p className="text-slate-400 font-black uppercase text-[8px] tracking-widest">Открыть материалы</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Materials View */}
        {view === 'materials' && selectedSubject && selectedGrade && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {currentSection} - {selectedGrade} класс - {selectedSubject.name}
              </h2>
            </div>

            {/* Add Material Button */}
            <div className="mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAddMaterialModal(true)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 shadow-lg ${
                  currentSection === 'SOR' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>Добавить материал</span>
              </motion.button>
            </div>

            {/* Materials Grid */}
            {materials.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Материалы не найдены</h3>
                <p className="text-gray-500">Добавьте первый материал для этого предмета</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {materials.map((material, index) => (
                  <div key={material.id} className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 p-6 cursor-pointer"
                      onClick={() => handleContentClick(material)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-lg ${currentSection === 'SOR' ? 'bg-green-100' : 'bg-purple-100'}`}>
                            <FileText className={`w-5 h-5 ${currentSection === 'SOR' ? 'text-green-600' : 'text-purple-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                              {material.title}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                              <BookOpen className="w-4 h-4" />
                              <span>{material.subject?.name}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(material.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          material.type === 'SOR' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {material.type}
                        </span>
                      </div>
                    </motion.div>
                    
                    {/* Delete button - positioned absolutely */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMaterial(material);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors z-10"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students View */}
        {view === 'students' && selectedClass && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600 mb-3">
                Ученики: {selectedClass.name}
              </h2>
              <p className="text-slate-500 font-medium">Управление профилями учеников и их ключами доступа</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 p-5 group flex flex-col justify-between relative overflow-hidden h-full"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all duration-500"></div>
                  
                  <div className="flex items-start space-x-4 mb-6 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight mb-1 group-hover:text-orange-600 transition-colors">{student.name}</h3>
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-2 h-2 rounded-full ${student.password_hash ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                        <p className={`text-xs font-semibold uppercase tracking-wider ${student.password_hash ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {student.password_hash ? 'Пароль установлен' : 'Без пароля'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 relative z-10 mt-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => loadStudentProfile(student)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-600 px-3 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors font-semibold text-sm"
                    >
                      <Key className="w-4 h-4" />
                      <span>Ключи</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleResetPassword(student)}
                      className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      title="Сбросить пароль"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Student Profile View */}
        {view === 'student-profile' && selectedStudent && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">{selectedStudent.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Информация</h3>
                  <p><strong>ID:</strong> {selectedStudent.id}</p>
                  <p><strong>Пароль:</strong> {selectedStudent.password_hash ? 'Установлен' : 'Не установлен'}</p>
                  <p><strong>URL:</strong> {selectedStudent.url || 'Не установлен'}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Действия</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowGenerateKeyModal(true)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Key className="w-4 h-4 inline mr-2" />
                      Сгенерировать ключ
                    </button>
                    <button
                      onClick={() => setShowEditUrlModal(true)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4 inline mr-2" />
                      Изменить URL
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Keys List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Ключи доступа</h3>
              {studentKeys.length === 0 ? (
                <p className="text-gray-500">Ключи не найдены</p>
              ) : (
                <div className="space-y-3">
                  {studentKeys.map((key) => (
                    <div key={key.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm">{key.key_value}</p>
                          <p className="text-sm text-gray-500">
                            Создан: {formatDate(key.created_at)}
                          </p>
                          {key.expires_at && (
                            <p className="text-sm text-gray-500">
                              Истекает: {formatDate(key.expires_at)}
                            </p>
                          )}
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {key.status === 'active' ? 'Активен' : 'Отозван'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(key.key_value)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {key.status === 'active' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedKey(key);
                                  setShowExpirationModal(true);
                                }}
                                className="p-2 text-yellow-600 hover:bg-yellow-100 rounded transition-colors"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRevokeKey(key)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule View */}
        {view === 'schedule' && (
          <div className="space-y-8">
            {!selectedClass ? (
              <>
                {/* Instructions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Инструкция по загрузке расписания</h3>
                  <div className="text-blue-800 space-y-2 text-sm">
                    <p>• Файл должен быть в формате Excel (.xls или .xlsx)</p>
                    <p>• Первая строка - заголовки: Урок | Понедельник | Вторник | Среда | Четверг | Пятница | Суббота</p>
                    <p>• В каждой ячейке урока указывайте данные через перенос строки:</p>
                    <p className="ml-4 font-mono bg-blue-100 p-2 rounded">
                      Название предмета<br/>
                      Учитель<br/>
                      Кабинет<br/>
                      09:00-09:45
                    </p>
                    <p>• Если время не указано, будет использовано стандартное расписание звонков</p>
                  </div>
                </motion.div>

                {/* Classes List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {classes.map((classItem, index) => (
                      <motion.div
                        key={classItem.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
                      >
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-indigo-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{classItem.name}</h3>
                          <p className="text-gray-600 text-sm">Загрузите расписание для класса</p>
                        </div>

                        <div className="space-y-4">
                          <label className="block">
                            <input
                              type="file"
                              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                              onChange={(e) => handleScheduleFileUpload(classItem, e)}
                              className="hidden"
                              disabled={uploadingClass === classItem.id}
                            />
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                                uploadingClass === classItem.id
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                              }`}
                            >
                              {uploadingClass === classItem.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Загрузка...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span>Загрузить расписание</span>
                                </>
                              )}
                            </motion.div>
                          </label>

                          <button
                            onClick={() => loadSchedule(classItem)}
                            className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Просмотреть расписание</span>
                          </button>

                          <div className="text-center">
                            <p className="text-xs text-gray-500">
                              Поддерживаются файлы .xls и .xlsx
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            ) : (
              /* Schedule Display */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setSelectedClass(null);
                        setSchedule([]);
                      }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Назад к классам</span>
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Расписание класса {selectedClass.name}
                      </h2>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => loadSchedule(selectedClass)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Обновить</span>
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : schedule.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center"
                  >
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-600 mb-2">Расписание не загружено</h3>
                    <p className="text-gray-500">Загрузите файл Excel с расписанием для этого класса</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">Расписание на неделю</h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200 min-w-[80px]">
                              Урок
                            </th>
                            {days.map(day => (
                              <th key={day} className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200 min-w-[200px]">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(lessonNumber => (
                            <tr key={lessonNumber} className="hover:bg-gray-50">
                              <td className="px-4 py-4 font-medium text-gray-900 border-r border-gray-200 text-center">
                                {lessonNumber}
                              </td>
                              {days.map(day => {
                                const daySchedule = getScheduleForDay(day);
                                const lesson = daySchedule.find(item => item.lesson_number === lessonNumber);
                                
                                return (
                                  <td key={`${day}-${lessonNumber}`} className="px-4 py-4 border-r border-gray-200">
                                    {lesson ? (
                                      <div className="space-y-1">
                                        <div className="font-medium text-gray-900 text-sm">
                                          {lesson.subject}
                                        </div>
                                        <div className="text-xs text-gray-600 flex items-center space-x-1">
                                          <User className="w-3 h-3" />
                                          <span>{lesson.teacher}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                                          <MapPin className="w-3 h-3" />
                                          <span>{lesson.room}</span>
                                        </div>
                                        <div className="text-xs text-indigo-600 font-medium flex items-center space-x-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 text-center text-sm">—</div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <Modal
          isOpen={showGenerateKeyModal}
          onClose={closeAllModals}
          title="Генерация ключа"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Создать новый ключ доступа для ученика</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Срок действия (необязательно)
              </label>
              <input
                type="datetime-local"
                value={keyExpiration}
                onChange={(e) => setKeyExpiration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleGenerateKey}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Сгенерировать ключ
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showKeyResultModal}
          onClose={closeAllModals}
          title="Ключ сгенерирован"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Новый ключ доступа:</p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="font-mono text-lg">{generatedKey}</p>
            </div>
            <button
              onClick={() => copyToClipboard(generatedKey)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Copy className="w-4 h-4 inline mr-2" />
              Скопировать
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showEditUrlModal}
          onClose={closeAllModals}
          title="Изменить URL"
        >
          <div className="space-y-4">
            <p className="text-gray-600">URL для перенаправления после входа</p>
            <input
              type="url"
              value={editingUrl}
              onChange={(e) => setEditingUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleUpdateUrl}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showExpirationModal}
          onClose={closeAllModals}
          title="Изменить срок действия"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Установить новый срок действия ключа</p>
            <input
              type="datetime-local"
              value={keyExpiration}
              onChange={(e) => setKeyExpiration(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleUpdateExpiration}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Обновить
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showAddMaterialModal}
          onClose={closeAllModals}
          title={`Добавить материал - ${currentSection} - ${selectedGrade} класс - ${selectedSubject?.name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название материала
              </label>
              <input
                type="text"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите название"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Информация
              </label>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <p><strong>Предмет:</strong> {selectedSubject?.name}</p>
                <p><strong>Класс:</strong> {selectedGrade}</p>
                <p><strong>Тип:</strong> {currentSection}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Типы содержимого
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['text', 'link', 'image', 'file']).map(type => (
                  <label key={type} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={enabledContentTypes.has(type)}
                      onChange={() => handleContentTypeToggle(type)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      {getContentIcon(type)}
                      <span className="text-sm font-medium">{getContentTypeLabel(type)}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Поля ввода для каждого включенного типа */}
            {Array.from(enabledContentTypes).map(type => {
              const itemsOfType = contentItems.filter(item => item.type === type);
              
              return (
                <div key={type} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      {getContentTypeLabel(type)}
                    </label>
                    <button
                      type="button"
                      onClick={() => addContentItem(type)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Добавить ещё {getContentTypeLabel(type).toLowerCase()}
                    </button>
                  </div>
                  
                  {itemsOfType.map((item, itemIndex) => {
                    const globalIndex = contentItems.findIndex(ci => ci === item);
                    return (
                      <div key={globalIndex} className="flex items-start space-x-2">
                        <div className="flex-1">
                          {type === 'text' ? (
                            <textarea
                              value={item.value}
                              onChange={(e) => updateContentItem(globalIndex, e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Введите текст"
                            />
                          ) : type === 'image' ? (
                            <div className="space-y-4">
                              <FileUpload
                                onFileSelect={(file) => handleFileUpload(file, 'image')}
                                onUrlAdd={(url) => handleUrlAdd(url, 'image')}
                                accept="image/*"
                                type="image"
                                placeholder="https://example.com/image.jpg"
                              />
                            </div>
                          ) : type === 'file' ? (
                            <div className="space-y-4">
                              <FileUpload
                                onFileSelect={(file) => handleFileUpload(file, 'file')}
                                onUrlAdd={(url) => handleUrlAdd(url, 'file')}
                                accept="*/*"
                                type="file"
                                placeholder="https://example.com/file.pdf"
                              />
                            </div>
                          ) : (
                            <input
                              type={type === 'link' ? 'url' : 'text'}
                              value={item.value}
                              onChange={(e) => updateContentItem(globalIndex, e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={
                                type === 'link' ? 'https://example.com' : 
                                type === 'image' ? 'https://example.com/image.jpg' :
                                'https://example.com/file.pdf'
                              }
                            />
                          )}
                        </div>
                        {itemsOfType.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeContentItem(globalIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            
            {/* File Preview */}
            <FilePreview
              files={uploadedFiles}
              onRemove={handleFileRemove}
              onPreview={handleFilePreview}
            />

            <button
              onClick={handleAddMaterial}
              disabled={
                !materialTitle.trim() || 
                !selectedGrade ||
                (contentItems.length === 0 && uploadedFiles.length === 0) ||
                contentItems.some(item => !item.value.trim())
              }
              className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed ${
                currentSection === 'SOR' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Добавить материал
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showImageModal}
          onClose={closeAllModals}
          title="Просмотр изображения"
        >
          <div className="text-center">
            <img
              src={selectedImage}
              alt="Просмотр"
              className="max-w-full max-h-96 object-contain rounded-lg"
            />
          </div>
        </Modal>
        
        {/* File Preview Modal */}
        <FilePreviewModal
          isOpen={showFilePreview}
          onClose={() => setShowFilePreview(false)}
          file={previewFile}
        />
      </div>
    </div>
  );
}