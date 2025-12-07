import React, { useState } from 'react';
import { transcribeAudio } from '../services/gemini';
import { LessonContainer } from './LessonContainer';

export const TranscriptionLesson: React.FC = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setResult('');
      try {
        const text = await transcribeAudio(file);
        setResult(text || "No text found.");
      } catch (error) {
        setResult("Error reading audio file. Please try a different file.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <LessonContainer title="Lesson 4: Reading Audio" description="AI can listen to recordings and write down what was said. Perfect for doctor's notes!">
      <div className="flex flex-col items-center w-full space-y-6">
        <label className="w-full h-40 bg-indigo-50 border-4 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100 transition-colors">
            <span className="material-icons text-5xl text-indigo-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
            </span>
            <span className="text-xl font-bold text-indigo-600">Tap to Upload Audio</span>
            <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
        </label>

        {loading && (
            <div className="text-2xl text-slate-500 animate-pulse">
                Listening and writing...
            </div>
        )}

        {result && (
            <div className="w-full bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-500 mb-2">Transcript:</h3>
                <p className="text-xl leading-relaxed text-slate-800">{result}</p>
            </div>
        )}
      </div>
    </LessonContainer>
  );
};