import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createBlob, decode, decodeAudioData, encode, blobToBase64 } from "./audioUtils";

// --- CHAT (Lesson 2) ---
export const sendChatMessage = async (history: { role: string, parts: { text: string }[] }[], newMessage: string) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    throw new Error("API key not configured. Please create a .env.local file with GEMINI_API_KEY=your_key");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Build conversation history in the format expected by the API
    // Convert history to the format: [{ role: 'user', parts: [...] }, { role: 'model', parts: [...] }, ...]
    const conversationHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: msg.parts
    }));

    // Add the new user message
    conversationHistory.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: conversationHistory,
      config: {
        systemInstruction: "You are a patient, encouraging, and slow-paced assistant for an elderly person. Explain things simply using analogies like libraries, gardening, or cooking. Keep answers under 3 sentences unless asked for more.",
      }
    });
    
    return response.text;
  } catch (error: any) {
    console.error("Chat API error:", error);
    // Re-throw with more context
    throw new Error(`Chat API error: ${error?.message || error?.toString() || 'Unknown error'}`);
  }
};

// --- QUICK HELP (Flash Lite) ---
export const getQuickDefinition = async (term: string) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    throw new Error("API key not configured");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: {
        parts: [
          { text: `Define "${term}" in one simple sentence for a grandmother. No jargon.` }
        ]
      },
      config: {
        systemInstruction: "You are a helpful assistant explaining words simply for elderly people. Keep definitions to one sentence."
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Quick definition error:", error);
    throw new Error(`Failed to get definition: ${error?.message || error?.toString() || 'Unknown error'}`);
  }
};

// --- TRANSCRIPTION (Lesson 4) ---
export const transcribeAudio = async (audioFile: File) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = await blobToBase64(audioFile);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: audioFile.type,
            data: base64Audio
          }
        },
        { text: "Please transcribe exactly what was said in this audio file." }
      ]
    }
  });
  return response.text;
};

// --- VEO VIDEO GENERATION (Lesson 3) ---
export const generateVeoVideo = async (imageFile: File, prompt: string) => {
  // Check for paid key selection first
  if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
    await window.aistudio.openSelectKey();
    // In a real app we might need to wait or re-trigger, but here we assume success flow
  }

  // Create new instance to ensure key is fresh
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const base64Image = await blobToBase64(imageFile);

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt || "Animate this photo gently.",
    image: {
      imageBytes: base64Image,
      mimeType: imageFile.type,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9' 
    }
  });

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation.response?.generatedVideos?.[0]?.video?.uri) {
    const downloadLink = operation.response.generatedVideos[0].video.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    return await response.blob(); // Return video blob
  }
  throw new Error("Video generation failed");
};


// --- LIVE API (Lesson 1) ---
// This function needs to return cleanup logic
export const startLiveSession = async (
  onAudioData: (buffer: AudioBuffer) => void,
  onClose: () => void,
  onError?: (error: string) => void
) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    throw new Error("API key not configured. Please create a .env.local file with GEMINI_API_KEY=your_key");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Use browser's default sample rate for input (usually 48000)
  // We'll resample to 16kHz in the script processor
  const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 24000});
  
  const inputSampleRate = inputAudioContext.sampleRate;
  const targetSampleRate = 16000; // API expects 16kHz
  const resampleRatio = targetSampleRate / inputSampleRate;
  
  console.log(`Input sample rate: ${inputSampleRate}, Target: ${targetSampleRate}, Ratio: ${resampleRatio}`);
  
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err: any) {
    // Re-throw with more context
    throw err;
  }
  
  let currentSession: any = null;
  let sessionError: Error | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let audioSource: MediaStreamAudioSourceNode | null = null;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: async () => {
        console.log("Live session opened");
        try {
          // Wait for session to be ready
          const session = await sessionPromise;
          currentSession = session;
          console.log("Session ready, setting up audio input");
          
          // Audio Input Setup - use browser's default sample rate
          audioSource = inputAudioContext.createMediaStreamSource(stream);
          scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            if (!currentSession) {
              console.warn("Session not ready, skipping audio");
              return;
            }
            try {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              // Resample from inputSampleRate to 16kHz
              let resampledData: Float32Array;
              if (Math.abs(resampleRatio - 1.0) < 0.001) {
                // No resampling needed
                resampledData = inputData;
              } else {
                // Simple linear interpolation resampling
                const outputLength = Math.floor(inputData.length * resampleRatio);
                resampledData = new Float32Array(outputLength);
                for (let i = 0; i < outputLength; i++) {
                  const srcIndex = i / resampleRatio;
                  const srcIndexFloor = Math.floor(srcIndex);
                  const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
                  const t = srcIndex - srcIndexFloor;
                  resampledData[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t;
                }
              }
              
              const pcmBlob = createBlob(resampledData);
              currentSession.sendRealtimeInput({ media: pcmBlob });
            } catch (err) {
              console.error("Error sending audio:", err);
            }
          };
          
          audioSource.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
          console.log("Audio input connected");
        } catch (err) {
          console.error("Error setting up audio input:", err);
        }
      },
      onmessage: async (message: LiveServerMessage) => {
        console.log("Received message:", message);
        try {
          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString) {
            console.log("Decoding audio response");
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString),
              outputAudioContext,
              24000,
              1,
            );
            console.log("Playing audio response");
            onAudioData(audioBuffer);
          } else {
            console.log("No audio data in message:", message);
          }
        } catch (err) {
          console.error("Error processing audio message:", err);
        }
      },
      onclose: () => {
        console.log("Session closed");
        onClose();
      },
      onerror: (err) => {
        console.error("Session error", err);
        const errorMsg = err?.message || err?.toString() || "Unknown error occurred";
        sessionError = new Error(`Live session error: ${errorMsg}`);
        if (onError) {
          onError(errorMsg);
        }
        onClose();
      }
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
      },
      systemInstruction: 'You are a friendly, slow-speaking companion helping an elderly person learn about technology. Be very brief.',
    },
  });

  // Check if session promise rejects immediately
  sessionPromise.catch((err) => {
    console.error("Failed to create live session:", err);
    sessionError = err;
    if (onError) {
      onError(err?.message || err?.toString() || "Failed to connect to AI service");
    }
    stream.getTracks().forEach(track => track.stop());
  });

  return {
    close: async () => {
      try {
        // Disconnect audio processing first
        if (scriptProcessor) {
          try {
            scriptProcessor.disconnect();
          } catch (e) {
            console.warn("Error disconnecting script processor:", e);
          }
        }
        if (audioSource) {
          try {
            audioSource.disconnect();
          } catch (e) {
            console.warn("Error disconnecting audio source:", e);
          }
        }
        
        // Stop media stream tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Close the session if it exists
        try {
          const session = await Promise.race([
            sessionPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Session close timeout")), 5000))
          ]);
          if (session && typeof session.close === 'function') {
            session.close();
          }
        } catch (e) {
          console.warn("Error closing session:", e);
          // Don't throw - we've already cleaned up the important parts
        }
        
        // Close audio contexts
        try {
          await inputAudioContext.close();
        } catch (e) {
          console.warn("Error closing input audio context:", e);
        }
        try {
          await outputAudioContext.close();
        } catch (e) {
          console.warn("Error closing output audio context:", e);
        }
      } catch (err) {
        console.error("Error in cleanup:", err);
        // Ensure stream is stopped even if other cleanup fails
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          // Ignore errors stopping tracks
        }
      }
    }
  };
};
