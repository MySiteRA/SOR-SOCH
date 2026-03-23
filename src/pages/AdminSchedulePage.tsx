import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Calendar, RefreshCw, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LoadingSpinner from '../components/LoadingSpinner';
import ScheduleUploadTest from '../components/ScheduleUploadTest';
import { getClasses } from '../lib/api';
import { uploadScheduleFile } from '../lib/api';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import type { Class } from '../lib/supabase';

interface ScheduleItem {
  day_of_week: string;
  lesson_number: number;
  subject: string;
  teacher: string;
  room: string;
  start_time: string;
  end_time: string;
}

export default function AdminSchedulePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingClass, setUploadingClass] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const handleBack = () => {
    navigate('/admin');
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const classData = await getClasses();
      setClasses(classData);
    } catch (err) {
      setError('Ошибка загрузки классов');
    } finally {
      setLoading(false);
    }
  };

  const parseExcelFile = (file: File): Promise<ScheduleItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const scheduleItems: ScheduleItem[] = [];
          const daysLower = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
          const exactDaysStr = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
          
          let headerRowIndex = -1;
          const dayColumns = new Map<number, string>(); // colIndex -> DayName
          let lessonNumColIndex = 0; // Default

          // Ищем строку с заголовками (днями недели)
          for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
            const row = jsonData[i] as any[];
            if (!row) continue;
            
            let foundDays = 0;
            for (let j = 0; j < row.length; j++) {
              const cellStr = String(row[j] || '').toLowerCase().trim();
              const dayMatch = daysLower.findIndex(d => cellStr.includes(d));
              if (dayMatch !== -1) {
                dayColumns.set(j, exactDaysStr[dayMatch]);
                foundDays++;
              } else if (cellStr.includes('урок') || cellStr.includes('№') || cellStr.includes('номер') || cellStr === 'время') {
                lessonNumColIndex = j;
              }
            }
            if (foundDays >= 2) {
              headerRowIndex = i;
              break;
            }
          }

          // Если заголовки не найдены, используем стандартный шаблон из инструкции
          if (dayColumns.size === 0) {
            dayColumns.set(1, 'Понедельник');
            dayColumns.set(2, 'Вторник');
            dayColumns.set(3, 'Среда');
            dayColumns.set(4, 'Четверг');
            dayColumns.set(5, 'Пятница');
            dayColumns.set(6, 'Суббота');
          }

          const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;

          // Парсим данные начиная со строки после заголовка
          for (let rowIndex = startRow; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex] as any[];
            if (!row || row.length === 0) continue;

            const lessonRaw = row[lessonNumColIndex];
            const lessonNumber = parseInt(String(lessonRaw)) || (rowIndex - startRow + 1);

            for (const [colIndex, dayName] of Array.from(dayColumns.entries())) {
              const cellValue = row[colIndex];
              if (cellValue === undefined || cellValue === null || cellValue === '') continue;

              const cellValueStr = String(cellValue).trim();
              if (cellValueStr === '') continue;
              
              const lines = cellValueStr.split('\n').map(line => line.trim()).filter(line => line);
              
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

          console.log(`Parsed ${scheduleItems.length} items from Excel`);
          resolve(scheduleItems);
        } catch (error) {
          console.error("Parse Excel Failed: ", error);
          reject(new Error('Ошибка парсинга Excel файла'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (classItem: Class, event: React.ChangeEvent<HTMLInputElement>) => {
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

      // Логируем детали для тестирования
      console.log('Starting upload for class:', {
        className: classItem.name,
        classId: classItem.id,
        fileName: file.name,
        fileSize: file.size
      });

      // Загружаем файл в Storage и сохраняем в таблицу schedules
      const publicUrl = await uploadScheduleFile(classItem.id, classItem.name, file);
      
      console.log('File uploaded successfully:', {
        publicUrl,
        className: classItem.name
      });

      // Парсим Excel файл для таблицы schedule
      const scheduleItems = await parseExcelFile(file);
      
      if (scheduleItems.length > 0) {
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
        
        setSuccess(`Расписание для класса ${classItem.name} успешно загружено. Файл сохранен и ${scheduleItems.length} записей добавлено в расписание.`);
      } else {
        setSuccess(`Файл расписания для класса ${classItem.name} успешно загружен. Данные расписания не найдены в файле.`);
      }


      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Schedule upload error:', err);
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка загрузки расписания';
      
      if (err.message?.includes('Invalid key')) {
        errorMessage = 'Ошибка: недопустимые символы в названии файла. Файл был автоматически переименован, попробуйте еще раз.';
      } else if (err.message?.includes('already exists')) {
        errorMessage = 'Файл с таким именем уже существует. Попробуйте еще раз.';
      } else if (err.message?.includes('Bucket not found')) {
        errorMessage = 'Ошибка: bucket "schedules" не найден в Supabase Storage.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setUploadingClass(null);
      // Сбрасываем значение input
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LanguageSwitcher showBackButton={true} onBack={handleBack} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Управление расписанием
              </h1>
              <p className="text-gray-600">
                Загрузите расписание для каждого класса в формате Excel
              </p>
            </div>
            
            <button
              onClick={loadClasses}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Обновить</span>
            </button>
          </div>
        </motion.div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center space-x-2"
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
              className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Инструкция по загрузке</h3>
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
            <p>• Файлы сохраняются в Storage в папке schedules/&lt;класс&gt;/</p>
            <p>• Названия классов с кириллицей автоматически транслитерируются</p>
          </div>
        </motion.div>

        {/* Classes List */}
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
                    onChange={(e) => handleFileUpload(classItem, e)}
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

                {/* Показываем загруженные файлы */}

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Поддерживаются файлы .xls и .xlsx
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Sample Schedule Format */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Пример формата Excel файла</span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200">Урок</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200">Понедельник</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200">Вторник</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200">Среда</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200">Четверг</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 border-r border-gray-200">Пятница</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Суббота</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-200">1</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200 whitespace-pre-line text-xs">
                    Математика{'\n'}Иванов И.И.{'\n'}Каб. 201{'\n'}08:00-08:45
                  </td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200 whitespace-pre-line text-xs">
                    Русский язык{'\n'}Петрова П.П.{'\n'}Каб. 105{'\n'}08:00-08:45
                  </td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700">...</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-200">2</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200">...</td>
                  <td className="px-4 py-3 text-gray-700">...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Test Upload Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Тестирование загрузки для класса 11-Ё</h3>
          <ScheduleUploadTest 
            className="11-Ё"
            onSuccess={(result) => {
              console.log('Test upload successful:', result);
              setSuccess(`Тест успешен! Файл сохранен: ${result.filePath}`);
              setTimeout(() => setSuccess(null), 10000);
            }}
            onError={(error) => {
              console.error('Test upload failed:', error);
              setError(`Тест не прошел: ${error}`);
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}