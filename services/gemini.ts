import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createBlob, decode, decodeAudioData, encode, blobToBase64 } from "./audioUtils";

// --- CHAT (Lesson 2) ---
export const sendChatMessage = async (history: { role: string, parts: { text: string }[] }[], newMessage: string) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are a patient, encouraging, and slow-paced assistant for an elderly person. Explain things simply using analogies like libraries, gardening, or cooking. Keep answers under 3 sentences unless asked for more.",
    },
    history: history
  });
  
  const response = await chat.sendMessage({ message: newMessage });
  return response.text;
};

// --- QUICK HELP (Flash Lite) ---
export const getQuickDefinition = async (term: string) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite-latest', // Explicitly using latest lite model
    contents: `Define "${term}" in one simple sentence for a grandmother. No jargon.`,
  });
  return response.text;
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
  
  const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 16000});
  const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 24000});
  
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err: any) {
    // Re-throw with more context
    throw err;
  }
  
  let currentSession: any = null;
  let sessionError: Error | null = null;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => {
        console.log("Live session opened");
        // Audio Input Setup
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          sessionPromise.then((session) => {
            currentSession = session;
            session.sendRealtimeInput({ media: pcmBlob });
          }).catch((err) => {
            console.error("Error sending audio:", err);
          });
        };
        
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
        if (base64EncodedAudioString) {
          const audioBuffer = await decodeAudioData(
            decode(base64EncodedAudioString),
            outputAudioContext,
            24000,
            1,
          );
          onAudioData(audioBuffer);
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
      stream.getTracks().forEach(track => track.stop());
      inputAudioContext.close();
      outputAudioContext.close();
      const session = await sessionPromise;
      session.close();
    }
  };
};