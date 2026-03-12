import type {
  Queue,
  Participant,
  Teacher,
  TokenResponse,
  QueueCreateResponse,
  User,
  SwapRequest,
  Window,
  KeyAuthResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://217.71.129.139:4026';

class HttpClient {
  private baseUrl: string;
  private token: string | null = null;
  private adminToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  private loadTokens() {
    this.token = localStorage.getItem('access_token');
    this.adminToken = localStorage.getItem('admin_token');
  }

  private saveTokens() {
    if (this.token) {
      localStorage.setItem('access_token', this.token);
    }
    if (this.adminToken) {
      localStorage.setItem('admin_token', this.adminToken);
    }
  }

  private getHeaders(useAdmin = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = useAdmin ? this.adminToken : this.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    useAdmin = false
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(useAdmin),
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    console.log(`HTTP ${method} ${url} - Status: ${response.status}`);
    console.log('Response:', response.clone().json().catch(() => 'No JSON body'));

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail?.[0]?.msg || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(username: string, password: string): Promise<User> {
    await this.request<TokenResponse>('POST', '/auth/register', {
      username,
      password,
    });
    return this.request<User>('GET', '/auth/me');
  }

  async login(username: string, password: string): Promise<TokenResponse> {
    const response = await this.request<TokenResponse>('POST', '/auth/login', {
      username,
      password,
    });
    this.token = response.access_token;
    this.saveTokens();
    return response;
  }

  async getMe(): Promise<User> {
    return this.request<User>('GET', '/auth/me');
  }

  // Teacher endpoints
  async getTeachers(): Promise<Teacher[]> {
    return this.request<Teacher[]>('GET', '/api/teachers');
  }

  async createTeacher(name: string, subject: string): Promise<Teacher> {
    return this.request<Teacher>('POST', '/api/teachers', { name, subject }, true);
  }

  // Queue endpoints
  async createQueue(
    name: string,
    teacherIds: number[],
    windowCount: number = 1
  ): Promise<QueueCreateResponse> {
    return this.request<QueueCreateResponse>('POST', '/api/queues', {
      name,
      teacher_ids: teacherIds,
      window_count: windowCount,
    });
  }

  async getQueue(queueId: string): Promise<Queue> {
    return this.request<Queue>('GET', `/api/queues/${queueId}`);
  }

  async updateQueueStatus(queueId: string, status: 'active' | 'stopped' | 'closed') {
    return this.request<Queue>(
      'PATCH',
      `/api/queues/${queueId}/status`,
      { status },
      true
    );
  }

  async authWithAdminKey(queueId: string, key: string): Promise<KeyAuthResponse> {
    const response = await this.request<KeyAuthResponse>('POST', '/api/queues/auth', {
      queue_id: queueId,
      key: key,
    });
    this.adminToken = response.access_token;
    this.saveTokens();
    return response;
  }

  // Participant endpoints
  async joinQueue(queueId: string, nickname: string, priority: 'normal' | 'low' = 'normal') {
    const response = await this.request<Participant>('POST', '/participants/join', {
      queue_id: queueId,
      nickname,
      priority,
    });
    localStorage.setItem('participant_id', response.id);
    return response;
  }

  async getParticipant(participantId: string): Promise<Participant> {
    return this.request<Participant>('GET', `/participants/${participantId}`);
  }

  async leaveQueue(participantId: string): Promise<void> {
    return this.request<void>('DELETE', `/participants/${participantId}/leave`);
  }

  async getQueueList(queueId: string): Promise<Participant[]> {
    return this.request<Participant[]>('GET', `/participants/queue/${queueId}/list`);
  }

  async kickParticipant(queueId: string, participantId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/participants/queue/${queueId}/participants/${participantId}`,
      undefined,
      true
    );
  }

  // Window operations
  async assignTeacher(queueId: string, windowNumber: number, teacherName: string): Promise<Window> {
    return this.request<Window>(
      'POST',
      `/api/queues/${queueId}/windows/${windowNumber}/assign`,
      { teacher_name: teacherName },
      true
    );
  }

  async occupyWindow(queueId: string, windowNumber: number): Promise<KeyAuthResponse> {
    const response = await this.request<KeyAuthResponse>(
      'POST',
      `/api/queues/${queueId}/windows/${windowNumber}/occupy`,
      {},
      true
    );
    this.adminToken = response.access_token;
    this.saveTokens();
    return response;
  }

  async releaseWindow(queueId: string, windowNumber: number): Promise<void> {
    return this.request<void>(
      'POST',
      `/api/queues/${queueId}/windows/${windowNumber}/release`,
      {},
      true
    );
  }

  // Window operations (operator/teacher)
  async callNext(queueId: string, windowNumber: number): Promise<Participant | null> {
    return this.request<Participant | null>(
      'POST',
      `/participants/queue/${queueId}/windows/${windowNumber}/call-next`,
      {},
      true
    );
  }

  async finishServing(queueId: string, windowNumber: number): Promise<void> {
    return this.request<void>(
      'POST',
      `/participants/queue/${queueId}/windows/${windowNumber}/finish`,
      {},
      true
    );
  }

  async returnToQueue(queueId: string, windowNumber: number): Promise<void> {
    return this.request<void>(
      'POST',
      `/participants/queue/${queueId}/windows/${windowNumber}/return`,
      {},
      true
    );
  }

  async updateWindowStatus(
    queueId: string,
    windowNumber: number,
    status: 'idle' | 'busy' | 'paused'
  ): Promise<Window> {
    return this.request<Window>(
      'PATCH',
      `/participants/queue/${queueId}/windows/${windowNumber}/status`,
      { status },
      true
    );
  }

  // Swap endpoints
  async requestSwap(participantId: string, toParticipantId: string): Promise<SwapRequest> {
    return this.request<SwapRequest>('POST', `/participants/${participantId}/swap`, {
      to_participant_id: toParticipantId,
    });
  }

  async confirmSwap(swapId: string, participantId: string): Promise<SwapRequest> {
    return this.request<SwapRequest>(
      'POST',
      `/participants/swap/${swapId}/confirm?participant_id=${participantId}`
    );
  }

  async rejectSwap(swapId: string, participantId: string): Promise<SwapRequest> {
    return this.request<SwapRequest>(
      'POST',
      `/participants/swap/${swapId}/reject?participant_id=${participantId}`
    );
  }

  setToken(token: string) {
    this.token = token;
    this.saveTokens();
  }

  setAdminToken(token: string) {
    this.adminToken = token;
    this.saveTokens();
  }

  clearTokens() {
    this.token = null;
    this.adminToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_token');
  }
}

export const httpClient = new HttpClient();
