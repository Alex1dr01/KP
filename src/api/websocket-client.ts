// WebSocket event handler type
export type WSEventHandler<T = any> = (data: T) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<WSEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private shouldReconnect = false;

  constructor(baseUrl: string = import.meta.env.VITE_WS_URL || 'ws://217.71.129.139:4026') {
    this.url = baseUrl;
  }

  connect(queueId: string, token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.shouldReconnect = true;

        const wsUrl = `${this.url}/ws/queue/${queueId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.emit('CONNECTED', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: any = JSON.parse(event.data);
            console.log('=== WebSocket Message Received ===');
            console.log('Raw message:', JSON.stringify(message, null, 2));
            
            let eventType = message.event;
            let eventData = message.data || message;
            
            console.log('Parsed eventType:', eventType);
            console.log('Parsed eventData:', eventData);
            console.log('Handlers registered for this event:', this.handlers.get(eventType)?.size || 0);
            console.log('All registered event types:', Array.from(this.handlers.keys()));
            console.log('=====================================');
            
            this.emit(eventType, eventData);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error, 'Raw data:', event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
              this.connect(queueId, token).catch((e) => console.error('Reconnect failed:', e));
            }, this.reconnectDelay);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  clearHandlers() {
    this.handlers.clear();
  }

  on<T = any>(eventType: string, handler: WSEventHandler<T>) {
    console.log(`[REGISTER] Registering handler for event: "${eventType}"`);
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as WSEventHandler);
    console.log(`[REGISTER] Total handlers for "${eventType}" now:`, this.handlers.get(eventType)!.size);
    console.log(`[REGISTER] All registered event types:`, Array.from(this.handlers.keys()));

    return () => {
      this.handlers.get(eventType)?.delete(handler as WSEventHandler);
    };
  }

  private emit(eventType: string, data: any) {
    console.log(`[EMIT] eventType: "${eventType}", Handlers count:`, this.handlers.get(eventType)?.size || 0);
    console.log(`[EMIT] All registered event types:`, Array.from(this.handlers.keys()));
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      console.log(`[EMIT] Executing ${handlers.size} handlers for ${eventType}`);
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for ${eventType}:`, error);
        }
      });
    } else {
      console.log(`[EMIT] No handlers registered for event type "${eventType}"`);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
