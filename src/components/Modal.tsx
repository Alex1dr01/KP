import React, { useState, type ReactNode, createContext, useContext } from 'react';
import './Modal.css';

interface ModalContent {
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  defaultValue?: string;
}

interface ModalContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [resolver, setResolver] = useState<((value: any) => void) | null>(null);

  const showAlert = (message: string, title = 'Внимание'): Promise<void> => {
    return new Promise((resolve) => {
      setModalContent({ title, message, type: 'alert' });
      setResolver(() => resolve);
    });
  };

  const showConfirm = (message: string, title = 'Подтвердите действие'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalContent({ title, message, type: 'confirm' });
      setResolver(() => (result: boolean) => resolve(result));
    });
  };

  const showPrompt = (
    message: string,
    defaultValue = '',
    title = 'Ввод данных'
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setModalContent({ title, message, type: 'prompt', defaultValue });
      setInputValue(defaultValue);
      setResolver(() => (result: string | null) => resolve(result));
    });
  };

  const handleOk = () => {
    if (resolver) {
      if (modalContent?.type === 'prompt') {
        resolver(inputValue);
      } else if (modalContent?.type === 'confirm') {
        resolver(true);
      } else {
        // 'alert' type — resolve the promise so callers can continue
        resolver(undefined);
      }
    }
    setModalContent(null);
    setResolver(null);
  };

  const handleCancel = () => {
    if (resolver) {
      if (modalContent?.type === 'confirm') {
        resolver(false);
      } else if (modalContent?.type === 'prompt') {
        resolver(null);
      }
    }
    setModalContent(null);
    setResolver(null);
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {modalContent && (
        <div className="modal-backdrop">
          <div className="custom-modal">
            <h3>{modalContent.title}</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '20px', fontSize: '0.9rem' }}>
              {modalContent.message}
            </p>

            {modalContent.type === 'prompt' && (
              <div style={{ display: 'block', marginBottom: '20px' }} className="input-group">
                <input
                  type="text"
                  id="modal-input"
                  placeholder="..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
              {(modalContent.type === 'confirm' || modalContent.type === 'prompt') && (
                <button className="secondary-btn" onClick={handleCancel} style={{ marginBottom: 0 }}>
                  Отмена
                </button>
              )}
              <button className="primary-btn" onClick={handleOk} style={{ marginBottom: 0 }}>
                {modalContent.type === 'prompt' ? 'OK' : modalContent.type === 'confirm' ? 'OK' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
