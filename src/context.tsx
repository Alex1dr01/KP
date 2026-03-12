import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type UserRole, type QueueMember, type WorkersMap, type ScreenId, type Participant, type Queue, type Teacher, type SwapRequest } from './types';
import { httpClient } from './api/http-client';
import { wsClient } from './api/websocket-client';
import { personalWsClient } from './api/personal-websocket-client';

interface AppContextType {
  // Navigation
  currentScreen: ScreenId;
  showScreen: (screenId: ScreenId) => void;

  // User state
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUserName: string;
  setCurrentUserName: (name: string) => void;
  participantId: string | null;
  setParticipantId: (id: string | null) => void;

  // Queue data
  queueData: QueueMember[];
  setQueueData: (data: QueueMember[]) => void;
  addToQueue: (member: QueueMember) => void;
  removeFromQueue: (index: number) => void;
  sortQueue: () => void;

  // Worker management
  workerCount: number;
  setWorkerCount: (count: number) => void;
  workersMap: WorkersMap;
  setWorkersMap: (map: WorkersMap) => void;
  isActiveWorker: boolean;
  setIsActiveWorker: (active: boolean) => void;
  myWindowNum: number | null;
  setMyWindowNum: (num: number | null) => void;

  // Queue info
  queueTitle: string;
  setQueueTitle: (title: string) => void;
  queueId: string;
  setQueueId: (id: string) => void;
  queue: Queue | null;
  setQueue: (queue: Queue | null) => void;

  // AI Messages
  aiMessages: string[];
  addAiMessage: (message: string) => void;
  clearAiMessages: () => void;

  // Swap Requests
  incomingSwapRequest: SwapRequest | null;
  setIncomingSwapRequest: (request: SwapRequest | null) => void;

