// Type definitions for the Queue Project

export type UserRole = 'student' | 'operator' | 'teacher';

export type ParticipantPriority = 'normal' | 'low';
export type QueueStatus = 'active' | 'stopped' | 'closed';
export type QueueMode = 'managed' | 'auto';
export type WindowStatus = 'idle' | 'busy' | 'paused';
export type ParticipantStatus = 'waiting' | 'serving' | 'finished' | 'cancelled';
export type SwapStatus = 'pending' | 'confirmed' | 'rejected';

// API Types
export interface Teacher {
  id: number;
  name: string;
  subject: string;
}

export interface Queue {
  id: string;
  name: string;
  mode: QueueMode;
  status: QueueStatus;
  teachers: Teacher[];
  window_count: number;
}

export interface Participant {
  id: string;
  nickname: string;
  priority: ParticipantPriority;
  position: number;
  status: ParticipantStatus;
  estimated_wait_sec: number | null;
}

export interface Window {
  id: number;
  number: number;
  status: WindowStatus;
  current_participant: Participant | null;
}

export interface SwapRequest {
  id: string;
  from_participant_id: string;
  to_participant_id: string;
  status: SwapStatus;
  from_nickname?: string;
  to_nickname?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface KeyAuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  queue_id: string;
  window_number: number | null;
}

export interface TeacherCreate {
  name: string;
  subject: string;
}

export interface WindowAssignTeacher {
  teacher_name: string;
}

export interface QueueCreateResponse extends TokenResponse {
  queue_id: string;
  admin_key: string;
}

export interface User {
  id: string;
  username: string;
  is_active: boolean;
}

// Legacy types (for compatibility)
export interface QueueMember {
  name: string;
  pos: number;
  priority: ParticipantPriority;
  id?: string;
  status?: ParticipantStatus;
  estimated_wait_sec?: number | null;
}

export interface Worker {
  name: string;
  status: WindowStatus;
  currentTicket: Participant | null;
}

export interface WorkersMap {
  [windowNum: number]: Worker;
}

export type ScreenId = 'welcome' | 'join' | 'auth' | 'create' | 'ticket';

// WebSocket Event Types
export type WSEventType =
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'CALL_CLIENT'
  | 'SWAP_REQUEST'
  | 'SWAP_CONFIRMED'
  | 'SWAP_REJECTED'
  | 'WORKER_STATUS_CHANGED'
  | 'POSITION_UPDATED'
  | 'QUEUE_STATUS_CHANGED'
  | 'QUEUE_LIST'
  | 'PARTICIPANT_FINISHED';

export interface WSEvent<T = any> {
  type: WSEventType;
  data: T;
  timestamp?: number;
}
