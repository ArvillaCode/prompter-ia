import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PrompterSettings } from '../types';
import { ArrowLeft, Play, Pause, RefreshCw, Settings, Monitor, Video, StopCircle, Download, X, AlertCircle, Minus, Plus, Mic, Camera, Maximize, Minimize, ChevronDown, ChevronUp, SwitchCamera } from 'lucide-react';
import { Button } from './Button';

interface PrompterViewProps {
  script: string;
  settings: PrompterSettings;
  updateSettings: React.Dispatch<React.SetStateAction<PrompterSettings>>;
  onExit: () => void;
}

export const PrompterView: React.FC<PrompterViewProps> = ({ script, settings, updateSettings, onExit }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastScrollTime = useRef<number>(0);
  // Float scroll position accumulator: mobile browsers round scrollTop to
  // integers, so sub-pixel advances at low speeds would otherwise be lost
  const scrollPosRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedExt, setRecordedExt] = useState<'mp4' | 'webm'>('webm');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const isRecordingRef = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Available input devices (labels are only populated after permission is granted)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
      setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
    } catch (err) {
      console.error("Could not enumerate devices", err);
    }
  }, []);

  // Keep the device lists fresh when devices are (dis)connected, e.g. a wireless mic
  useEffect(() => {
    if (!settings.useCamera) return;
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
  }, [settings.useCamera, refreshDevices]);

  // Latest settings, so async camera error handling doesn't overwrite newer values
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Keep the screen awake while the prompter is open (mobile screens lock mid-read)
  useEffect(() => {
    let lock: any = null;
    const acquire = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen');
      } catch {
        // Unsupported browser or denied: not critical
      }
    };
    acquire();
    // The lock is released automatically when the tab goes to background; re-acquire on return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  // Keyboard shortcuts — also works with Bluetooth presenter remotes,
  // which the device sees as a keyboard (they send PageUp/PageDown)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
        case 'PageDown':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'PageUp':
          e.preventDefault();
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
          scrollPosRef.current = 0;
          setIsPlaying(false);
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateSettings(prev => ({ ...prev, scrollSpeed: Math.min(100, prev.scrollSpeed + 5) }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateSettings(prev => ({ ...prev, scrollSpeed: Math.max(0, prev.scrollSpeed - 5) }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          updateSettings(prev => ({ ...prev, fontSize: Math.min(120, prev.fontSize + 4) }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          updateSettings(prev => ({ ...prev, fontSize: Math.max(24, prev.fontSize - 4) }));
          break;
        case 'Escape':
          if (!isRecordingRef.current) onExit();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize Camera
  useEffect(() => {
    if (!settings.useCamera) {
      setStream(null);
      return;
    }

    let localStream: MediaStream | null = null;
    let cancelled = false;

    const initCamera = async () => {
      try {
        setCameraError(null);
        // Request audio as well for recording, honoring the selected devices
        const constraints: MediaStreamConstraints = {
          video: settings.videoDeviceId ? { deviceId: { exact: settings.videoDeviceId } } : { facingMode: settings.facingMode ?? 'user' },
          audio: settings.audioDeviceId ? { deviceId: { exact: settings.audioDeviceId } } : true,
        };

        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          // Saved device no longer exists: fall back to defaults and clear the selection
          const name = (err as DOMException)?.name;
          const hadSelection = settings.audioDeviceId || settings.videoDeviceId || settings.facingMode;
          if (hadSelection && (name === 'OverconstrainedError' || name === 'NotFoundError')) {
            newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (!cancelled) {
              updateSettings(prev => ({ ...prev, audioDeviceId: undefined, videoDeviceId: undefined, facingMode: undefined }));
            }
          } else {
            throw err;
          }
        }

        if (cancelled) {
          // Effect cleaned up while the permission prompt was open
          newStream.getTracks().forEach(track => track.stop());
          return;
        }
        localStream = newStream;
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          // Mute local playback to prevent feedback loop, but record audio
          videoRef.current.muted = true;
        }
        // Labels become available once permission is granted
        refreshDevices();
      } catch (err) {
        console.error("Camera/Mic access denied", err);
        if (!cancelled) {
          setCameraError("No se pudo acceder a la cámara/micrófono. Revisa los permisos del navegador.");
          updateSettings(prev => ({ ...prev, useCamera: false }));
        }
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      localStream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.useCamera, settings.audioDeviceId, settings.videoDeviceId, settings.facingMode]);

  // Recording Functions
  const beginRecording = () => {
    if (!stream) return;

    // Prefer MP4 when the browser can mux it (better editor compatibility)
    const preferredTypes = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    const mimeType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t));
    const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunksRef.current.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {
        const type = mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        setRecordedExt(type.includes('mp4') ? 'mp4' : 'webm');
        setRecordedVideoUrl(url);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setIsPlaying(true); // Start scrolling along with the recording
  };

  // Pressing record starts a 3-2-1 countdown before actually recording
  const startRecording = () => {
    if (!stream || isRecording || countdown !== null) return;
    setShowControls(false); // Hide controls immediately when recording starts
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      beginRecording();
      return;
    }
    const t = setTimeout(() => setCountdown(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, stream]);

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

        // Re-sync if the user scrolled manually (tolerating integer rounding)
        if (Math.abs(scrollRef.current.scrollTop - scrollPosRef.current) > 5) {
            scrollPosRef.current = scrollRef.current.scrollTop;
        }
        scrollPosRef.current += pixelsPerFrame;
        scrollRef.current.scrollTop = scrollPosRef.current;
        lastScrollTime.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(scroll);
  }, [isPlaying, settings.scrollSpeed]);

  useEffect(() => {
    if (isPlaying) {
      lastScrollTime.current = performance.now();
      if (scrollRef.current) scrollPosRef.current = scrollRef.current.scrollTop;
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
      // During recording or countdown: keep controls hidden (use floating stop button)
      if (isRecording || countdown !== null) return;
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    // On touch screens there is no mousemove: any tap brings the controls back
    window.addEventListener('touchstart', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isPlaying, isRecording, countdown]);

  // Text styling transformations
  const textTransformStyle = {
    transform: `scale(${settings.isMirroredX ? -1 : 1}, ${settings.isMirroredY ? -1 : 1})`,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    opacity: settings.opacity,
    maxWidth: `${100 - settings.margin * 2}%`,
  };

  return (
    <div className="relative w-full h-screen-dvh bg-black overflow-hidden">
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
        <div className="w-full min-h-screen-dvh flex flex-col items-center">
            <div className="h-45dvh flex-shrink-0 w-full"></div>
            
            <div 
                className={`font-bold text-white text-center whitespace-pre-wrap drop-shadow-md px-4 transition-all duration-200`}
                style={textTransformStyle}
            >
            {script}
            </div>
            
            <div className="h-100dvh flex-shrink-0 w-full"></div>
        </div>
      </div>

      {/* Camera Error Banner */}
      {cameraError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/30 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg max-w-[90%]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{cameraError}</span>
          <button onClick={() => setCameraError(null)} className="ml-2 text-red-400/70 hover:text-red-300">
            <X size={16} />
          </button>
        </div>
      )}

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
                    />
                </div>
                <div className="p-4 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setRecordedVideoUrl(null)}>Descartar</Button>
                    <a href={recordedVideoUrl} download={`proprompter-recording-${Date.now()}.${recordedExt}`}>
                        <Button icon={<Download size={16}/>}>Descargar Video</Button>
                    </a>
                </div>
            </div>
        </div>
      )}

      {/* Recording Countdown Overlay */}
      {countdown !== null && (
        <div
          className="absolute inset-0 z-[55] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 cursor-pointer"
          onClick={() => setCountdown(null)}
        >
          <span className="text-white font-bold text-[9rem] leading-none drop-shadow-lg">{countdown}</span>
          <span className="text-slate-300 text-sm uppercase tracking-widest">Toca para cancelar</span>
        </div>
      )}

      {/* Controls Layer */}
      <div className={`absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-slate-800 p-3 md:p-6 max-h-70dvh overflow-y-auto overscroll-contain transition-transform duration-300 z-50 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-6xl mx-auto flex flex-col gap-3 md:gap-4">
            
            {/* Main Transport */}
            <div className="flex items-center justify-between">
                <button onClick={onExit} className="text-slate-400 hover:text-white flex items-center gap-2">
                    <ArrowLeft size={20} /> <span className="hidden sm:inline">Volver al Editor</span>
                </button>

                <div className="flex items-center gap-4 md:gap-6">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`p-3 rounded-full transition-colors ${isSettingsOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                        title={isSettingsOpen ? "Minimizar parámetros" : "Mostrar parámetros"}
                    >
                        {isSettingsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    <button
                        onClick={() => {
                            if (isRecording) stopRecording();
                            updateSettings(prev => ({ ...prev, videoDeviceId: undefined, facingMode: prev.facingMode === 'environment' ? 'user' : 'environment' }));
                        }}
                        className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        title={settings.facingMode === 'environment' ? "Cámara frontal" : "Cámara principal"}
                    >
                        <SwitchCamera size={20} />
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>

                    <button
                        onClick={() => {
                            if (scrollRef.current) scrollRef.current.scrollTop = 0;
                            scrollPosRef.current = 0;
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
                            onClick={countdown !== null ? () => setCountdown(null) : isRecording ? stopRecording : startRecording}
                            className={`p-4 rounded-full transition-all shadow-lg flex items-center justify-center ${isRecording || countdown !== null ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-800 hover:bg-red-900/50 text-red-500'}`}
                            title={countdown !== null ? "Cancelar" : isRecording ? "Detener Grabación" : "Grabar Video"}
                        >
                            {isRecording || countdown !== null ? <StopCircle size={24} fill="currentColor" className="text-white" /> : <Video size={24} />}
                        </button>
                    )}
                </div>

                <div className="hidden md:block w-[120px]"></div> {/* Spacer for balance */}
            </div>

            {/* Advanced Settings Grid */}
            {isSettingsOpen && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 pt-3 md:pt-4 border-t border-slate-800/50">
                {/* Speed */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Velocidad</span>
                        <span>{settings.scrollSpeed}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => updateSettings({...settings, scrollSpeed: Math.max(0, settings.scrollSpeed - 5)})}
                            className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                            aria-label="Reducir velocidad"
                        >
                            <Minus size={18} />
                        </button>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={settings.scrollSpeed} 
                            onChange={(e) => updateSettings({...settings, scrollSpeed: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <button
                            onClick={() => updateSettings({...settings, scrollSpeed: Math.min(100, settings.scrollSpeed + 5)})}
                            className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                            aria-label="Aumentar velocidad"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Tamaño de Letra</span>
                        <span>{settings.fontSize}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => updateSettings({...settings, fontSize: Math.max(24, settings.fontSize - 4)})}
                            className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                            aria-label="Reducir tamaño de letra"
                        >
                            <Minus size={18} />
                        </button>
                        <input
                            type="range"
                            min="24"
                            max="120"
                            value={settings.fontSize}
                            onChange={(e) => updateSettings({...settings, fontSize: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <button
                            onClick={() => updateSettings({...settings, fontSize: Math.min(120, settings.fontSize + 4)})}
                            className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                            aria-label="Aumentar tamaño de letra"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Margin */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Margen</span>
                        <span>{settings.margin}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="40"
                        value={settings.margin}
                        onChange={(e) => updateSettings({...settings, margin: parseInt(e.target.value)})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between gap-1 md:gap-2">
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
                    <button
                        onClick={() => updateSettings({...settings, useCamera: !settings.useCamera})}
                        className={`flex-1 py-2 rounded-md text-xs font-medium flex flex-col items-center gap-1 transition-colors ${settings.useCamera ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/50' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
                    >
                        <Monitor size={14} />
                        Cámara
                    </button>
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Opacidad</span>
                        <span>{Math.round(settings.opacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="20"
                        max="100"
                        value={Math.round(settings.opacity * 100)}
                        onChange={(e) => updateSettings({...settings, opacity: parseInt(e.target.value) / 100})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Interlineado</span>
                        <span>{settings.lineHeight.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="25"
                        value={Math.round(settings.lineHeight * 10)}
                        onChange={(e) => updateSettings({...settings, lineHeight: parseInt(e.target.value) / 10})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>

            {/* Keyboard shortcuts hint (desktop / Bluetooth remotes) */}
            <div className="hidden md:block text-center text-xs text-slate-500 pt-1">
                Espacio: Play/Pausa · ↑↓ Velocidad · ←→ Tamaño de letra · Re Pág: Reiniciar · Esc: Salir
            </div>

            {/* Device Selectors (visible when camera is on) */}
            {settings.useCamera && (
                <div className="grid grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-slate-800/50">
                    <div className="space-y-1">
                        <label className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Mic size={14} /> Micrófono
                        </label>
                        <select
                            value={settings.audioDeviceId ?? ''}
                            onChange={(e) => {
                                if (isRecording) stopRecording();
                                updateSettings({ ...settings, audioDeviceId: e.target.value || undefined });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none"
                        >
                            <option value="">Por defecto</option>
                            {audioDevices.filter(d => d.deviceId).map((d, i) => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Micrófono ${i + 1}`}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Camera size={14} /> Cámara
                        </label>
                        <select
                            value={settings.videoDeviceId ?? ''}
                            onChange={(e) => {
                                if (isRecording) stopRecording();
                                updateSettings({ ...settings, videoDeviceId: e.target.value || undefined });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none"
                        >
                            <option value="">Por defecto</option>
                            {videoDevices.filter(d => d.deviceId).map((d, i) => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Cámara ${i + 1}`}</option>
                            ))}
                        </select>
                    </div>
                    </div>
                )}
              </>
            )}
        </div>
      </div>

      {/* Floating Stop Button — visible only during active recording */}
      {isRecording && (
        <button
          onClick={stopRecording}
          className="absolute top-4 right-4 z-[58] flex items-center gap-2 px-4 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse transition-colors"
          title="Detener Grabación"
        >
          <StopCircle size={24} fill="currentColor" />
          <span className="text-sm font-medium hidden sm:inline">Detener</span>
        </button>
      )}
    </div>
  );
};