  // API Methods
  joinQueue: (queueId: string, nickname: string, priority: 'normal' | 'low') => Promise<void>;
  leaveQueue: () => Promise<void>;
  createQueue: (name: string, teacherIds: number[], windowCount: number) => Promise<void>;
  callNextParticipant: (windowNumber: number) => Promise<void>;
  finishServing: (windowNumber: number) => Promise<void>;
  returnToQueue: (windowNumber: number) => Promise<void>;
  updateWindowStatus: (windowNumber: number, status: 'idle' | 'busy' | 'paused') => Promise<void>;
  getTeachers: () => Promise<Teacher[]>;
  createTeacher: (name: string, subject: string) => Promise<Teacher>;
  assignTeacher: (windowNumber: number, teacherName: string) => Promise<void>;
  occupyWindow: (windowNumber: number) => Promise<void>;
  releaseWindow: (windowNumber: number) => Promise<void>;
  authenticateWithAdminKey: (queueId: string, adminKey: string) => Promise<void>;
  requestSwap: (toParticipantId: string) => Promise<void>;
  confirmSwap: (swapId: string) => Promise<void>;
  rejectSwap: (swapId: string) => Promise<void>;
  kickParticipant: (participantId: string) => Promise<void>;
  markAsRework: (participantId: string, windowNumber: number) => Promise<void>;
  markAsReady: (participantId: string) => void;
  reworkParticipants: Record<string, { ready: boolean }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  // Helper functions for session persistence
  const loadSessionState = () => {
    try {
      const savedSession = localStorage.getItem('queue_session');
      if (savedSession) {
        return JSON.parse(savedSession);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    return null;
  };

  const saveSessionState = (state: any) => {
    try {
      localStorage.setItem('queue_session', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const session = loadSessionState();

  // Navigation
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(session?.currentScreen || 'welcome');

  // User state
  const [currentRole, setCurrentRole] = useState<UserRole>(session?.currentRole || 'student');
  const [currentUserName, setCurrentUserName] = useState(session?.currentUserName || '');
  const [participantId, setParticipantId] = useState<string | null>(session?.participantId || null);

  // Queue data
  const [queueData, setQueueData] = useState<QueueMember[]>(session?.queueData || []);

  // Worker management
  const [workerCount, setWorkerCount] = useState(session?.workerCount || 2);
  const [workersMap, setWorkersMap] = useState<WorkersMap>(session?.workersMap || {});
  const [isActiveWorker, setIsActiveWorker] = useState(session?.isActiveWorker || false);
  const [myWindowNum, setMyWindowNum] = useState<number | null>(session?.myWindowNum || null);

  // Queue info
  const [queueTitle, setQueueTitle] = useState(session?.queueTitle || 'Smart Queue');
  const [queueId, setQueueId] = useState(session?.queueId || '');
  const [queue, setQueue] = useState<Queue | null>(session?.queue || null);

  // AI Messages
  const [aiMessages, setAiMessages] = useState<string[]>([]);

  // Swap Requests
  const [incomingSwapRequest, setIncomingSwapRequest] = useState<SwapRequest | null>(null);

  // Rework tracking (local)
  const [reworkParticipants, setReworkParticipants] = useState<Record<string, { ready: boolean }>>(session?.reworkParticipants || {});

  // Save session to localStorage whenever important state changes
  useEffect(() => {
    const sessionState = {
      currentScreen,
      currentRole,
      currentUserName,
      participantId,
      queueData,
      workerCount,
      workersMap,
      isActiveWorker,
      myWindowNum,
      queueTitle,
      queueId,
      queue,
      reworkParticipants,
    };
    saveSessionState(sessionState);
  }, [
    currentScreen,
    currentRole,
    currentUserName,
    participantId,
    queueData,
    workerCount,
    workersMap,
    isActiveWorker,
    myWindowNum,
    queueTitle,
    queueId,
    queue,
    reworkParticipants,
  ]);

  const showScreen = (screenId: ScreenId) => {
    setCurrentScreen(screenId);
  };

  const addToQueue = (member: QueueMember) => {
    setQueueData([...queueData, member]);
  };

  const removeFromQueue = (index: number) => {
    setQueueData(queueData.filter((_, i) => i !== index));
  };

  const sortQueue = () => {
    const sorted = [...queueData].sort((a, b) => {
      const priorityDiff = (b.priority === 'normal' ? 0 : 1) - (a.priority === 'normal' ? 0 : 1);
      if (priorityDiff !== 0) return priorityDiff;
      return a.pos - b.pos;
    });
    setQueueData(sorted);
  };

  const addAiMessage = (message: string) => {
    if (aiMessages.length > 0 && aiMessages[0] === message) {
      return;
    }
    setAiMessages([message, ...aiMessages]);
  };

  const clearAiMessages = () => {
    setAiMessages([]);
  };

  // Restore WebSocket connection on app load if user was in a queue
  useEffect(() => {
    const restoreSession = async () => {
      if (session && participantId && queueId) {
        try {
          console.log('[Session Restore] Attempting to restore queue session...');
          // Try to reconnect to WebSocket
          await wsClient.connect(queueId);
          console.log('[Session Restore] WebSocket restored for queue:', queueId);

          // Verify participant is still active
          try {
            const participant = await httpClient.getParticipant(participantId);
            console.log('[Session Restore] Participant verified:', participant);
            setCurrentScreen('ticket'); // Return to ticket screen if reconnected
          } catch (error) {
            console.error('[Session Restore] Participant no longer exists:', error);
            // Clear session if participant is gone
            localStorage.removeItem('queue_session');
            setCurrentScreen('welcome');
            setParticipantId(null);
            setQueueData([]);
          }
        } catch (error) {
          console.error('[Session Restore] Failed to restore session:', error);
          setCurrentScreen('welcome');
        }
      }
    };

    // Only try to restore if we have a valid session on mount
    if (session && !wsClient.isConnected()) {
      restoreSession();
    }
  }, []); // Run only once on mount

  // API Methods
  const joinQueue = useCallback(async (queueId: string, nickname: string, priority: 'normal' | 'low') => {
    try {
      // Clear any leftover handlers from a previous session before registering new ones
      wsClient.clearHandlers();
      personalWsClient.clearHandlers();

      const participant = await httpClient.joinQueue(queueId, nickname, priority);
      setParticipantId(participant.id);
      setCurrentUserName(nickname);
      setQueueId(queueId);
      setCurrentRole('student');

      // Connect to queue WebSocket (for general queue updates)
      await wsClient.connect(queueId);
      console.log('[joinQueue] WebSocket connected for queue:', queueId);

      // Connect to personal WebSocket (for participant-specific events)
      await personalWsClient.connect(participant.id);
      console.log('[joinQueue] Personal WebSocket connected for participant:', participant.id);

      // Load queue info to get real window count
      try {
        const queueInfo = await httpClient.getQueue(queueId);
        setQueueTitle(queueInfo.name);
        setWorkerCount(queueInfo.window_count);
        // Initialize workersMap with real window count
        const workers: WorkersMap = {};
        for (let i = 1; i <= queueInfo.window_count; i++) {
          workers[i] = { name: `Окно ${i}`, status: 'idle', currentTicket: null };
        }
        setWorkersMap(workers);
        console.log('[joinQueue] Queue info loaded, window_count:', queueInfo.window_count);
      } catch (error) {
        console.error('[joinQueue] Failed to load queue info:', error);
      }

      // Load initial queue data
      const initialParticipants = await httpClient.getQueueList(queueId);
      console.log('[joinQueue] Initial participants loaded:', initialParticipants);
      const mapped = initialParticipants.map((p) => ({
        name: p.nickname,
        pos: p.position,
        priority: p.priority,
        id: p.id,
        status: p.status,
        estimated_wait_sec: p.estimated_wait_sec,
      }));
      setQueueData(mapped);

      // ==================== PERSONAL WEBSOCKET HANDLERS ====================
      // These events are received on the participant's personal channel

      personalWsClient.on<any>('SWAP_REQUEST', (data) => {
        console.log('[joinQueue] SWAP_REQUEST from personal channel:', data);
        const swapRequest: SwapRequest = {
          id: data.swap_id || data.id,
          from_participant_id: data.from_participant_id,
          to_participant_id: data.to_participant_id,
          status: 'pending',
          from_nickname: data.from_nickname,
          to_nickname: nickname,
        };
        addAiMessage(`🔄 ${data.from_nickname || data.from_participant_id} хочет обменяться местами (позиция ${data.from_position} → ${data.to_position})`);
        setIncomingSwapRequest(swapRequest);
      });

      personalWsClient.on<any>('SWAP_CONFIRMED', async (data) => {
        console.log('[joinQueue] SWAP_CONFIRMED from personal channel:', data);
        addAiMessage(`✅ Обмен подтвержден! Ваша новая позиция: ${data.new_position}`);
        setIncomingSwapRequest(null);
        // Always reload from API to avoid stale closure on queueData
        try {
          const updatedParticipants = await httpClient.getQueueList(queueId);
          const mapped = updatedParticipants.map((p) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        } catch (error) {
          console.error('[joinQueue] Failed to reload queue after SWAP_CONFIRMED:', error);
        }
      });

      personalWsClient.on<any>('SWAP_REJECTED', (data) => {
        console.log('[joinQueue] SWAP_REJECTED from personal channel:', data);
        addAiMessage(`❌ Обмен отклонен`);
        setIncomingSwapRequest(null);
      });

      personalWsClient.on<any>('CALL_CLIENT', (data) => {
        console.log('[joinQueue] CALL_CLIENT from personal channel:', data);
        const message = data.message || `Вас ждут в окне №${data.window_number}`;
        addAiMessage(`✅ ${message}`);
      });

      // ==================== QUEUE WEBSOCKET HANDLERS ====================
      // These events are received on the general queue channel

      wsClient.on<Participant[]>('QUEUE_LIST', (data) => {
        console.log('[joinQueue] QUEUE_LIST event received:', data);
        const mapped = data.map((p) => ({
          name: p.nickname,
          pos: p.position,
          priority: p.priority,
          id: p.id,
          status: p.status,
          estimated_wait_sec: p.estimated_wait_sec,
        }));
        setQueueData(mapped);
      });

      wsClient.on<Participant>('USER_JOINED', async (data) => {
        console.log('[joinQueue] USER_JOINED event received:', data.nickname);
        addAiMessage(`${data.nickname} присоединился к очереди`);
        try {
          const updatedParticipants = await httpClient.getQueueList(queueId);
          console.log('[joinQueue] Queue reloaded after USER_JOINED:', updatedParticipants);
          const mapped = updatedParticipants.map((p) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        } catch (error) {
          console.error('[joinQueue] Failed to reload queue after user joined:', error);
        }
      });

      wsClient.on<any>('USER_LEFT', async (data) => {
        console.log('[joinQueue] USER_LEFT event received:', data.nickname || data.participant_id);

        // Fix 2: If the current user was the one who left/was kicked, trigger leaveQueue
        if (data.participant_id === participantId) {
          console.log('[joinQueue] Current user was kicked or left. Cleaning up...');
          addAiMessage('Вы покинули очередь или были исключены оператором.');
          leaveQueue();
          return;
        }

        addAiMessage(`${data.nickname || 'Кто-то'} покинул очередь`);
        // Reload queue list to remove participant
        try {
          const updatedParticipants = await httpClient.getQueueList(queueId);
          const mapped = updatedParticipants.map((p) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        } catch (error) {
          console.error('[joinQueue] Failed to reload queue after user left:', error);
        }
      });

      wsClient.on<any>('POSITION_UPDATED', async (data) => {
        console.log('[joinQueue] POSITION_UPDATED event received:', data);

        const updatedParticipants = await httpClient.getQueueList(queueId);
        console.log('[joinQueue] Queue reloaded after POSITION_UPDATED:', updatedParticipants);
        const mapped = updatedParticipants.map((p) => ({
          name: p.nickname,
          pos: p.position,
          priority: p.priority,
          id: p.id,
          status: p.status,
          estimated_wait_sec: p.estimated_wait_sec,
        }));
        setQueueData(mapped);

        // Check if this is a finished participant notification
        if (data.finished_participant && typeof data.finished_participant === 'string') {
          console.log('[joinQueue] Finished participant:', data.finished_participant);

          // If it's the current user (using the nickname parameter for closure safety), remove them from queue
          if (data.finished_participant === nickname) {
            console.log('[joinQueue] Current user was finished!');
            addAiMessage(`✅ Спасибо за ожидание! Вы были обслужены.`);

            // Comprehensive cleanup
            try {
              wsClient.disconnect();
              personalWsClient.disconnect();
              localStorage.removeItem('queue_session');
              localStorage.removeItem('participant_id');

              setParticipantId(null);
              setCurrentUserName('');
              setQueueData([]);
              setQueueId('');
              setQueue(null);
              setQueueTitle('Smart Queue');
              setCurrentScreen('welcome');
              setAiMessages([]);
            } catch (error) {
              console.error('[joinQueue] Error during cleanup:', error);
            }
            return;
          }
        }

        // Otherwise, if data is an array, update the queue list
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        }
      });

      wsClient.on<{ status: string }>('QUEUE_STATUS_CHANGED', (data) => {
        console.log('[joinQueue] QUEUE_STATUS_CHANGED event received:', data);
        if (data.status === 'closed') {
          addAiMessage('Очередь закрыта');
        } else if (data.status === 'stopped') {
          addAiMessage('Очередь остановлена');
        }
      });

      wsClient.on<any>('WORKER_STATUS_CHANGED', (data) => {
        console.log('[joinQueue] WORKER_STATUS_CHANGED event received:', data);
        const { window_number, status, serving, assigned_teacher } = data;
        setWorkersMap(prev => {
          const updated = { ...prev };
          if (!updated[window_number]) return prev;

          let feStatus: 'idle' | 'busy' | 'paused' = 'idle';
          if (status === 'busy' || status === 'occupied') feStatus = 'busy';
          else if (status === 'paused') feStatus = 'paused';

          updated[window_number] = {
            ...updated[window_number],
            status: feStatus,
            currentTicket: serving ? { nickname: serving, position: 0, status: 'serving', priority: 'normal', id: '' } as any : null,
            name: assigned_teacher ? `${assigned_teacher} (Окно ${window_number})` : `Окно ${window_number}`
          };
          return updated;
        });
      });

      console.log('[joinQueue] All event handlers registered successfully');
    } catch (error) {
      console.error('Failed to join queue:', error);
      throw error;
    }
  }, []);

  const leaveQueue = useCallback(async () => {
    try {
      if (participantId) {
        await httpClient.leaveQueue(participantId);
      }
    } catch (error) {
      console.error('Failed to leave queue (will continue with logout):', error);
    }

    // Clear all session data comprehensively
    try {
      wsClient.disconnect();
      personalWsClient.disconnect();
      localStorage.removeItem('queue_session');
      localStorage.removeItem('participant_id');

      // Reset all state variables
      setParticipantId(null);
      setCurrentUserName('');
      setQueueData([]);
      setQueueId('');
      setQueue(null);
      setQueueTitle('Smart Queue');
      setCurrentScreen('welcome');
      setAiMessages([]);
      setCurrentRole('student');
      setIsActiveWorker(false);
      setWorkersMap({});
      setWorkerCount(2);
      setMyWindowNum(null);
      setIncomingSwapRequest(null);
      setReworkParticipants({});

      console.log('[leaveQueue] Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }, [participantId]);

  const createQueue = useCallback(async (name: string, teacherIds: number[], windowCount: number) => {
    try {
      // Clear any leftover handlers from a previous session before registering new ones
      wsClient.clearHandlers();
      personalWsClient.clearHandlers();

      const response = await httpClient.createQueue(name, teacherIds, windowCount);
      setQueueId(response.queue_id);
      setQueueTitle(name);
      setCurrentRole('operator');
      setIsActiveWorker(true);
      httpClient.setAdminToken(response.access_token);

      // Initialize workers
      const workers: WorkersMap = {};
      for (let i = 1; i <= windowCount; i++) {
        workers[i] = {
          name: `Окно ${i}`,
          status: 'idle',
          currentTicket: null,
        };
      }
      setWorkersMap(workers);
      setWorkerCount(windowCount);

      // Connect to WebSocket
      await wsClient.connect(response.queue_id, response.access_token);
      console.log('[createQueue] WebSocket connected for queue:', response.queue_id);

      // Load initial queue data
      const initialParticipants = await httpClient.getQueueList(response.queue_id);
      console.log('[createQueue] Initial participants loaded:', initialParticipants);
      const mapped = initialParticipants.map((p) => ({
        name: p.nickname,
        pos: p.position,
        priority: p.priority,
        id: p.id,
        status: p.status,
        estimated_wait_sec: p.estimated_wait_sec,
      }));
      setQueueData(mapped);

      // Subscribe to updates
      console.log('[createQueue] Starting to register event handlers...');

      wsClient.on<Participant>('USER_JOINED', async (data) => {
        console.log('[createQueue] USER_JOINED event received:', data.nickname);
        addAiMessage(`${data.nickname} присоединился`);
        // Reload queue list to show new participant
        try {
          const updatedParticipants = await httpClient.getQueueList(response.queue_id);
          console.log('[createQueue] Queue reloaded after USER_JOINED');
          const mapped = updatedParticipants.map((p) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        } catch (error) {
          console.error('[createQueue] Failed to reload queue after user joined:', error);
        }
      });

      wsClient.on<{ nickname: string }>('USER_LEFT', async (data) => {
        console.log('[createQueue] USER_LEFT event received:', data.nickname);
        addAiMessage(`${data.nickname} покинул очередь`);
        // Reload queue list to remove participant
        try {
          const updatedParticipants = await httpClient.getQueueList(response.queue_id);
          console.log('[createQueue] Queue reloaded after USER_LEFT');
          const mapped = updatedParticipants.map((p) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        } catch (error) {
          console.error('[createQueue] Failed to reload queue after user left:', error);
        }
      });

      wsClient.on<any>('POSITION_UPDATED', (data) => {
        console.log('[createQueue] POSITION_UPDATED event received:', data);

        // Check if this contains finished participant info
        if (data.finished_participant && typeof data.finished_participant === 'string') {
          console.log('[createQueue] Participant finished:', data.finished_participant, 'Window:', data.window_number);
          addAiMessage(`✅ Участник ${data.finished_participant} обслужен на окне ${data.window_number}`);

          // Reload queue to reflect changes
          try {
            httpClient.getQueueList(response.queue_id).then((participants) => {
              const mapped = participants.map((p) => ({
                name: p.nickname,
                pos: p.position,
                priority: p.priority,
                id: p.id,
                status: p.status,
                estimated_wait_sec: p.estimated_wait_sec,
              }));
              setQueueData(mapped);
            });
          } catch (error) {
            console.error('[createQueue] Failed to reload queue:', error);
          }
          return;
        }

        // Otherwise if data is an array, update the queue list
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        }
      });

      wsClient.on<any>('WORKER_STATUS_CHANGED', (data) => {
        console.log('[createQueue] WORKER_STATUS_CHANGED event received:', data);
        const { window_number, status, serving, assigned_teacher } = data;
        setWorkersMap(prev => {
          const updated = { ...prev };
          if (!updated[window_number]) return prev;

          let feStatus: 'idle' | 'busy' | 'paused' = 'idle';
          if (status === 'busy' || status === 'occupied') feStatus = 'busy';
          else if (status === 'paused') feStatus = 'paused';

          updated[window_number] = {
            ...updated[window_number],
            status: feStatus,
            currentTicket: serving ? { nickname: serving, position: 0, status: 'serving', priority: 'normal', id: '' } as any : null,
            name: assigned_teacher ? `${assigned_teacher} (Окно ${window_number})` : `Окно ${window_number}`
          };
          return updated;
        });
      });

      wsClient.on<SwapRequest>('SWAP_REQUEST', (data) => {
        console.log('[createQueue] SWAP_REQUEST event received:', data);
        const fromName = data.from_nickname || data.from_participant_id;
        const toName = data.to_nickname || data.to_participant_id;
        addAiMessage(`🔄 Запрос обмена: ${fromName} → ${toName}`);
      });

      wsClient.on<SwapRequest>('SWAP_CONFIRMED', (data) => {
        console.log('[createQueue] SWAP_CONFIRMED event received:', data);
        const fromName = data.from_nickname || data.from_participant_id;
        const toName = data.to_nickname || data.to_participant_id;
        addAiMessage(`✅ Обмен подтвержден: ${fromName} ↔ ${toName}`);
      });

      wsClient.on<SwapRequest>('SWAP_REJECTED', (data) => {
        console.log('[createQueue] SWAP_REJECTED event received:', data);
        const fromName = data.from_nickname || data.from_participant_id;
        const toName = data.to_nickname || data.to_participant_id;
        addAiMessage(`❌ Обмен отклонен: ${fromName} и ${toName}`);
      });

      wsClient.on<Participant>('PARTICIPANT_FINISHED', async (data) => {
        console.log('[createQueue] PARTICIPANT_FINISHED event received:', data.nickname);
        addAiMessage(`✅ ${data.nickname} обслужен и исключен из очереди`);
        // Reload queue to remove finished participant
        try {
          const updatedParticipants = await httpClient.getQueueList(response.queue_id);
          console.log('[createQueue] Queue reloaded after participant finished');
          const mapped = updatedParticipants.map((p) => ({
            name: p.nickname,
            pos: p.position,
            priority: p.priority,
            id: p.id,
            status: p.status,
            estimated_wait_sec: p.estimated_wait_sec,
          }));
          setQueueData(mapped);
        } catch (error) {
          console.error('[createQueue] Failed to reload queue after participant finished:', error);
        }
      });

      console.log('[createQueue] All event handlers registered successfully');
    } catch (error) {
      console.error('Failed to create queue:', error);
      throw error;
    }
  }, []);

  const callNextParticipant = useCallback(async (windowNumber: number) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      const participant = await httpClient.callNext(queueId, windowNumber);
      if (participant) {
        const updated = { ...workersMap };
        updated[windowNumber] = {
          ...updated[windowNumber],
          status: 'busy',
          currentTicket: participant,
        };
        setWorkersMap(updated);
        addAiMessage(`${participant.nickname} подошел к окну ${windowNumber}`);
      }
    } catch (error) {
      console.error('Failed to call next participant:', error);
      throw error;
    }
  }, [queueId, workersMap]);

  const finishServing = useCallback(async (windowNumber: number) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      await httpClient.finishServing(queueId, windowNumber);
      const updated = { ...workersMap };
      updated[windowNumber] = {
        ...updated[windowNumber],
        status: 'idle',
        currentTicket: null,
      };
      setWorkersMap(updated);
      addAiMessage(`Обслуживание на окне ${windowNumber} завершено`);

      try {
        const updatedParticipants = await httpClient.getQueueList(queueId);
        console.log('[finishServing] Queue reloaded after finishing service');
        const mapped = updatedParticipants.map((p) => ({
          name: p.nickname,
          pos: p.position,
          priority: p.priority,
          id: p.id,
          status: p.status,
          estimated_wait_sec: p.estimated_wait_sec,
        }));
        setQueueData(mapped);
      } catch (error) {
        console.error('[finishServing] Failed to reload queue:', error);
      }
    } catch (error) {
      console.error('Failed to finish serving:', error);
      throw error;
    }
  }, [queueId, workersMap]);

  const returnToQueue = useCallback(async (windowNumber: number) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      await httpClient.returnToQueue(queueId, windowNumber);
      const updated = { ...workersMap };
      updated[windowNumber] = {
        ...updated[windowNumber],
        status: 'idle',
        currentTicket: null,
      };
      setWorkersMap(updated);
      addAiMessage(`Участник вернулся в очередь с окна ${windowNumber}`);
    } catch (error) {
      console.error('Failed to return to queue:', error);
      throw error;
    }
  }, [queueId, workersMap]);

  const updateWindowStatus = useCallback(async (windowNumber: number, status: 'idle' | 'busy' | 'paused') => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      await httpClient.updateWindowStatus(queueId, windowNumber, status);
      const updated = { ...workersMap };
      updated[windowNumber] = {
        ...updated[windowNumber],
        status,
      };
      setWorkersMap(updated);
    } catch (error) {
      console.error('Failed to update window status:', error);
      throw error;
    }
  }, [queueId, workersMap]);

  const getTeachers = useCallback(async () => {
    return await httpClient.getTeachers();
  }, []);

  const createTeacher = useCallback(async (name: string, subject: string) => {
    try {
      const teacher = await httpClient.createTeacher(name, subject);
      addAiMessage(`✅ Преподаватель ${name} создан`);
      return teacher;
    } catch (error) {
      console.error('Failed to create teacher:', error);
      throw error;
    }
  }, []);

  const assignTeacher = useCallback(async (windowNum: number, teacherName: string) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      await httpClient.assignTeacher(queueId, windowNum, teacherName);
      addAiMessage(`✅ Преподаватель ${teacherName} назначен на окно ${windowNum}`);
    } catch (error) {
      console.error('Failed to assign teacher:', error);
      throw error;
    }
  }, [queueId]);

  const occupyWindow = useCallback(async (windowNum: number) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      const response = await httpClient.occupyWindow(queueId, windowNum);
      setMyWindowNum(windowNum);
      setIsActiveWorker(true);
      setCurrentRole(response.role as any);
      addAiMessage(`✅ Вы заняли окно ${windowNum}`);
    } catch (error) {
      console.error('Failed to occupy window:', error);
      throw error;
    }
  }, [queueId]);

