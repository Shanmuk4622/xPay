// Groq AI API Shim - Compatible with @google/genai interface

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenerateResponse {
  text: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface ChatSession {
  sendMessage: (opts: { message: string }) => Promise<GenerateResponse>;
}

class ModelsAPI {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateContent(options: { model?: string; contents: any; config?: any }): Promise<GenerateResponse> {
    const model = options.model || this.model;
    
    let messages: Message[] = [];
    
    if (typeof options.contents === 'string') {
      messages = [{ role: 'user', content: options.contents }];
    } else if (Array.isArray(options.contents)) {
      messages = options.contents.map((item: any): Message => {
        if (typeof item === 'string') return { role: 'user', content: item };
        if (item.parts) {
          const text = item.parts.map((p: any) => p.text || '').join('');
          return { role: item.role === 'model' ? 'assistant' : 'user', content: text };
        }
        return { role: 'user', content: String(item.text || item) };
      });
    } else if (options.contents?.parts) {
      const text = options.contents.parts.map((p: any) => p.text || '').join('');
      messages = [{ role: 'user', content: text }];
    } else {
      messages = [{ role: 'user', content: String(options.contents) }];
    }

    if (options.config?.systemInstruction) {
      messages.unshift({ role: 'system', content: options.config.systemInstruction });
    }

    if (!this.apiKey) {
      return { text: 'AI is unavailable. Please configure your API key.' };
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.config?.temperature ?? 0.7,
          max_tokens: options.config?.maxTokens ?? 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Groq API error:', error);
        return { text: 'AI request failed. Please try again.' };
      }

      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      };
    } catch (error) {
      console.error('Groq API error:', error);
      return { text: 'AI is temporarily unavailable.' };
    }
  }
}

class ChatsAPI {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.model = model;
  }

  create(options: { model?: string; config?: any }): ChatSession {
    const apiKey = this.apiKey;
    const model = options.model || this.model;
    const history: Message[] = [];

    if (options.config?.systemInstruction) {
      history.push({ role: 'system', content: options.config.systemInstruction });
    }

    return {
      async sendMessage({ message }): Promise<GenerateResponse> {
        history.push({ role: 'user', content: message });

        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model, messages: history, temperature: 0.7, max_tokens: 2048 }),
          });

          if (!response.ok) {
            return { text: 'Chat request failed.' };
          }

          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          history.push({ role: 'assistant', content: text });
          return { text, usage: data.usage };
        } catch {
          return { text: 'Chat is temporarily unavailable.' };
        }
      },
    };
  }
}

export class GoogleGenAI {
  public models: ModelsAPI;
  public chats: ChatsAPI;

  constructor(config?: { apiKey?: string; model?: string }) {
    const apiKey = config?.apiKey || '';
    const model = config?.model || 'llama-3.3-70b-versatile';
    this.models = new ModelsAPI(apiKey, model);
    this.chats = new ChatsAPI(apiKey, model);
  }
}

export const GroqAI = GoogleGenAI;
export const Modality = { TEXT: 'TEXT', IMAGE: 'IMAGE', AUDIO: 'AUDIO' };
export const Type = { STRING: 'STRING', NUMBER: 'NUMBER', OBJECT: 'OBJECT', ARRAY: 'ARRAY' };
export default GoogleGenAI;
