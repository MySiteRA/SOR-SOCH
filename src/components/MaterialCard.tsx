import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, BookOpen, ExternalLink, Image, Download, ArrowRight } from 'lucide-react';
import type { Material, Subject } from '../lib/supabase';

interface MaterialCardProps {
  material: Material;
  index: number;
  onClick?: () => void;
}

export default function MaterialCard({ material, index, onClick }: MaterialCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const issor = material.type === 'SOR';
  const typeLabel = issor ? 'СОР' : 'СОЧ';
  const accentColor = issor ? 'bg-emerald-500' : 'bg-blue-500';
  const iconBg = issor ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="premium-card p-6 group cursor-pointer border border-slate-100 hover:border-indigo-200 transition-all duration-500 h-full flex flex-col"
    >
      <div className="flex items-start justify-between mb-6">
        <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
          <FileText className="w-7 h-7" />
        </div>
        <div className={`px-4 py-1.5 rounded-full ${accentColor} text-white text-[10px] font-black tracking-widest uppercase shadow-lg`}>
          {typeLabel}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-black text-slate-800 leading-tight mb-3 group-hover:text-indigo-600 transition-colors">
          {material.title}
        </h3>
        
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center space-x-2 text-slate-500 group-hover:text-slate-700 transition-colors">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-tight">{material.subject?.name}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Calendar className="w-4 h-4" />
            <span className="text-[11px] font-medium">{formatDate(material.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
         <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${accentColor} animate-pulse`}></div>
            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-indigo-500 transition-colors">
              Открыть материал
            </span>
         </div>
         <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
            <ArrowRight className="w-4 h-4" />
         </div>
      </div>
    </motion.div>
  );
}