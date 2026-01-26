import React, { useState, useEffect, useRef } from 'react';
import { InterviewStyle } from '../types';
import { openaiService } from '../services/openaiService';

interface RealtimeStudioProps {
  interviewStyle: InterviewStyle;
  userName?: string;
  onComplete: (recordingBlob: Blob) => void;
  onCancel: () => void;
}

export const RealtimeStudio: React.FC<RealtimeStudioProps> = ({
  interviewStyle,
  userName,
  onComplete,
  onCancel
}) => {
  const [status, setStatus] = useState<'connecting' | 'ready' | 'active' | 'error'>('connecting');
  const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    initializeSession();

    return () => {
      // Cleanup on unmount
      openaiService.disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initializeSession = async () => {
    try {
      setStatus('connecting');

      // Connect to OpenAI
      await openaiService.connect(interviewStyle, userName);

      // Set up message handler
      openaiService.onMessage(handleRealtimeMessage);

      // Initialize audio playback context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      setStatus('ready');

    } catch (error) {
      console.error('Failed to initialize OpenAI session:', error);
      setStatus('error');
    }
  };

  const handleRealtimeMessage = (event: any) => {
    console.log('📨 OpenAI event:', event.type);

    switch (event.type) {
      case 'conversation.item.created':
        // New item added to conversation
        if (event.item.type === 'message') {
          const role = event.item.role;
          const content = event.item.content?.[0];

          if (content?.type === 'text' && content.text) {
            addToTranscript(role, content.text);
          }
        }
        break;

      case 'response.audio.delta':
        // Incoming audio chunk from AI
        if (event.delta) {
          const audioData = base64ToInt16Array(event.delta);
          audioQueueRef.current.push(audioData);

          if (!isPlayingRef.current) {
            playAudioQueue();
          }
        }
        break;

      case 'response.audio.done':
        // AI finished speaking
        setIsAISpeaking(false);
        break;

      case 'response.done':
        // Full response completed
        console.log('✅ Response complete');
        break;

      case 'input_audio_buffer.speech_started':
        // User started speaking
        console.log('🎤 User speaking...');
        break;

      case 'input_audio_buffer.speech_stopped':
        // User stopped speaking
        console.log('🎤 User stopped');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        if (event.transcript) {
          addToTranscript('user', event.transcript);
        }
        break;

      case 'response.text.delta':
        // Text response streaming (if needed)
        break;

      case 'error':
        console.error('❌ OpenAI error:', event.error);
        break;
    }
  };

  const addToTranscript = (role: 'user' | 'assistant', text: string) => {
    setTranscript(prev => [...prev, { role, text }]);
  };

  const playAudioQueue = async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    setIsAISpeaking(true);

    const audioData = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);

    // Convert Int16 to Float32
    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i] / 32768.0;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      playAudioQueue(); // Play next chunk
    };

    source.start();
  };

  const base64ToInt16Array = (base64: string): Int16Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  };

  const handleStartRecording = async () => {
    try {
      await openaiService.startRecording();
      setStatus('active');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatus('error');
    }
  };

  const handleStopRecording = async () => {
    const recordingBlob = await openaiService.stopRecording();
    openaiService.disconnect();
    onComplete(recordingBlob);
  };

  const handleCancelSession = () => {
    openaiService.disconnect();
    onCancel();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {interviewStyle.replace(/_/g, ' ')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {status === 'connecting' && 'Connecting to AI interviewer...'}
              {status === 'ready' && 'Ready to begin. Click Start when you\'re ready.'}
              {status === 'active' && 'Interview in progress'}
              {status === 'error' && 'Connection error. Please refresh.'}
            </p>
          </div>
          <button
            onClick={handleCancelSession}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Transcript Display */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
        {transcript.length === 0 && status === 'ready' && (
          <div className="text-center text-gray-400 py-12">
            <p>Your conversation will appear here...</p>
          </div>
        )}

        {transcript.map((item, idx) => (
          <div
            key={idx}
            className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 ${
                item.role === 'user'
                  ? 'bg-[#1f3a2e] text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{item.text}</p>
            </div>
          </div>
        ))}

        {isAISpeaking && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t border-gray-200 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {status === 'ready' && (
            <button
              onClick={handleStartRecording}
              className="w-full rounded-full bg-[#1f3a2e] px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-[#5a7968] transition-all"
            >
              Start Interview
            </button>
          )}

          {status === 'active' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Recording</span>
              </div>
              <button
                onClick={handleStopRecording}
                className="w-full rounded-full bg-red-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-red-700 transition-all"
              >
                End Interview
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to connect to AI interviewer</p>
              <button
                onClick={initializeSession}
                className="rounded-full bg-gray-600 px-8 py-3 text-base font-semibold text-white hover:bg-gray-700 transition-all"
              >
                Retry Connection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
