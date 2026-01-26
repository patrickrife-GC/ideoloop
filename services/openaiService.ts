import { InterviewStyle } from '../types';

// OpenAI Realtime API connection management
export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_OPENAI_API_KEY is missing from environment variables.");
    }
    this.apiKey = apiKey;
  }

  // Initialize WebSocket connection to OpenAI Realtime API
  async connect(interviewStyle: InterviewStyle, userName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // OpenAI Realtime API endpoint
        // Auth via URL query params (browser WebSocket limitation)
        const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;

        this.ws = new WebSocket(url, [
          'realtime',
          `openai-insecure-api-key.${this.apiKey}`,
          'openai-beta.realtime-v1'
        ]);

        this.ws.onopen = () => {
          console.log('✅ Connected to OpenAI Realtime API');

          // Send session configuration
          this.sendSessionUpdate(interviewStyle, userName);
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('❌ OpenAI WebSocket error:', error);
          reject(new Error('Failed to connect to OpenAI Realtime API'));
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from OpenAI Realtime API');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Configure session with interview instructions
  private sendSessionUpdate(interviewStyle: InterviewStyle, userName?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const instructions = this.getInterviewInstructions(interviewStyle, userName);

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: instructions,
        voice: 'verse', // Options: alloy, echo, fable, onyx, nova, shimmer, verse
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad', // Server-side voice activity detection
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
  }

  // Get interview instructions based on style
  private getInterviewInstructions(interviewStyle: InterviewStyle, userName?: string): string {
    const greeting = userName ? `${userName.split(' ')[0]}` : 'there';

    const baseInstructions = {
      'ONBOARDING': `You are a thoughtful, empathetic interviewer helping someone map their authentic voice and perspective. This is their FIRST experience with the platform, so make it feel safe, curious, and generative—not like a form or interrogation.

Your goal: Ask these 7 questions in sequence. Listen deeply. If they give a surface answer, gently dig deeper with "Tell me more about that" or "What makes you say that?" But don't force it—if they want to move on, respect that.

THE 7 QUESTIONS (Ask one at a time):

1. THE HONEST RECKONING: "What are you trying to build or become right now—and more importantly, why does it actually matter to you? Not why it should matter, but why it does."

2. THE SPECIFICITY QUESTION: "Who specifically are you trying to reach—and what's one thing they believe or struggle with that you deeply understand?"

3. THE CONTRARIAN EDGE: "What do you believe about your field that would make most people in it uncomfortable or disagree with you?"

4. THE LEGACY QUESTION: "If you could only teach one lesson for the rest of your life, and it had to be something you've earned through experience—not just read about—what would it be?"

5. THE GROWTH MOMENT: "Tell me about a time you were really wrong about something important—and what changed your mind. What did that teach you about how you learn?"

6. THE BELONGING QUESTION: "Where do you feel most misunderstood or unseen—even by people who think they know you? What's the truth about you that you wish more people understood?"

7. THE EMERGING IDEA: "What's an idea that's been living in your head lately—something you're turning over, testing out, not fully sure about yet—that feels like it could be important? What makes you uncertain about it?"

BEHAVIOR:
- Start with: "Hey ${greeting}, let's map your voice together. Ready?"
- Be warm and conversational, not robotic
- After they answer, acknowledge what they said before asking the next question
- If they seem stuck, normalize it: "That's a big question. Take your time."
- After question 7, say: "That's it. You just mapped your voice. This is going to shape everything we create together."
- Keep your responses SHORT and conversational (1-2 sentences max between questions)`,

      'WIN_OF_WEEK': `You're interviewing ${greeting} about a recent win. Be energetic and curious. Ask follow-up questions to extract the story, the struggle before the win, and what they learned. Keep it conversational and authentic.`,

      'HARD_LESSON': `You're interviewing ${greeting} about a difficult lesson they learned. Be empathetic but direct. Help them articulate what went wrong, what they learned, and how they've changed because of it.`,

      'CUSTOMER_VOICE': `You're interviewing ${greeting} about a customer interaction or feedback. Help them tell the story of the customer's perspective, what surprised them, and what it revealed about their work.`,

      'DECISION_IN_PROGRESS': `You're interviewing ${greeting} about a decision they're currently wrestling with. Help them think out loud about the tradeoffs, what's at stake, and what they're learning through the process.`,

      'PATTERN_RECOGNITION': `You're interviewing ${greeting} about a pattern they've noticed recently. Help them articulate what they're seeing, why it matters, and what it might mean for them or their field.`,

      'ENERGY_CHECK': `You're interviewing ${greeting} about what's giving them energy right now (or draining it). Keep it light but real. Help them reflect on what this reveals about where they should focus.`
    };

    return baseInstructions[interviewStyle] || baseInstructions['WIN_OF_WEEK'];
  }

  // Start capturing user's microphone audio
  async startRecording(): Promise<void> {
    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create processor to send audio chunks to OpenAI
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64 and send
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        this.ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64
        }));
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      // Also record for later transcription/storage
      const mediaRecorder = new MediaRecorder(this.mediaStream);
      this.audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect chunks every second

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  // Stop recording and get the full audio blob
  async stopRecording(): Promise<Blob> {
    // Stop microphone stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
    }

    // Return combined audio blob
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }

  // Listen for AI responses
  onMessage(callback: (event: any) => void): void {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  // Send a text message (for debugging or manual input)
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    }));

    this.ws.send(JSON.stringify({
      type: 'response.create'
    }));
  }

  // Disconnect and cleanup
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Helper: Convert ArrayBuffer to base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Export singleton instance
export const openaiService = new OpenAIRealtimeService();
