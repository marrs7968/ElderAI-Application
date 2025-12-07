import React, { ReactNode } from 'react';

interface Props {
  title: string;
  description: string;
  children: ReactNode;
  bgColor?: string;
}

export const LessonContainer: React.FC<Props> = ({ title, description, children, bgColor = 'bg-white' }) => {
  return (
    <div className={`flex flex-col h-full w-full max-w-2xl mx-auto rounded-3xl shadow-xl overflow-hidden border-4 border-slate-200 ${bgColor}`}>
      <div className="bg-slate-100 p-6 border-b border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-xl text-slate-600 leading-relaxed">{description}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        {children}
      </div>
    </div>
  );
};