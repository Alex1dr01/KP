import React, { useState } from 'react';
import { useAppContext } from '../context';
import { useModal } from './Modal';
import type { QueueMember } from '../types';
import './QueueList.css';

export const QueueList: React.FC = () => {
  const {
    reworkParticipants,
    queueData,
    currentUserName,
    addAiMessage,
    participantId,
    requestSwap,
    currentRole,
    kickParticipant,
  } = useAppContext();
  const { showConfirm, showAlert } = useModal();
  const [requestingSwapWith, setRequestingSwapWith] = useState<string | null>(null);
  const isOperator = currentRole === 'operator';

  // Find the current user's member entry to get their priority
  const myMember = queueData.find((m: QueueMember) => m.name === currentUserName);
  const myPriority = myMember?.priority;

  const handleSwapRequest = async (memberId: string, memberName: string) => {
    if (!participantId) {
      await showAlert('Ошибка: participantId не установлен');
      return;
    }

    const confirmed = await showConfirm(`Отправить запрос на обмен с ${memberName}?`);
    if (confirmed) {
      setRequestingSwapWith(memberId);
      try {
        await requestSwap(memberId);
        addAiMessage(`✅ Запрос на обмен отправлен: ${memberName}`);
      } catch (error: any) {
        await showAlert(`❌ Ошибка при отправке запроса: ${error.message}`);
        console.error('Failed to request swap:', error);
      } finally {
        setRequestingSwapWith(null);
      }
    }
  };

  const handleKickParticipant = async (memberId: string, memberName: string) => {
    const confirmed = await showConfirm(`Исключить ${memberName} из очереди?`);
    if (confirmed) {
      try {
        await kickParticipant(memberId);
      } catch (error: any) {
        await showAlert(`Ошибка: ${error.message}`);
      }
    }
  };

  const sorted = [...queueData].sort((a, b) => {
    // Priority: Rework > Normal > Low
    const getPriorityVal = (member: any) => {
      const rework = reworkParticipants[member.id || ''];
      if (rework) return 0;
      return member.priority === 'normal' ? 1 : 2;
    };
    const pA = getPriorityVal(a);
    const pB = getPriorityVal(b);
    if (pA !== pB) return pA - pB;
    return a.pos - b.pos;
  });

  return (
    <div className="queue-list">
      {sorted.map((member, index) => {
        const isPriorityLow = member.priority === 'low';
        const isMe = member.name === currentUserName;
        // Swaps are only allowed within the same priority group
        const canSwap = !isMe && member.id && member.priority === myPriority;

        const isReworkStatus = reworkParticipants[member.id || ''];
        const isReady = isReworkStatus?.ready ?? true;

        return (
          <div
            key={`${member.id || member.pos}-${member.name}`}
            className={`queue-item ${isPriorityLow ? 'priority-low' : ''} ${isMe ? 'current-user' : ''} ${!isReady ? 'not-ready' : ''}`}
            style={!isReady ? { opacity: 0.6 } : undefined}
          >
            <div className="pos">{index + 1}</div>
            <div style={{ flex: 1 }}>
              <button
                className={`name-btn ${isMe ? 'me' : ''}`}
                onClick={() => {
                  if (isOperator) {
                    handleKickParticipant(member.id!, member.name);
                  } else if (canSwap) {
                    handleSwapRequest(member.id!, member.name);
                  }
                }}
                disabled={(!isOperator && !canSwap) || requestingSwapWith === member.id}
                style={(isOperator || canSwap) ? undefined : { cursor: 'default', opacity: isMe ? 1 : 0.5 }}
              >
                {member.name} {isReworkStatus && '🔄'}
                {isReworkStatus && !isReady && <span style={{ fontSize: '0.6rem', marginLeft: '4px', fontStyle: 'italic', color: 'var(--muted)' }}>(ждём...)</span>}
              </button>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {isMe ? 'Это вы' : (member.status === 'serving' ? 'Обслуживается' : 'В очереди')} {isReworkStatus ? '• на доработке' : ''}
                {member.estimated_wait_sec && member.status !== 'serving' && ` • ~${Math.floor(member.estimated_wait_sec / 60)} мин`}
              </div>
            </div>
            <div className="priority-badge" style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: isPriorityLow ? 'rgba(255,255,255,0.05)' : (isReworkStatus ? 'rgba(0,255,136,0.1)' : 'rgba(123,97,255,0.1)'), color: isPriorityLow ? 'var(--muted)' : (isReworkStatus ? 'var(--accent)' : 'var(--accent2)') }}>
              {isPriorityLow ? 'LOW' : (isReworkStatus ? 'REWORK' : 'NORM')}
            </div>
          </div>
        );
      })}
    </div>
  );
};
