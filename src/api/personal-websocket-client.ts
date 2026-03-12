// Personal WebSocket client for individual participant events
export type WSEventHandler<T = any> = (data: T) => void;

interface WebSocketMessage {
  event: string;
  data: any;
}

class PersonalWebSocketClient {
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

  connect(participantId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.shouldReconnect = true;

        const wsUrl = `${this.url}/ws/participant/${participantId}`;
        console.log('[PersonalWS] Connecting to:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[PersonalWS] Connected to personal channel:', participantId);
          this.reconnectAttempts = 0;
          this.emit('CONNECTED', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('[PersonalWS] Message received:', message.event, message.data);

            this.emit(message.event, message.data);
          } catch (error) {
            console.error('[PersonalWS] Failed to parse message:', error, 'Raw data:', event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[PersonalWS] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[PersonalWS] Disconnected from personal channel');
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              console.log(`[PersonalWS] Reconnecting... (attempt ${this.reconnectAttempts})`);
              this.connect(participantId).catch((e) => console.error('[PersonalWS] Reconnect failed:', e));
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
    console.log(`[PersonalWS] Registering handler for event: "${eventType}"`);
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as WSEventHandler);

    return () => {
      this.handlers.get(eventType)?.delete(handler as WSEventHandler);
    };
  }

  private emit(eventType: string, data: any) {
    console.log(`[PersonalWS] Emitting event: "${eventType}"`, data);
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      console.log(`[PersonalWS] Executing ${handlers.size} handlers for ${eventType}`);
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[PersonalWS] Error in handler for ${eventType}:`, error);
        }
      });
    } else {
      console.log(`[PersonalWS] No handlers registered for event type "${eventType}"`);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const personalWsClient = new PersonalWebSocketClient();
