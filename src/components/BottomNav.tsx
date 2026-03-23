import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageCircle, Gamepad2, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: '/student-dashboard', icon: Home, label: 'Главная' },
    { path: '/student-schedule', icon: Calendar, label: 'Расписание' },
    { path: '/student-games', icon: Gamepad2, label: 'Игры' },
    { path: '/student-chat', icon: MessageCircle, label: 'Чат' },
    { path: '/student-profile', icon: User, label: 'Профиль' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full"></div>
              )}
              <div className="relative">
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${isActive ? 'scale-110 mb-0.5' : ''}`} />
                {isActive && <div className="absolute inset-0 bg-indigo-100 rounded-full scale-150 -z-10 opacity-50 blur-sm"></div>}
              </div>
              <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
