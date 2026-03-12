import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context';
import { useModal } from '../Modal';
import { httpClient } from '../../api/http-client';

export const JoinScreen: React.FC = () => {
  const { showScreen, joinQueue } = useAppContext();
  const { showAlert } = useModal();

  const [queueId, setQueueIdState] = useState('');
  const [userName, setUserName] = useState('');
  const [priority, setPriority] = useState<'normal' | 'low'>('normal');
  const [loading, setLoading] = useState(false);
  
  const queueIdInputRef = useRef<HTMLInputElement>(null);
  const userNameInputRef = useRef<HTMLInputElement>(null);

  // Валидация формата ID очереди: XXX-000 (3 буквы, дефис, 3 цифры)
  const validateQueueId = (id: string): boolean => {
    const queueIdPattern = /^[A-Z]{3}-\d{3}$/;
    return queueIdPattern.test(id);
  };

  // Валидация имени пользователя
  const validateUserName = (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 50;
  };

  // Проверка существования очереди
  const checkQueueExists = async (id: string): Promise<boolean> => {
    try {
      await httpClient.getQueue(id);
      return true;
    } catch (error) {
      console.error('Queue not found:', error);
      return false;
    }
  };

  const handleJoin = async () => {
    if (!queueId.trim()) {
      await showAlert('Введите ID очереди');
      queueIdInputRef.current?.focus();
      return;
    }

    const trimmedQueueId = queueId.trim().toUpperCase();

    if (!validateQueueId(trimmedQueueId)) {
      await showAlert('Неверный формат ID очереди.\nПримеры правильного формата: ABC-123, XYZ-456');
      queueIdInputRef.current?.select();
      queueIdInputRef.current?.focus();
      return;
    }

    if (!userName.trim()) {
      await showAlert('Введите ваше имя');
      userNameInputRef.current?.focus();
      return;
    }

    if (!validateUserName(userName)) {
      await showAlert('Имя должно содержать от 2 до 50 символов');
      userNameInputRef.current?.select();
      userNameInputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      // Проверяем существование очереди перед присоединением
      const queueExists = await checkQueueExists(trimmedQueueId);
      if (!queueExists) {
        await showAlert(`❌ Очередь с ID "${trimmedQueueId}" не найдена.\nПроверьте правильность ID или создайте новую очередь.`);
        queueIdInputRef.current?.select();
        queueIdInputRef.current?.focus();
        return;
      }

      await joinQueue(trimmedQueueId, userName.trim(), priority);
      showScreen('ticket');
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
      queueIdInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen active">
      <h1>Вход в очередь</h1>
      <p className="subtitle">Введите ID очереди или отсканируйте QR-код для регистрации.</p>

      <div className="input-group">
        <label>ID Очереди</label>
        <input
          ref={queueIdInputRef}
          type="text"
          value={queueId}
          onChange={(e) => setQueueIdState(e.target.value.toUpperCase())}
          placeholder="Например: ABC-123"
          disabled={loading}
          maxLength={7}
        />
        <small style={{ color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
          Формат: XXX-000 (3 буквы, дефис, 3 цифры)
        </small>
      </div>

      <div className="input-group">
        <label>Ваше Имя</label>
        <input
          ref={userNameInputRef}
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Ваше имя"
          disabled={loading}
          maxLength={50}
        />
        <small style={{ color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
          2-50 символов
        </small>
      </div>

      <div className="input-group">
        <label>Приоритет</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'normal' | 'low')}
          disabled={loading}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: 'white',
          }}
        >
          <option value="normal">Обычный</option>
          <option value="low">Низкий (После всех)</option>
        </select>
      </div>

      <button className="primary-btn" onClick={handleJoin} disabled={loading}>
        {loading ? 'Подключение...' : 'Получить талон'}
      </button>
      <button className="secondary-btn" onClick={() => showScreen('welcome')} disabled={loading}>
        Назад
      </button>
    </div>
  );
};
