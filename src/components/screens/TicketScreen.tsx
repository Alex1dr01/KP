import React, { useState } from 'react';
import { useAppContext } from '../../context';
import type { QueueMember } from '../../types';
import { useModal } from '../Modal';
import { WorkerGrid } from '../WorkerGrid';
import { QueueList } from '../QueueList';
import { SwapDialog } from '../SwapDialog';
import './TicketScreen.css';

export const TicketScreen: React.FC = () => {
  const {
    currentRole,
    currentUserName,
    queueData,
    workerCount,
    showScreen,
    addAiMessage,
    callNextParticipant,
    returnToQueue,
    markAsRework,
    markAsReady,
    reworkParticipants,
    workersMap,
    leaveQueue,
    updateWindowStatus,
    queueId,
    participantId,
    incomingSwapRequest,
    setIncomingSwapRequest,
  } = useAppContext();
  const { showAlert, showConfirm, showPrompt } = useModal();

  const isStudent = currentRole === 'student';
  const isOperator = currentRole === 'operator';
  const isTeacher = currentRole === 'teacher';
  const isStaff = isOperator || isTeacher;

  const {
    getTeachers,
    createTeacher,
    assignTeacher,
    occupyWindow,
    releaseWindow,
    myWindowNum,
  } = useAppContext();

  const [selectedWindow, setSelectedWindow] = useState<number | null>(myWindowNum || null);
  const [loading, setLoading] = useState(false);
  const [pauseEndTimes, setPauseEndTimes] = useState<Record<number, number>>({});

  const handleCancelTicket = async () => {
    const confirmed = await showConfirm(
      isStudent ? 'Вы уверены, что хотите покинуть очередь?' : 'Вы уверены, что хотите выйти?'
    );
    if (confirmed) {
      try {
        // Always call leaveQueue to fully reset all state (queue data, chat, session)
        await leaveQueue();
      } catch (error) {
        console.error('Error leaving queue:', error);
        // Even if leave fails, navigate home
        showScreen('welcome');
      }
    }
  };

  const handleCallNext = async (windowNum?: number | null) => {
    const targetWindow = windowNum || selectedWindow;
    if (!targetWindow) {
      await showAlert('Сначала выберите окно для работы!');
      return;
    }

    // Checking if there is already someone in the window and sending to end of queue if so
    const worker = workersMap[targetWindow];
    if (worker?.currentTicket) {
      // Logic from user: "если там кто-то есть, то следующий по списку, а тот кто был уходит в конец очереди своего приоритета"
      // returnToQueue handles returning to end
      await returnToQueue(targetWindow);
    }

    // Check if next participant is on rework and not ready
    const sortedQueue = [...queueData].sort((a, b) => {
      // Simulation of priority: Rework > Normal > Low
      const getPriorityVal = (member: QueueMember) => {
        if (reworkParticipants[member.id || '']) return 0;
        return member.priority === 'normal' ? 1 : 2;
      };
      const pA = getPriorityVal(a);
      const pB = getPriorityVal(b);
      if (pA !== pB) return pA - pB;
      return a.pos - b.pos;
    });

    // Find the first participant who is either NOT in rework OR IS rework and READY
    const nextParticipant = sortedQueue.find(p => {
      const rework = reworkParticipants[p.id || ''];
      return !rework || rework.ready;
    });

    if (!nextParticipant) {
      if (queueData.length > 0) {
        await showAlert('Все участники в очереди находятся на доработке и еще не готовы.');
      } else {
        addAiMessage('Очередь пуста!');
      }
      return;
    }

    setLoading(true);
    try {
      await callNextParticipant(targetWindow);
      setSelectedWindow(targetWindow);
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  const handleReturn = async () => {
    if (!selectedWindow) {
      await showAlert('Сначала выберите окно!');
      return;
    }

    setLoading(true);
    try {
      await returnToQueue(selectedWindow);
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWindowStatusChange = async (windowNum: number, status: 'idle' | 'paused') => {
    if (status === 'paused') {
      const minutesStr = await showPrompt('На сколько минут поставить на паузу?', '10');
      if (minutesStr === null) return; // Cancelled
      const minutes = parseInt(minutesStr, 10);
      if (isNaN(minutes) || minutes <= 0) {
        await showAlert('Введите корректное число минут');
        return;
      }

      setLoading(true);
      try {
        await updateWindowStatus(windowNum, 'paused');
        setPauseEndTimes(prev => ({
          ...prev,
          [windowNum]: Date.now() + minutes * 60000
        }));
      } catch (error: any) {
        await showAlert(`Ошибка: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await updateWindowStatus(windowNum, status);
        if (status === 'idle') {
          setPauseEndTimes(prev => {
            const next = { ...prev };
            delete next[windowNum];
            return next;
          });
        }
      } catch (error: any) {
        await showAlert(`Ошибка: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRework = async () => {
    if (!selectedWindow) return;
    const worker = workersMap[selectedWindow];
    if (!worker?.currentTicket) {
      await showAlert('В окне никого нет!');
      return;
    }

    setLoading(true);
    try {
      await markAsRework(worker.currentTicket.id, selectedWindow);
      setSelectedWindow(selectedWindow);
    } catch (error: any) {
      await showAlert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReady = () => {
    if (participantId) markAsReady(participantId);
  };

  const myPosition = queueData.findIndex((m) => m.name === currentUserName) + 1;
  const estimatedWait = myPosition > 0 ? (myPosition - 1) * 15 : 0;

  return (
    <div className="screen active">
      <div className="ticket-card">
        <h1>{isStaff ? 'Панель управления' : `Очередь: ${currentUserName}`}</h1>
        <p className="subtitle">
          {isStudent && `Привет, ${currentUserName}!`}
          {isOperator && 'Режим Оператора (Полный доступ)'}
          {isTeacher && `Режим Преподавателя (Окно ${myWindowNum || '?'})`}
        </p>

        {isStudent && (
          <div id="student-view-header">
            <div className="position-badge">{myPosition < 10 ? `0${myPosition}` : myPosition}</div>
            <p className="subtitle">Ваша позиция в очереди</p>

            <div className="eta-box">
              <span>~{estimatedWait} минут</span>
              <div className="eta-label">Ориентировочное время ожидания</div>
            </div>
          </div>
        )}

        {/* Worker Status Grid */}
        <WorkerGrid
          workerCount={workerCount}
          onSelectWorker={async (windowNum) => {
            setSelectedWindow(windowNum);
            if (isOperator) {
              const choice = await showConfirm(`Действие для окна ${windowNum}?`, 'Окно');
              if (choice) {
                try {
                  const teachers = await getTeachers();
                  let name = "";
                  if (teachers.length === 0) {
                    name = await showPrompt('Список преподавателей пуст. Имя нового:') || "";
                  } else {
                    const list = teachers.map(t => t.name).join(', ');
                    name = await showPrompt(`Выберите или введите новое:\n(${list})`) || "";
                  }

                  if (name) {
                    if (!teachers.find(t => t.name === name)) {
                      await createTeacher(name, 'Общий');
                    }
                    await assignTeacher(windowNum, name);
                  }
                } catch (e: any) {
                  await showAlert(`Ошибка: ${e.message}`);
                }
              }
            }
          }}
          selectedWindow={selectedWindow}
          pauseEndTimes={pauseEndTimes}
        />

        {/* Queue List */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Очередь</h3>
          <QueueList />
        </div>

        {/* Role-specific Controls */}
        <div className="controls-section" style={{ marginTop: '20px' }}>
          {isStudent ? (
            <div id="student-controls">
              {participantId && reworkParticipants[participantId] && !reworkParticipants[participantId].ready && (
                <button
                  className="primary-btn"
                  onClick={handleMarkAsReady}
                  style={{ width: '100%', background: 'var(--success)' }}
                >
                  ✓ Я готов (доработал)
                </button>
              )}
            </div>
          ) : (
            <div id="staff-controls">
              {/* Teacher Occupation Logic */}
              {isTeacher && !myWindowNum && (
                <button
                  className="primary-btn"
                  onClick={() => selectedWindow && occupyWindow(selectedWindow)}
                  disabled={loading || !selectedWindow}
                  style={{ marginBottom: '8px', width: '100%', background: 'var(--success)' }}
                >
                  Занять выбранное окно ({selectedWindow || '?'})
                </button>
              )}

              {isTeacher && myWindowNum && (
                <button
                  className="secondary-btn"
                  onClick={() => releaseWindow(myWindowNum)}
                  disabled={loading}
                  style={{ marginBottom: '8px', width: '100%', background: 'var(--danger)' }}
                >
                  Освободить свое окно ({myWindowNum})
                </button>
              )}

              {/* Main Controls (Visible to Operator or assigned Teacher) */}
              {(isOperator || (isTeacher && myWindowNum === selectedWindow)) && (
                <>
                  <button
                    className="primary-btn"
                    onClick={() => handleCallNext(selectedWindow)}
                    disabled={loading || !selectedWindow}
                    style={{ marginBottom: '8px', width: '100%' }}
                  >
                    {loading ? 'Загрузка...' : 'Вызвать следующего'}
                  </button>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                      className="secondary-btn"
                      onClick={() => selectedWindow && handleWindowStatusChange(selectedWindow, 'paused')}
                      disabled={loading || !selectedWindow}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      ⏸ Пауза
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={() => selectedWindow && handleWindowStatusChange(selectedWindow, 'idle')}
                      disabled={loading || !selectedWindow}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      ▶ Старт
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="secondary-btn"
                      onClick={handleReturn}
                      disabled={loading || !selectedWindow}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      ↻ В очередь
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={handleRework}
                      disabled={loading || !selectedWindow}
                      style={{ flex: 1, marginBottom: 0, color: 'var(--warning)' }}
                    >
                      🔄 Доработка
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          ID Очереди: <span style={{ color: 'var(--text-main)' }}>{queueId}</span>
        </p>

        <button
          className="danger-btn"
          style={{ width: '100%', marginTop: '24px' }}
          onClick={handleCancelTicket}
        >
          {isStudent ? 'Покинуть очередь' : 'Выход'}
        </button>
      </div>

      {incomingSwapRequest && (
        <SwapDialog
          swapRequest={incomingSwapRequest}
          onClose={() => setIncomingSwapRequest(null)}
        />
      )}
    </div>
  );
};
