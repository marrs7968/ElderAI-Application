import React, { useState } from 'react';
import { generateVeoVideo } from '../services/gemini';
import { LessonContainer } from './LessonContainer';

export const VeoLesson: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setGeneratedVideoUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setStatus("Warming up the imagination engine...");
    
    try {
      const videoBlob = await generateVeoVideo(selectedImage, "Make this image come alive gently.");
      const url = URL.createObjectURL(videoBlob);
      setGeneratedVideoUrl(url);
      setStatus("Done!");
    } catch (e: any) {
        // Handle API Key selection specifically
        if (e.message?.includes('Requested entity was not found')) {
            setStatus("Please select a billing project key first.");
            if(window.aistudio) {
                await window.aistudio.openSelectKey();
            }
        } else {
            console.error(e);
            setStatus("Something went wrong. Please try again.");
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LessonContainer title="Lesson 3: Making Movies" description="AI can take a photo and turn it into a short movie. Try uploading a photo!">
      <div className="flex flex-col items-center w-full space-y-6">
        
        {!selectedImage && (
            <label className="w-full h-48 bg-purple-50 border-4 border-dashed border-purple-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition-colors">
                <span className="text-purple-500 text-6xl mb-2">+</span>
                <span className="text-xl font-bold text-purple-600">Tap to Choose Photo</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
        )}

        {imagePreview && !generatedVideoUrl && (
            <div className="relative w-full rounded-2xl overflow-hidden shadow-md">
                <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover opacity-80" />
                {!loading && (
                    <button 
                        onClick={handleGenerate}
                        className="absolute inset-0 m-auto w-48 h-16 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-full shadow-xl flex items-center justify-center"
                    >
                        Animate It!
                    </button>
                )}
            </div>
        )}

        {loading && (
            <div className="text-center p-8 bg-slate-100 rounded-2xl w-full">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-xl text-purple-800 font-medium">{status}</p>
                <p className="text-sm text-slate-500 mt-2">(This takes about 30 seconds)</p>
            </div>
        )}

        {generatedVideoUrl && (
            <div className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl">
                <video controls autoPlay loop className="w-full">
                    <source src={generatedVideoUrl} type="video/mp4" />
                </video>
                <button 
                    onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        setGeneratedVideoUrl(null);
                    }}
                    className="w-full py-4 bg-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-300"
                >
                    Try Another Photo
                </button>
            </div>
        )}
      </div>
    </LessonContainer>
  );
};