import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calculator, Zap, FlaskRound as Flask, Leaf, Clock, Globe, Type, Languages, Monitor, ArrowRight } from 'lucide-react';
import type { Subject } from '../lib/supabase';

interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
  index: number;
}

export default function SubjectCard({ subject, onClick, index }: SubjectCardProps) {
  const getSubjectColors = () => {
    const colors: { [key: string]: { bg: string; icon: string; gradient: string; border: string; text: string } } = {
      'Математика': { bg: 'bg-blue-50/50', icon: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600', border: 'hover:border-blue-200', text: 'text-blue-900' },
      'Физика': { bg: 'bg-amber-50/50', icon: 'text-amber-600', gradient: 'from-amber-500 to-orange-600', border: 'hover:border-amber-200', text: 'text-amber-900' },
      'Химия': { bg: 'bg-emerald-50/50', icon: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600', border: 'hover:border-emerald-200', text: 'text-emerald-900' },
      'Английский язык': { bg: 'bg-indigo-50/50', icon: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-600', border: 'hover:border-indigo-200', text: 'text-indigo-900' },
      'Литература': { bg: 'bg-rose-50/50', icon: 'text-rose-600', gradient: 'from-rose-500 to-pink-600', border: 'hover:border-rose-200', text: 'text-rose-900' },
      'История': { bg: 'bg-orange-50/50', icon: 'text-orange-600', gradient: 'from-orange-500 to-amber-600', border: 'hover:border-orange-200', text: 'text-orange-900' },
      'География': { bg: 'bg-cyan-50/50', icon: 'text-cyan-600', gradient: 'from-cyan-500 to-blue-600', border: 'hover:border-cyan-200', text: 'text-cyan-900' },
      'Биология': { bg: 'bg-teal-50/50', icon: 'text-teal-600', gradient: 'from-teal-500 to-emerald-600', border: 'hover:border-teal-200', text: 'text-teal-900' },
    };

    const defaultColor = { bg: 'bg-slate-50/50', icon: 'text-slate-600', gradient: 'from-slate-500 to-slate-700', border: 'hover:border-slate-200', text: 'text-slate-900' };
    return colors[subject.name] || defaultColor;
  };

  const IconComponent = () => {
    const icons: { [key: string]: React.ComponentType<any> } = { BookOpen, Calculator, Zap, Flask, Leaf, Clock, Globe, Type, Languages, Monitor };
    const Comp = icons[subject.icon] || BookOpen;
    return <Comp className="w-8 h-8 text-white" />;
  };

  const colors = getSubjectColors();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`premium-card p-6 h-full flex flex-col justify-between group cursor-pointer border border-slate-100 transition-all duration-300 ${colors.border}`}
    >
      <div className="flex items-start justify-between mb-6">
        <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-500`}>
          <IconComponent />
        </div>
        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all">
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>

      <div>
        <h3 className={`text-2xl font-black tracking-tight mb-2 ${colors.text}`}>
          {subject.name}
        </h3>
        <p className="text-slate-500 text-sm font-bold line-clamp-2 leading-relaxed">
          {subject.description || 'Все необходимые материалы для обучения в одном месте.'}
        </p>
      </div>

      <div className="mt-8 flex items-center space-x-2">
         <span className={`px-3 py-1 rounded-lg ${colors.bg} ${colors.icon} text-[10px] font-black uppercase tracking-wider`}>
            Открыть раздел
         </span>
         <div className="flex-1 h-[1px] bg-slate-100"></div>
      </div>
    </motion.div>
  );
}