import React from 'react';
import { useAppContext } from '../context';
import './AiTerminal.css';

export const AiTerminal: React.FC = () => {
  const { aiMessages } = useAppContext();

  return (
    <div className="ai-terminal">
      <div className="sidebar-header">
        <h3>AI Insights</h3>
        <span style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>● LIVE</span>
      </div>
      <div className="ai-messages-container">
        {aiMessages.map((message, index) => (
          <div key={index} className="ai-message">
            {message}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center' }}>
        Аналитика обновляется в реальном времени
      </div>
    </div>
  );
};
