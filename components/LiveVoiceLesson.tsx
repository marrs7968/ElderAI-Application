import React, { useState, useEffect, useRef } from 'react';
import { startLiveSession } from '../services/gemini';
import { LessonContainer } from './LessonContainer';

export const LiveVoiceLesson: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Tap the mic to start");
  const [isReceivingAudio, setIsReceivingAudio] = useState(false);
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);
  
  // Audio playback queue
  const nextStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 24000});
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      audioContextRef.current?.close();
    };
  }, []);

  // Resume audio context if suspended (browser autoplay policy)
  const ensureAudioContextResumed = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log("Audio context resumed");
    }
  };

  const handleToggle = async () => {
    if (isActive) {
      // Immediately update UI to show we're stopping
      setIsActive(false);
      setStatus("Stopping...");
      
      // Cleanup in the background, but don't block UI updates
      if (cleanupRef.current) {
        try {
          await cleanupRef.current();
        } catch (err) {
          console.error("Error during cleanup:", err);
        } finally {
          cleanupRef.current = null;
        }
      }
      
      setStatus("Tap the mic to start");
    } else {
      setStatus("Connecting...");
      try {
        // Check for API key first
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
          setStatus("Error: API key not configured. Please create a .env.local file with GEMINI_API_KEY=your_key");
          return;
        }

        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus("Error: Microphone access not supported in this browser.");
          return;
        }

        // Ensure audio context is active
        await ensureAudioContextResumed();

        const session = await startLiveSession(async (buffer) => {
          // Playback logic
          if (!audioContextRef.current) return;
          
          // Ensure audio context is resumed
          await ensureAudioContextResumed();
          
          const ctx = audioContextRef.current;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          
          setIsReceivingAudio(true);
          
          source.onended = () => {
            setIsReceivingAudio(false);
          };
          
          const currentTime = ctx.currentTime;
          // Ensure we schedule after the previous one ends, or now if queue is empty
          const start = Math.max(nextStartTimeRef.current, currentTime);
          source.start(start);
          nextStartTimeRef.current = start + buffer.duration;
        }, () => {
            setIsActive(false);
            setIsReceivingAudio(false);
            setStatus("Session ended");
        }, (errorMsg) => {
            setIsActive(false);
            setIsReceivingAudio(false);
            setStatus(`Error: ${errorMsg}`);
        });
        
        cleanupRef.current = session.close;
        setIsActive(true);
        setStatus("Listening... Speak freely!");
      } catch (err: any) {
        console.error("Microphone error:", err);
        let errorMessage = "Error accessing microphone.";
        
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings.";
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
          errorMessage = "Microphone is being used by another application. Please close other apps using the microphone.";
        } else if (err?.message) {
          errorMessage = `Error: ${err.message}`;
        } else if (typeof err === 'string') {
          errorMessage = `Error: ${err}`;
        }
        
        setStatus(errorMessage);
        setIsActive(false);
      }
    }
  };

  return (
    <LessonContainer 
      title="Lesson 1: Talking to AI" 
      description="Computers can now listen and talk back, just like a phone call. Try saying 'Hello'!"
    >
      <div className="flex flex-col items-center justify-center h-full space-y-8 w-full">
        <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-500 ${
          isReceivingAudio ? 'bg-blue-200 animate-pulse' : isActive ? 'bg-green-100' : 'bg-slate-100'
        }`}>
           <button 
            onClick={handleToggle}
            disabled={false}
            className={`w-48 h-48 rounded-full shadow-2xl flex items-center justify-center transition-all transform active:scale-95 cursor-pointer ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            aria-label={isActive ? "Stop Listening" : "Start Listening"}
            type="button"
          >
            <span className="material-icons text-6xl text-white">
              {isActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </span>
          </button>
        </div>
        
        <p className="text-2xl font-medium text-slate-700 text-center px-4">
          {status}
        </p>
      </div>
    </LessonContainer>
  );
};