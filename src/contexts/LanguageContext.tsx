import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type Language = 'ru' | 'uz' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  cycleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

// i18n словарь
const translations = {
  ru: {
    // Общие
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.back': 'Назад',
    'common.close': 'Закрыть',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.add': 'Добавить',
    'common.search': 'Поиск',
    'common.filter': 'Фильтр',
    'common.export': 'Экспорт',
    'common.copy': 'Копировать',
    'common.copied': 'Скопировано',
    'common.refresh': 'Обновить',
    'common.tryAgain': 'Попробовать еще раз',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.name': 'Имя',
    'common.class': 'Класс',
    'common.returnedToPrevious': 'Вы вернулись в предыдущее меню',
    
    // Главная страница
    'home.title': 'Онлайн ответы на Сор и Соч',
    'home.selectClass': 'Выберите класс',
    'home.selectStudent': 'Выберите ученика из',
    'home.welcome': 'Здравствуйте',
    'home.class': 'Класс',
    
    // Авторизация
    'auth.enterKey': 'Введите ключ',
    'auth.enterPassword': 'Введите пароль',
    'auth.createPassword': 'Создание пароля',
    'auth.continue': 'Продолжить',
    'auth.keyPlaceholder': 'Ключ доступа',
    'auth.passwordPlaceholder': 'Пароль',
    'auth.newPasswordPlaceholder': 'Новый пароль',
    'auth.confirmPasswordPlaceholder': 'Подтвердите пароль',
    'auth.login': 'Войти',
    'auth.logout': 'Выйти',
    'auth.forgetSession': 'Забыть сеанс',
    'auth.sessionActive': 'Активный сеанс',
    'auth.createPasswordButton': 'Создать пароль',
    'auth.invalidKey': 'Неверный ключ',
    'auth.invalidOrUsedKey': 'Неверный или использованный ключ',
    'auth.invalidPassword': 'Неверный пароль',
    'auth.passwordMismatch': 'Пароли не совпадают',
    'auth.passwordTooShort': 'Пароль должен содержать минимум 4 символа',
    'auth.passwordNotSet': 'Пароль не установлен',
    'auth.keyVerified': 'Ключ верный! Создайте пароль для удобного входа в будущем.',
    'auth.passwordSet': 'Пароль установлен',
    'auth.noPassword': 'Требуется ключ',
    'auth.quickLogin': 'Быстрый вход (3 дня)',
    'auth.passwordCreated': 'Пароль создан',
    'auth.successfulLogin': 'Успешный вход',
    
    // Админ-панель
    'admin.title': 'Админ-панель',
    'admin.login': 'Вход для администратора',
    'admin.username': 'Логин',
    'admin.password': 'Пароль',
    'admin.invalidCredentials': 'Неверные учетные данные',
    'admin.logout': 'Выйти',
    'admin.main': 'Главная',
    'admin.students': 'Ученики',
    'admin.classes': 'Классы',
    'admin.sor': 'СОР',
    'admin.soch': 'СОЧ',
    'admin.materials': 'Материалы',
    'admin.logs': 'История',
    'admin.welcome': 'Добро пожаловать в админ-панель',
    'admin.selectSection': 'Выберите раздел для управления',
    
    // Классы и ученики
    'classes.title': 'Классы и зарегистрированные ученики',
    'classes.selectClass': 'Выберите класс',
    'classes.studentsOf': 'Ученики класса',
    'classes.registered': 'зарегистрированных',
    'classes.total': 'всего',
    'classes.noStudents': 'В этом классе пока нет учеников',
    'classes.onlyRegistered': 'Только зарегистрированные',
    'classes.searchPlaceholder': 'Поиск по ученику или классу...',
    'classes.grade': 'Параллель',
    'classes.allGrades': 'Все параллели',
    'classes.exportClass': 'Экспорт класса',
    'classes.exportAll': 'Экспорт всех',
    'classes.copyLink': 'Копировать ссылку',
    'classes.notRegistered': 'Не зарегистрирован',
    'classes.hasUrl': 'Есть URL',
    'classes.noUrl': 'Нет URL',
    'classes.name': 'Имя',
    'classes.class': 'Класс',
    'classes.exportSuccess': 'Экспорт завершен успешно',
    
    // Ключи и пароли
    'keys.generate': 'Сгенерировать ключ',
    'keys.generated': 'Ключ сгенерирован',
    'keys.revoke': 'Отозвать',
    'keys.active': 'Активен',
    'keys.revoked': 'Отозван',
    'keys.created': 'Создан',
    'keys.expires': 'Истекает',
    'keys.expiration': 'Срок действия',
    'keys.noKeys': 'Ключи не найдены',
    'keys.copyKey': 'Скопировать ключ',
    'keys.updateExpiration': 'Изменить срок действия',
    'password.reset': 'Сбросить пароль',
    'password.resetConfirm': 'Сбросить пароль для',
    'password.resetSuccess': 'Пароль сброшен',
    
    // URL управление
    'url.edit': 'Изменить URL',
    'url.placeholder': 'https://example.com',
    'url.updated': 'URL успешно обновлен',
    'url.redirectUrl': 'URL для перенаправления после входа',
    
    // Материалы
    'materials.add': 'Добавить материал',
    'materials.title': 'Название материала',
    'materials.titlePlaceholder': 'Введите название',
    'materials.contentTypes': 'Типы содержимого',
    'materials.text': 'Текст',
    'materials.image': 'Изображение',
    'materials.file': 'Файл',
    'materials.link': 'Ссылка',
    'materials.textContent': 'Текст - содержимое',
    'materials.imageUrl': 'Изображение - URL изображения',
    'materials.fileUrl': 'Файл - URL файла',
    'materials.linkUrl': 'Ссылка - ссылка',
    'materials.textPlaceholder': 'Введите текст',
    'materials.urlPlaceholder': 'https://example.com',
    'materials.imageUrlPlaceholder': 'https://example.com/image.jpg',
    'materials.fileUrlPlaceholder': 'https://example.com/file.pdf',
    'materials.noMaterials': 'Материалы не найдены',
    'materials.noMaterialsDesc': 'Добавьте первый материал для этого предмета',
    'materials.download': 'Скачать',
    'materials.open': 'Открыть',
    'materials.deleteConfirm': 'Удалить материал',
    'materials.added': 'Материал успешно добавлен',
    'materials.deleted': 'Материал удален',
    'materials.fillAllFields': 'Заполните все поля для выбранных типов контента',
    
    // Ошибки
    'error.loadingClasses': 'Ошибка загрузки классов',
    'error.loadingStudents': 'Ошибка загрузки учеников',
    'error.loadingSubjects': 'Ошибка загрузки предметов',
    'error.loadingMaterials': 'Ошибка загрузки материалов',
    'error.keyValidation': 'Ошибка проверки ключа',
    'error.passwordValidation': 'Ошибка проверки пароля',
    'error.passwordCreation': 'Ошибка создания пароля',
    'error.keyGeneration': 'Ошибка генерации ключа',
    'error.keyRevocation': 'Ошибка аннулирования ключа',
    'error.urlUpdate': 'Ошибка обновления URL',
    'error.materialAdd': 'Ошибка добавления материала',
    'error.materialDelete': 'Ошибка удаления материала',
    'error.passwordReset': 'Ошибка сброса пароля',
    
    // Успешные действия
    'success.keyGenerated': 'Ключ успешно сгенерирован',
    'success.keyRevoked': 'Ключ успешно отозван',
    'success.urlUpdated': 'URL успешно обновлен',
    'success.passwordCreated': 'Пароль создан',
    'success.expirationUpdated': 'Срок действия ключа обновлен',
    
    // Генератор ключей
    'keys.generateSuccess': '✅ Ключ успешно сгенерирован',
    'keys.generationError': 'Ошибка генерации ключа',
    
    // Помощь
    'help.howToGetKey': 'Как получить ключ?',
    'help.getKeyDesc': 'Чтобы получить ключ, напишите нам в Telegram:',
    'help.support1': 'Поддержка 1',
    'help.support2': 'Поддержка 2',
    
    // Дашборд студента
    'dashboard.sor': 'СОР',
    'dashboard.soch': 'СОЧ',
    'dashboard.sorDesc': 'Суммативное оценивание за раздел',
    'dashboard.sochDesc': 'Суммативное оценивание за четверть',
    'dashboard.noMaterialsForSubject': 'Материалы для этого предмета пока не добавлены',
    
    // Чат
    'chat.title': 'Чат класса',
    'chat.placeholder': 'Напишите сообщение...',
    'chat.send': 'Отправить',
    'chat.empty': 'Чат пуст',
    'chat.emptyDesc': 'Станьте первым, кто напишет сообщение!',
    'chat.messageCount': 'сообщений',
    'chat.enterToSend': 'Enter - отправить, Shift+Enter - новая строка',
  },
  
  uz: {
    // Общие
    'common.loading': 'Yuklanmoqda...',
    'common.error': 'Xato',
    'common.back': 'Orqaga',
    'common.close': 'Yopish',
    'common.save': 'Saqlash',
    'common.cancel': 'Bekor qilish',
    'common.delete': 'O\'chirish',
    'common.edit': 'Tahrirlash',
    'common.add': 'Qo\'shish',
    'common.search': 'Qidirish',
    'common.filter': 'Filtr',
    'common.export': 'Eksport',
    'common.copy': 'Nusxalash',
    'common.copied': 'Nusxalandi',
    'common.refresh': 'Yangilash',
    'common.tryAgain': 'Qayta urinish',
    'common.yes': 'Ha',
    'common.no': 'Yo\'q',
    'common.name': 'Ism',
    'common.class': 'Sinf',
    'common.returnedToPrevious': 'Siz oldingi menyuga qaytdingiz',
    
    // Главная страница
    'home.title': 'SOR va SOCH uchun onlayn javoblar',
    'home.selectClass': 'Sinfni tanlang',
    'home.selectStudent': 'O\'quvchini tanlang',
    'home.welcome': 'Salom',
    'home.class': 'Sinf',
    
    // Авторизация
    'auth.enterKey': 'Kalitni kiriting',
    'auth.enterPassword': 'Parolni kiriting',
    'auth.createPassword': 'Parol yaratish',
    'auth.continue': 'Davom etish',
    'auth.keyPlaceholder': 'Kirish kaliti',
    'auth.passwordPlaceholder': 'Parol',
    'auth.newPasswordPlaceholder': 'Yangi parol',
    'auth.confirmPasswordPlaceholder': 'Parolni tasdiqlang',
    'auth.login': 'Kirish',
    'auth.logout': 'Chiqish',
    'auth.forgetSession': 'Seansni unutish',
    'auth.sessionActive': 'Faol seans',
    'auth.createPasswordButton': 'Parol yaratish',
    'auth.invalidKey': 'Noto\'g\'ri kalit',
    'auth.invalidOrUsedKey': 'Noto\'g\'ri yoki ishlatilgan kalit',
    'auth.invalidPassword': 'Noto\'g\'ri parol',
    'auth.passwordMismatch': 'Parollar mos kelmaydi',
    'auth.passwordTooShort': 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak',
    'auth.passwordNotSet': 'Parol o\'rnatilmagan',
    'auth.keyVerified': 'Kalit to\'g\'ri! Kelajakda qulay kirish uchun parol yarating.',
    'auth.passwordSet': 'Parol o\'rnatilgan',
    'auth.noPassword': 'Kalit talab qilinadi',
    'auth.quickLogin': 'Tez kirish (3 kun)',
    'auth.passwordCreated': 'Parol yaratildi',
    'auth.successfulLogin': 'Muvaffaqiyatli kirish',
    
    // Админ-панель
    'admin.title': 'Admin panel',
    'admin.login': 'Administrator uchun kirish',
    'admin.username': 'Login',
    'admin.password': 'Parol',
    'admin.invalidCredentials': 'Noto\'g\'ri ma\'lumotlar',
    'admin.logout': 'Chiqish',
    'admin.main': 'Asosiy',
    'admin.students': 'O\'quvchilar',
    'admin.classes': 'Sinflar',
    'admin.sor': 'SOR',
    'admin.soch': 'SOCH',
    'admin.materials': 'Materiallar',
    'admin.logs': 'Tarix',
    'admin.welcome': 'Admin panelga xush kelibsiz',
    'admin.selectSection': 'Boshqarish uchun bo\'limni tanlang',
    
    // Классы и ученики
    'classes.title': 'Sinflar va ro\'yxatdan o\'tgan o\'quvchilar',
    'classes.selectClass': 'Sinfni tanlang',
    'classes.studentsOf': 'sinf o\'quvchilari',
    'classes.registered': 'ro\'yxatdan o\'tgan',
    'classes.total': 'jami',
    'classes.noStudents': 'Bu sinfda hali o\'quvchilar yo\'q',
    'classes.onlyRegistered': 'Faqat ro\'yxatdan o\'tganlar',
    'classes.searchPlaceholder': 'O\'quvchi yoki sinf bo\'yicha qidirish...',
    'classes.grade': 'Parallel',
    'classes.allGrades': 'Barcha parallellar',
    'classes.exportClass': 'Sinfni eksport qilish',
    'classes.exportAll': 'Barchasini eksport qilish',
    'classes.copyLink': 'Havolani nusxalash',
    'classes.notRegistered': 'Ro\'yxatdan o\'tmagan',
    'classes.hasUrl': 'URL bor',
    'classes.noUrl': 'URL yo\'q',
    'classes.name': 'Ism',
    'classes.class': 'Sinf',
    'classes.exportSuccess': 'Eksport muvaffaqiyatli yakunlandi',
    
    // Ключи и пароли
    'keys.generate': 'Kalit yaratish',
    'keys.generated': 'Kalit yaratildi',
    'keys.revoke': 'Bekor qilish',
    'keys.active': 'Faol',
    'keys.revoked': 'Bekor qilingan',
    'keys.created': 'Yaratilgan',
    'keys.expires': 'Tugaydi',
    'keys.expiration': 'Amal qilish muddati',
    'keys.noKeys': 'Kalitlar topilmadi',
    'keys.copyKey': 'Kalitni nusxalash',
    'keys.updateExpiration': 'Amal qilish muddatini o\'zgartirish',
    'password.reset': 'Parolni tiklash',
    'password.resetConfirm': 'Parolni tiklash',
    'password.resetSuccess': 'Parol tiklandi',
    
    // URL управление
    'url.edit': 'URL o\'zgartirish',
    'url.placeholder': 'https://example.com',
    'url.updated': 'URL muvaffaqiyatli yangilandi',
    'url.redirectUrl': 'Kirishdan keyin yo\'naltirish uchun URL',
    
    // Материалы
    'materials.add': 'Material qo\'shish',
    'materials.title': 'Material nomi',
    'materials.titlePlaceholder': 'Nomni kiriting',
    'materials.contentTypes': 'Kontent turlari',
    'materials.text': 'Matn',
    'materials.image': 'Rasm',
    'materials.file': 'Fayl',
    'materials.link': 'Havola',
    'materials.textContent': 'Matn - kontent',
    'materials.imageUrl': 'Rasm - rasm URL',
    'materials.fileUrl': 'Fayl - fayl URL',
    'materials.linkUrl': 'Havola - havola',
    'materials.textPlaceholder': 'Matnni kiriting',
    'materials.urlPlaceholder': 'https://example.com',
    'materials.imageUrlPlaceholder': 'https://example.com/image.jpg',
    'materials.fileUrlPlaceholder': 'https://example.com/file.pdf',
    'materials.noMaterials': 'Materiallar topilmadi',
    'materials.noMaterialsDesc': 'Bu fan uchun birinchi materialni qo\'shing',
    'materials.download': 'Yuklab olish',
    'materials.open': 'Ochish',
    'materials.deleteConfirm': 'Materialni o\'chirish',
    'materials.added': 'Material muvaffaqiyatli qo\'shildi',
    'materials.deleted': 'Material o\'chirildi',
    'materials.fillAllFields': 'Tanlangan kontent turlari uchun barcha maydonlarni to\'ldiring',
    
    // Ошибки
    'error.loadingClasses': 'Sinflarni yuklashda xato',
    'error.loadingStudents': 'O\'quvchilarni yuklashda xato',
    'error.loadingSubjects': 'Fanlarni yuklashda xato',
    'error.loadingMaterials': 'Materiallarni yuklashda xato',
    'error.keyValidation': 'Kalitni tekshirishda xato',
    'error.passwordValidation': 'Parolni tekshirishda xato',
    'error.passwordCreation': 'Parol yaratishda xato',
    'error.keyGeneration': 'Kalit yaratishda xato',
    'error.keyRevocation': 'Kalitni bekor qilishda xato',
    'error.urlUpdate': 'URL yangilashda xato',
    'error.materialAdd': 'Material qo\'shishda xato',
    'error.materialDelete': 'Materialni o\'chirishda xato',
    'error.passwordReset': 'Parolni tiklashda xato',
    
    // Успешные действия
    'success.keyGenerated': 'Kalit muvaffaqiyatli yaratildi',
    'success.keyRevoked': 'Kalit muvaffaqiyatli bekor qilindi',
    'success.urlUpdated': 'URL muvaffaqiyatli yangilandi',
    'success.passwordCreated': 'Parol yaratildi',
    'success.expirationUpdated': 'Kalitning amal qilish muddati yangilandi',
    
    // Генератор ключей
    'keys.generateSuccess': '✅ Kalit muvaffaqiyatli yaratildi',
    'keys.generationError': 'Kalit yaratishda xato',
    
    // Помощь
    'help.howToGetKey': 'Kalitni qanday olish mumkin?',
    'help.getKeyDesc': 'Kalit olish uchun bizga Telegramda yozing:',
    'help.support1': 'Yordam 1',
    'help.support2': 'Yordam 2',
    
    // Дашборд студента
    'dashboard.sor': 'SOR',
    'dashboard.soch': 'SOCH',
    'dashboard.sorDesc': 'Bo\'lim bo\'yicha summativ baholash',
    'dashboard.sochDesc': 'Chorak bo\'yicha summativ baholash',
    'dashboard.noMaterialsForSubject': 'Bu fan uchun materiallar hali qo\'shilmagan',
    
    // Чат
    'chat.title': 'Sinf chati',
    'chat.placeholder': 'Xabar yozing...',
    'chat.send': 'Yuborish',
    'chat.empty': 'Chat bo\'sh',
    'chat.emptyDesc': 'Birinchi xabar yozuvchi bo\'ling!',
    'chat.messageCount': 'xabarlar',
    'chat.enterToSend': 'Enter - yuborish, Shift+Enter - yangi qator',
  },
  
  en: {
    // Общие
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.back': 'Back',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.refresh': 'Refresh',
    'common.tryAgain': 'Try again',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.name': 'Name',
    'common.class': 'Class',
    'common.returnedToPrevious': 'You returned to the previous menu',
    
    // Главная страница
    'home.title': 'Online answers for SOR and SOCH',
    'home.selectClass': 'Select class',
    'home.selectStudent': 'Select student from',
    'home.welcome': 'Hello',
    'home.class': 'Class',
    
    // Авторизация
    'auth.enterKey': 'Enter key',
    'auth.enterPassword': 'Enter password',
    'auth.createPassword': 'Create password',
    'auth.continue': 'Continue',
    'auth.keyPlaceholder': 'Access key',
    'auth.passwordPlaceholder': 'Password',
    'auth.newPasswordPlaceholder': 'New password',
    'auth.confirmPasswordPlaceholder': 'Confirm password',
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.forgetSession': 'Forget session',
    'auth.sessionActive': 'Active session',
    'auth.createPasswordButton': 'Create password',
    'auth.invalidKey': 'Invalid key',
    'auth.invalidOrUsedKey': 'Invalid or used key',
    'auth.invalidPassword': 'Invalid password',
    'auth.passwordMismatch': 'Passwords do not match',
    'auth.passwordTooShort': 'Password must contain at least 4 characters',
    'auth.passwordNotSet': 'Password not set',
    'auth.keyVerified': 'Key is correct! Create a password for convenient login in the future.',
    'auth.passwordSet': 'Password set',
    'auth.noPassword': 'Key required',
    'auth.quickLogin': 'Quick login (3 days)',
    'auth.passwordCreated': 'Password created',
    'auth.successfulLogin': 'Successful login',
    
    // Админ-панель
    'admin.title': 'Admin Panel',
    'admin.login': 'Administrator login',
    'admin.username': 'Username',
    'admin.password': 'Password',
    'admin.invalidCredentials': 'Invalid credentials',
    'admin.logout': 'Logout',
    'admin.main': 'Main',
    'admin.students': 'Students',
    'admin.classes': 'Classes',
    'admin.sor': 'SOR',
    'admin.soch': 'SOCH',
    'admin.materials': 'Materials',
    'admin.logs': 'History',
    'admin.welcome': 'Welcome to admin panel',
    'admin.selectSection': 'Select section to manage',
    
    // Классы и ученики
    'classes.title': 'Classes and registered students',
    'classes.selectClass': 'Select class',
    'classes.studentsOf': 'Students of class',
    'classes.registered': 'registered',
    'classes.total': 'total',
    'classes.noStudents': 'No students in this class yet',
    'classes.onlyRegistered': 'Only registered',
    'classes.searchPlaceholder': 'Search by student or class...',
    'classes.grade': 'Grade',
    'classes.allGrades': 'All grades',
    'classes.exportClass': 'Export class',
    'classes.exportAll': 'Export all',
    'classes.copyLink': 'Copy link',
    'classes.notRegistered': 'Not registered',
    'classes.hasUrl': 'Has URL',
    'classes.noUrl': 'No URL',
    'classes.name': 'Name',
    'classes.class': 'Class',
    'classes.exportSuccess': 'Export completed successfully',
    
    // Ключи и пароли
    'keys.generate': 'Generate key',
    'keys.generated': 'Key generated',
    'keys.revoke': 'Revoke',
    'keys.active': 'Active',
    'keys.revoked': 'Revoked',
    'keys.created': 'Created',
    'keys.expires': 'Expires',
    'keys.expiration': 'Expiration',
    'keys.noKeys': 'No keys found',
    'keys.copyKey': 'Copy key',
    'keys.updateExpiration': 'Update expiration',
    'password.reset': 'Reset password',
    'password.resetConfirm': 'Reset password for',
    'password.resetSuccess': 'Password reset',
    
    // URL управление
    'url.edit': 'Edit URL',
    'url.placeholder': 'https://example.com',
    'url.updated': 'URL successfully updated',
    'url.redirectUrl': 'URL for redirection after login',
    
    // Материалы
    'materials.add': 'Add material',
    'materials.title': 'Material title',
    'materials.titlePlaceholder': 'Enter title',
    'materials.contentTypes': 'Content types',
    'materials.text': 'Text',
    'materials.image': 'Image',
    'materials.file': 'File',
    'materials.link': 'Link',
    'materials.textContent': 'Text - content',
    'materials.imageUrl': 'Image - image URL',
    'materials.fileUrl': 'File - file URL',
    'materials.linkUrl': 'Link - link',
    'materials.textPlaceholder': 'Enter text',
    'materials.urlPlaceholder': 'https://example.com',
    'materials.imageUrlPlaceholder': 'https://example.com/image.jpg',
    'materials.fileUrlPlaceholder': 'https://example.com/file.pdf',
    'materials.noMaterials': 'No materials found',
    'materials.noMaterialsDesc': 'Add the first material for this subject',
    'materials.download': 'Download',
    'materials.open': 'Open',
    'materials.deleteConfirm': 'Delete material',
    'materials.added': 'Material successfully added',
    'materials.deleted': 'Material deleted',
    'materials.fillAllFields': 'Fill all fields for selected content types',
    
    // Ошибки
    'error.loadingClasses': 'Error loading classes',
    'error.loadingStudents': 'Error loading students',
    'error.loadingSubjects': 'Error loading subjects',
    'error.loadingMaterials': 'Error loading materials',
    'error.keyValidation': 'Error validating key',
    'error.passwordValidation': 'Error validating password',
    'error.passwordCreation': 'Error creating password',
    'error.keyGeneration': 'Error generating key',
    'error.keyRevocation': 'Error revoking key',
    'error.urlUpdate': 'Error updating URL',
    'error.materialAdd': 'Error adding material',
    'error.materialDelete': 'Error deleting material',
    'error.passwordReset': 'Error resetting password',
    
    // Успешные действия
    'success.keyGenerated': 'Key successfully generated',
    'success.keyRevoked': 'Key successfully revoked',
    'success.urlUpdated': 'URL successfully updated',
    'success.passwordCreated': 'Password created',
    'success.expirationUpdated': 'Key expiration updated',
    
    // Генератор ключей
    'keys.generateSuccess': '✅ Key successfully generated',
    'keys.generationError': 'Error generating key',
    
    // Помощь
    'help.howToGetKey': 'How to get a key?',
    'help.getKeyDesc': 'To get a key, write to us on Telegram:',
    'help.support1': 'Support 1',
    'help.support2': 'Support 2',
    
    // Дашборд студента
    'dashboard.sor': 'SOR',
    'dashboard.soch': 'SOCH',
    'dashboard.sorDesc': 'Summative assessment for the section',
    'dashboard.sochDesc': 'Summative assessment for the quarter',
    'dashboard.noMaterialsForSubject': 'Materials for this subject have not been added yet',
    
    // Чат
    'chat.title': 'Class Chat',
    'chat.placeholder': 'Type a message...',
    'chat.send': 'Send',
    'chat.empty': 'Chat is empty',
    'chat.emptyDesc': 'Be the first to write a message!',
    'chat.messageCount': 'messages',
    'chat.enterToSend': 'Enter - send, Shift+Enter - new line',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ru';
  });

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    
    // Сохраняем в Supabase если пользователь авторизован
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({ 
            user_id: user.id, 
            language: lang 
          }, { 
            onConflict: 'user_id' 
          });
      }
    } catch (error) {
      console.log('Language preference not saved to database:', error);
    }
  };

  const cycleLanguage = () => {
    const languages: Language[] = ['ru', 'uz', 'en'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
    
    // Загружаем язык из Supabase при инициализации
    const loadLanguageFromDB = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('user_preferences')
            .select('language')
            .eq('user_id', user.id)
            .single();
          
          if (data?.language && data.language !== language) {
            setLanguageState(data.language as Language);
            localStorage.setItem('language', data.language);
          }
        }
      } catch (error) {
        console.log('Could not load language from database:', error);
      }
    };
    
    loadLanguageFromDB();
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, cycleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}