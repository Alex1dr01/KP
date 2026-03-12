import React from 'react';
import { useAppContext } from '../../context';

export const WelcomeScreen: React.FC = () => {
  const { showScreen } = useAppContext();

  return (
    <div className="screen active">
      <h1>Умная очередь</h1>
      <p className="subtitle">Интеллектуальная система управления очередью для ВУЗов и бизнеса.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="primary-btn" onClick={() => showScreen('join')}>
          Присоединиться к очереди
        </button>
        <button className="primary-btn" style={{ background: 'var(--accent)' }} onClick={() => showScreen('create')}>
          Создать новую очередь
        </button>
        <button className="secondary-btn" onClick={() => showScreen('auth')}>
          Панель управления (Admin/Operator)
        </button>
      </div>
    </div>
  );
};
