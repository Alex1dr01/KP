import React from 'react';
import './WorkerGrid.css';
import { useAppContext } from '../context';

interface WorkerGridProps {
  workerCount: number;
  onSelectWorker?: (windowNum: number) => void;
  selectedWindow?: number | null;
  pauseEndTimes?: Record<number, number>;
}

export const WorkerGrid: React.FC<WorkerGridProps> = ({
  workerCount,
  onSelectWorker,
  selectedWindow,
  pauseEndTimes
}) => {
  const { workersMap, currentRole } = useAppContext();
  const isOperator = currentRole === 'operator';

  return (
    <div className="worker-grid">
      {Array.from({ length: workerCount }).map((_, i) => {
        const windowNum = i + 1;
        const worker = workersMap[windowNum];
        const status = worker?.status || 'idle';
        const currentTicket = worker?.currentTicket;
        const isSelected = selectedWindow === windowNum;

        const pauseEndTime = pauseEndTimes?.[windowNum];
        let timerText = "";
        if (status === 'paused' && pauseEndTime) {
          const remaining = Math.max(0, Math.floor((pauseEndTime - Date.now()) / 1000));
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          timerText = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
        }

        const statusColor = {
          idle: 'var(--success)',
          busy: 'var(--warning)',
          paused: 'var(--danger)',
        }[status] || 'var(--text-dim)';

        const statusText = {
          idle: 'Свободно',
          busy: 'Занято',
          paused: 'Пауза',
        }[status] || 'Неизвестно';

        return (
          <div
            key={windowNum}
            className={`worker-card ${isSelected ? 'selected' : ''}`}
            onClick={() => (isOperator || !onSelectWorker) ? onSelectWorker?.(windowNum) : undefined}
            style={{ cursor: isOperator ? 'pointer' : 'default' }}
          >
            <div style={{ fontWeight: 800, color: 'var(--text-dim)', fontSize: '0.7rem' }}>
              #{windowNum} {worker?.name || `ОКНО ${windowNum}`}
            </div>
            <div
              id={`worker-name-${windowNum}`}
              className="worker-name-label"
              style={{ color: 'var(--primary)', fontWeight: 600 }}
            >
              {currentTicket ? `👤 ${currentTicket.nickname}` : '○ Свободно'}
            </div>
            <div
              id={`worker-status-${windowNum}`}
              className="worker-active"
              style={{ color: statusColor }}
            >
              ● {statusText} {timerText && <span style={{ marginLeft: '4px', opacity: 0.8 }}>({timerText})</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
