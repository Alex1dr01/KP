import React from 'react';
import { useAppContext } from '../context';
import { QueueList } from './QueueList';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { queueData } = useAppContext();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Участники</h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{queueData.length} чел.</span>
      </div>
      <QueueList />
    </div>
  );
};
