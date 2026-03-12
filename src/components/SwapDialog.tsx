import React, { useState } from 'react';
import { useAppContext } from '../context';
import { useModal } from './Modal';
import type { SwapRequest } from '../types';

interface SwapDialogProps {
  swapRequest: SwapRequest & { from_position?: number; to_position?: number };
  onClose: () => void;
}

export const SwapDialog: React.FC<SwapDialogProps> = ({ swapRequest, onClose }) => {
  const { confirmSwap, rejectSwap } = useAppContext();
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmSwap(swapRequest.id);
      onClose();
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectSwap(swapRequest.id);
      onClose();
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fromName = swapRequest.from_nickname || swapRequest.from_participant_id;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        padding: 'clamp(12px, 3vw, 20px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'clamp(16px, 3vw, 20px)',
          padding: 'clamp(16px, 4vw, 24px)',
          maxWidth: 'clamp(280px, 90vw, 400px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '16px', fontSize: 'clamp(1.1rem, 4vw, 1.3rem)' }}>
          🔄 Запрос на обмен местами
        </h3>

        <p
          style={{
            color: 'var(--text-dim)',
            marginBottom: '20px',
            fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
            wordWrap: 'break-word',
          }}
        >
          <strong>{fromName}</strong> хочет обменяться местами {swapRequest.from_position && swapRequest.to_position ? `(позиция ${swapRequest.from_position} → ${swapRequest.to_position})` : ''}.
        </p>

        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: 'clamp(0.8rem, 2vw, 0.85rem)',
          }}
        >
          <p style={{ margin: '4px 0' }}>
            <strong>От:</strong> {fromName}
            {swapRequest.from_position && ` (позиция ${swapRequest.from_position})`}
          </p>
          {swapRequest.to_position && (
            <p style={{ margin: '4px 0' }}>
              <strong>На позицию:</strong> {swapRequest.to_position}
            </p>
          )}
          <p style={{ margin: '4px 0' }}>
            <strong>Статус:</strong> {swapRequest.status}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'clamp(8px, 2vw, 12px)',
            flexWrap: 'wrap',
          }}
        >
          <button
            className="primary-btn"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: '100px',
            }}
          >
            {loading ? 'Загрузка...' : '✓ Согласиться'}
          </button>
          <button
            className="danger-btn"
            onClick={handleReject}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: '100px',
            }}
          >
            {loading ? 'Загрузка...' : '✕ Отклонить'}
          </button>
        </div>
      </div>
    </div>
  );
};