  const releaseWindow = useCallback(async (windowNum: number) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      await httpClient.releaseWindow(queueId, windowNum);
      setMyWindowNum(null);
      setIsActiveWorker(false);
      addAiMessage(`✅ Вы освободили окно ${windowNum}`);
    } catch (error) {
      console.error('Failed to release window:', error);
      throw error;
    }
  }, [queueId]);

  const authenticateWithAdminKey = useCallback(async (queueId: string, adminKey: string) => {
    try {
      const response = await httpClient.authWithAdminKey(queueId, adminKey);
      setQueueId(queueId);
      setCurrentRole(response.role as any);
      setIsActiveWorker(response.role === 'teacher' || response.role === 'operator');
      setMyWindowNum(response.window_number);
      httpClient.setAdminToken(response.access_token);

      // Fetch queue data
      const queueData = await httpClient.getQueue(queueId);
      setQueue(queueData);
      setQueueTitle(queueData.name);

      // Initialize workers
      const workers: WorkersMap = {};
      for (let i = 1; i <= queueData.window_count; i++) {
        workers[i] = {
          name: `Окно ${i}`,
          status: 'idle',
          currentTicket: null,
        };
      }
      setWorkersMap(workers);
      setWorkerCount(queueData.window_count);

      // Connect to WebSocket
      await wsClient.connect(queueId, response.access_token);
      console.log('[authWithKey] WebSocket connected for queue:', queueId);

      // Register same handlers as createQueue for consistency
      wsClient.on<any>('USER_JOINED', async (data) => {
        const updated = await httpClient.getQueueList(queueId);
        setQueueData(updated.map(p => ({
          name: p.nickname, pos: p.position, priority: p.priority, id: p.id, status: p.status, estimated_wait_sec: p.estimated_wait_sec
        })));
      });

      wsClient.on<{ nickname: string }>('USER_LEFT', async (data) => {
        const updated = await httpClient.getQueueList(queueId);
        setQueueData(updated.map(p => ({
          name: p.nickname, pos: p.position, priority: p.priority, id: p.id, status: p.status, estimated_wait_sec: p.estimated_wait_sec
        })));
      });

      wsClient.on<any>('POSITION_UPDATED', async (data) => {
        const updated = await httpClient.getQueueList(queueId);
        setQueueData(updated.map(p => ({
          name: p.nickname, pos: p.position, priority: p.priority, id: p.id, status: p.status, estimated_wait_sec: p.estimated_wait_sec
        })));
      });

      wsClient.on<any>('WORKER_STATUS_CHANGED', (data) => {
        const { window_number, status, serving, assigned_teacher } = data;
        setWorkersMap(prev => {
          const updated = { ...prev };
          if (!updated[window_number]) return prev;
          let feStatus: 'idle' | 'busy' | 'paused' = 'idle';
          if (status === 'busy' || status === 'occupied') feStatus = 'busy';
          else if (status === 'paused') feStatus = 'paused';
          updated[window_number] = {
            ...updated[window_number],
            status: feStatus,
            currentTicket: serving ? { nickname: serving, position: 0, status: 'serving', priority: 'normal', id: '' } as any : null,
            name: assigned_teacher ? `${assigned_teacher} (Окно ${window_number})` : `Окно ${window_number}`
          };
          return updated;
        });
      });
    } catch (error) {
      console.error('Failed to authenticate with admin key:', error);
      throw error;
    }
  }, []);

  const requestSwap = useCallback(async (toParticipantId: string) => {
    try {
      console.log('[requestSwap] Requesting swap from:', participantId, 'to:', toParticipantId);
      if (!participantId) throw new Error('Participant ID not set');
      const response = await httpClient.requestSwap(participantId, toParticipantId);
      console.log('[requestSwap] Swap request successful:', response);
      addAiMessage('✅ Запрос на обмен отправлен');
    } catch (error) {
      console.error('[requestSwap] Failed to request swap:', error);
      throw error;
    }
  }, [participantId]);

  const confirmSwap = useCallback(async (swapId: string) => {
    try {
      if (!participantId) throw new Error('Participant ID not set');
      await httpClient.confirmSwap(swapId, participantId);
      addAiMessage('✅ Обмен подтвержден');
      setIncomingSwapRequest(null); // Clear the request after confirmation
    } catch (error) {
      console.error('Failed to confirm swap:', error);
      throw error;
    }
  }, [participantId]);

  const rejectSwap = useCallback(async (swapId: string) => {
    try {
      if (!participantId) throw new Error('Participant ID not set');
      await httpClient.rejectSwap(swapId, participantId);
      addAiMessage('❌ Обмен отклонен');
      setIncomingSwapRequest(null); // Clear the request after rejection
    } catch (error) {
      console.error('Failed to reject swap:', error);
      throw error;
    }
  }, [participantId]);

  const kickParticipant = useCallback(async (targetParticipantId: string) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');
      await httpClient.kickParticipant(queueId, targetParticipantId);
      addAiMessage(`🚫 Участник исключен из очереди`);

      // Reload queue list
      const updatedParticipants = await httpClient.getQueueList(queueId);
      const mapped = updatedParticipants.map((p) => ({
        name: p.nickname,
        pos: p.position,
        priority: p.priority,
        id: p.id,
        status: p.status,
        estimated_wait_sec: p.estimated_wait_sec,
      }));
      setQueueData(mapped);
    } catch (error) {
      console.error('Failed to kick participant:', error);
      throw error;
    }
  }, [queueId]);

  const markAsRework = useCallback(async (targetParticipantId: string, windowNumber: number) => {
    try {
      if (!queueId) throw new Error('Queue ID not set');

      // Return him to queue first (backend)
      await httpClient.returnToQueue(queueId, windowNumber);

      // Mark as rework locally with ready: false
      setReworkParticipants(prev => ({
        ...prev,
        [targetParticipantId]: { ready: false }
      }));

      addAiMessage(`🔄 Участник отправлен на доработку`);

      // Update local workers status
      const updated = { ...workersMap };
      updated[windowNumber] = {
        ...updated[windowNumber],
        status: 'idle',
        currentTicket: null,
      };
      setWorkersMap(updated);

      // Reload queue list
      const updatedParticipants = await httpClient.getQueueList(queueId);
      const mapped = updatedParticipants.map((p) => ({
        name: p.nickname,
        pos: p.position,
        priority: p.priority,
        id: p.id,
        status: p.status,
        estimated_wait_sec: p.estimated_wait_sec,
      }));
      setQueueData(mapped);
    } catch (error) {
      console.error('Failed to mark as rework:', error);
      throw error;
    }
  }, [queueId, workersMap]);

  const markAsReady = useCallback((targetParticipantId: string) => {
    setReworkParticipants(prev => ({
      ...prev,
      [targetParticipantId]: { ready: true }
    }));
    addAiMessage(`✨ Вы пометили себя как готового`);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        showScreen,
        currentRole,
        setCurrentRole,
        currentUserName,
        setCurrentUserName,
        participantId,
        setParticipantId,
        queueData,
        setQueueData,
        addToQueue,
        removeFromQueue,
        sortQueue,
        workerCount,
        setWorkerCount,
        workersMap,
        setWorkersMap,
        isActiveWorker,
        setIsActiveWorker,
        myWindowNum,
        setMyWindowNum,
        queueTitle,
        setQueueTitle,
        queueId,
        setQueueId,
        queue,
        setQueue,
        aiMessages,
        addAiMessage,
        clearAiMessages,
        incomingSwapRequest,
        setIncomingSwapRequest,
        joinQueue,
        leaveQueue,
        createQueue,
        callNextParticipant,
        finishServing,
        returnToQueue,
        updateWindowStatus,
        getTeachers,
        authenticateWithAdminKey,
        requestSwap,
        confirmSwap,
        rejectSwap,
        kickParticipant,
        markAsRework,
        markAsReady,
        createTeacher,
        assignTeacher,
        occupyWindow,
        releaseWindow,
        reworkParticipants,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
