import React, { useState } from 'react';
import { useAppContext } from '../../context';
import { useModal } from '../Modal';

export const AuthScreen: React.FC = () => {
  const { showScreen, authenticateWithAdminKey } = useAppContext();
  const { showAlert } = useModal();

  const [queueId, setQueueId] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!queueId || !adminKey) {
      await showAlert('Введите ID очереди и админ-ключ');
      return;
    }

    setLoading(true);
    try {
      await authenticateWithAdminKey(queueId, adminKey);
      showScreen('ticket');
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen active">
      <h1>Авторизация оператора</h1>
      <p className="subtitle">
        Введите ключ доступа для управления очередью (Admin/Operator).
      </p>

      <div className="input-group">
        <label>ID Очереди</label>
        <input
          type="text"
          value={queueId}
          onChange={(e) => setQueueId(e.target.value)}
          placeholder="XK7-392"
          disabled={loading}
        />
      </div>

      <div className="input-group">
        <label>Админ-ключ доступа</label>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button className="primary-btn" onClick={handleLogin} disabled={loading}>
        {loading ? 'Проверка...' : 'Войти в панель'}
      </button>
      <button className="secondary-btn" onClick={() => showScreen('welcome')} disabled={loading}>
        Назад
      </button>
    </div>
  );
};
