import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PrompterSettings } from '../types';
import { ArrowLeft, Play, Pause, RefreshCw, Settings, Type, Monitor, Video, StopCircle, Download, X } from 'lucide-react';
import { Button } from './Button';

interface PrompterViewProps {
  script: string;
  settings: PrompterSettings;
  updateSettings: (settings: PrompterSettings) => void;
  onExit: () => void;
}

export const PrompterView: React.FC<PrompterViewProps> = ({ script, settings, updateSettings, onExit }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const animationFrameRef = useRef<number | null>(null);
  const lastScrollTime = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Initialize Camera
  useEffect(() => {
    const initCamera = async () => {
      if (settings.useCamera) {
        try {
          // Request audio as well for recording
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            // Mute local playback to prevent feedback loop, but record audio
            videoRef.current.muted = true; 
          }
        } catch (err) {
          console.error("Camera/Mic access denied", err);
        }
      } else {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.useCamera]);

  // Recording Functions
  const startRecording = () => {
    if (!stream) return;
    
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunksRef.current.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsPlaying(false); // Also stop scrolling
    }
  };

  // Scrolling Logic
  const scroll = useCallback((timestamp: number) => {
    if (!isPlaying || !scrollRef.current) {
        animationFrameRef.current = null;
        return;
    }

    const elapsed = timestamp - lastScrollTime.current;
    // Adjust scroll interval based on speed.
    if (elapsed > 16) { // Cap at ~60fps updates
        const pixelsPerSecond = settings.scrollSpeed * 3; 
        const pixelsPerFrame = pixelsPerSecond * (elapsed / 1000);
        
        scrollRef.current.scrollTop += pixelsPerFrame;
        lastScrollTime.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(scroll);
  }, [isPlaying, settings.scrollSpeed]);

  useEffect(() => {
    if (isPlaying) {
      lastScrollTime.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(scroll);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, scroll]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  // Text styling transformations
  const textTransformStyle = {
    transform: `scale(${settings.isMirroredX ? -1 : 1}, ${settings.isMirroredY ? -1 : 1})`,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    opacity: settings.opacity,
    maxWidth: `${100 - settings.margin * 2}%`,
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background Video Layer */}
      {settings.useCamera && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
          style={{ transform: 'scaleX(-1)' }} // Mirror webcam so it feels natural
        />
      )}

      {/* Scrolling Text Layer */}
      <div 
        ref={scrollRef}
        className="absolute inset-0 z-10 overflow-y-auto no-scrollbar flex justify-center"
        style={{ scrollBehavior: 'auto' }} // Important: 'auto' prevents smooth scrolling interference with JS
      >
        {/* Spacer to start text in middle */}
        <div className="w-full min-h-screen flex flex-col items-center">
            <div className="h-[45vh] flex-shrink-0 w-full"></div>
            
            <div 
                className={`font-bold text-white text-center whitespace-pre-wrap drop-shadow-md px-4 transition-all duration-200`}
                style={textTransformStyle}
            >
            {script}
            </div>
            
            <div className="h-[100vh] flex-shrink-0 w-full"></div>
        </div>
      </div>

      {/* Marker Guide (Eye Level) */}
      <div className="absolute top-[45%] left-0 w-full h-20 flex items-center z-20 pointer-events-none opacity-30 border-y border-red-500/50 bg-red-500/5">
        <div className="w-full flex justify-between px-4">
            <div className="text-red-500 text-xs uppercase tracking-widest">Leer Aquí</div>
            <div className="text-red-500 text-xs uppercase tracking-widest">Leer Aquí</div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {recordedVideoUrl && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-full flex flex-col shadow-2xl">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2"><Video className="w-5 h-5 text-indigo-500"/> Vista Previa de Grabación</h3>
                    <button onClick={() => setRecordedVideoUrl(null)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-4 bg-black aspect-video flex justify-center">
                    <video 
                        src={recordedVideoUrl} 
                        controls 
                        className="h-full w-full object-contain" 
                        style={{ transform: 'scaleX(-1)' }} // Mirror playback to match recording experience
                    />
                </div>
                <div className="p-4 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setRecordedVideoUrl(null)}>Descartar</Button>
                    <a href={recordedVideoUrl} download={`proprompter-recording-${Date.now()}.webm`}>
                        <Button icon={<Download size={16}/>}>Descargar Video</Button>
                    </a>
                </div>
            </div>
        </div>
      )}

      {/* Controls Layer */}
      <div className={`absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-slate-800 p-6 transition-transform duration-300 z-50 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
            
            {/* Main Transport */}
            <div className="flex items-center justify-between">
                <button onClick={onExit} className="text-slate-400 hover:text-white flex items-center gap-2">
                    <ArrowLeft size={20} /> <span className="hidden sm:inline">Volver al Editor</span>
                </button>

                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => {
                            if (scrollRef.current) scrollRef.current.scrollTop = 0;
                            setIsPlaying(false);
                        }}
                        className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <RefreshCw size={20} />
                    </button>

                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform ${isPlaying ? 'bg-slate-700 hover:bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                    >
                        {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                    </button>

                    {/* Recording Button */}
                    {settings.useCamera && (
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-4 rounded-full transition-all shadow-lg flex items-center justify-center ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-800 hover:bg-red-900/50 text-red-500'}`}
                            title={isRecording ? "Detener Grabación" : "Grabar Video"}
                        >
                            {isRecording ? <StopCircle size={24} fill="currentColor" className="text-white" /> : <Video size={24} />}
                        </button>
                    )}
                </div>

                <div className="w-[120px]"></div> {/* Spacer for balance */}
            </div>

            {/* Advanced Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-800/50">
                {/* Speed */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Velocidad</span>
                        <span>{settings.scrollSpeed}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={settings.scrollSpeed} 
                        onChange={(e) => updateSettings({...settings, scrollSpeed: parseInt(e.target.value)})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Tamaño de Letra</span>
                        <span>{settings.fontSize}px</span>
                    </div>
                    <input 
                        type="range" 
                        min="24" 
                        max="120" 
                        value={settings.fontSize} 
                        onChange={(e) => updateSettings({...settings, fontSize: parseInt(e.target.value)})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* Toggles 1 */}
                <div className="flex items-center justify-between gap-2">
                    <button 
                        onClick={() => updateSettings({...settings, isMirroredX: !settings.isMirroredX})}
                        className={`flex-1 py-2 rounded-md text-xs font-medium flex flex-col items-center gap-1 transition-colors ${settings.isMirroredX ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/50' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
                    >
                        <Settings size={14} />
                        Espejo X
                    </button>
                    <button 
                        onClick={() => updateSettings({...settings, isMirroredY: !settings.isMirroredY})}
                        className={`flex-1 py-2 rounded-md text-xs font-medium flex flex-col items-center gap-1 transition-colors ${settings.isMirroredY ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/50' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
                    >
                        <Settings size={14} className="rotate-90" />
                        Espejo Y
                    </button>
                </div>

                 {/* Toggles 2 */}
                 <div className="flex items-center justify-between gap-2">
                    <button 
                        onClick={() => updateSettings({...settings, useCamera: !settings.useCamera})}
                        className={`flex-1 py-2 rounded-md text-xs font-medium flex flex-col items-center gap-1 transition-colors ${settings.useCamera ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/50' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
                    >
                        <Monitor size={14} />
                        Cámara
                    </button>
                     <button 
                        onClick={() => updateSettings({...settings, margin: settings.margin === 0 ? 20 : 0})}
                         className={`flex-1 py-2 rounded-md text-xs font-medium flex flex-col items-center gap-1 transition-colors ${settings.margin > 0 ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/50' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
                    >
                        <Type size={14} />
                        Margen
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};