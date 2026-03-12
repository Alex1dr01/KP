import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context';
import { useModal } from '../Modal';

type ServiceType = '15' | '30' | '5' | 'adaptive';

export const CreateQueueScreen: React.FC = () => {
  const { showScreen, createQueue, getTeachers } = useAppContext();
  const { showAlert } = useModal();

  const [queueName, setQueueName] = useState('');
  const [workerCount, setWorkerCount] = useState(2);
  const [serviceType, setServiceType] = useState<ServiceType>('15');
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(true);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const data = await getTeachers();
        setTeachers(data);
      } catch (error) {
        console.error('Failed to load teachers:', error);
      } finally {
        setTeachersLoading(false);
      }
    };
    loadTeachers();
  }, [getTeachers]);

  const handleCreate = async () => {
    if (!queueName) {
      await showAlert('Введите название очереди');
      return;
    }

    // if (selectedTeachers.length === 0) {
    //   await showAlert('Выберите хотя бы одного преподавателя');
    //   return;
    // }

    setLoading(true);
    try {
      await createQueue(queueName, selectedTeachers, workerCount);
      showScreen('ticket');
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacher = (teacherId: number) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    );
  };

  return (
    <div className="screen active">
      <h1>Создание очереди</h1>
      <p className="subtitle">Настройте параметры вашей новой очереди.</p>

      <div className="input-group">
        <label>Название предмета/услуги</label>
        <input
          type="text"
          value={queueName}
          onChange={(e) => setQueueName(e.target.value)}
          placeholder="Сдача Лаб: Алгоритмы"
          disabled={loading}
        />
      </div>

      <div className="input-group">
        <label>Количество окон (воркеров)</label>
        <input
          type="number"
          value={workerCount}
          onChange={(e) => setWorkerCount(Math.max(1, Math.min(5, parseInt(e.target.value))))}
          min="1"
          max="5"
          disabled={loading}
        />
      </div>

      <div className="input-group">
        <label>Преподаватели</label>
        {teachersLoading ? (
          <p>Загрузка преподавателей...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
            {teachers.map((teacher) => (
              <label key={teacher.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedTeachers.includes(teacher.id)}
                  onChange={() => toggleTeacher(teacher.id)}
                  disabled={loading}
                />
                <span>{teacher.name} ({teacher.subject})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="input-group">
        <label>Тип обслуживания</label>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value as ServiceType)}
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
          <option value="15">Обычная сдача (15 мин)</option>
          <option value="30">Сложная защита (30 мин)</option>
          <option value="5">Консультация (5 мин)</option>
          <option value="adaptive">Auto-AI (Обучение на ходу...)</option>
        </select>
      </div>

      <button className="primary-btn" onClick={handleCreate} disabled={loading}>
        {loading ? 'Создание...' : 'Создать очередь'}
      </button>
      <button className="secondary-btn" onClick={() => showScreen('welcome')} disabled={loading}>
        Назад
      </button>
    </div>
  );
};
