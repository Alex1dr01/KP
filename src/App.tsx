import React from 'react';
import { AppContextProvider } from './context';
import { ModalProvider } from './components/Modal';
import { ScreenContainer } from './components/ScreenContainer';
import { Sidebar } from './components/Sidebar';
import { AiTerminal } from './components/AiTerminal';
import './App.css';

const AppContent: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <ScreenContainer />
      <AiTerminal />
    </div>
  );
};

function App() {
  return (
    <ModalProvider>
      <AppContextProvider>
        <AppContent />
      </AppContextProvider>
    </ModalProvider>
  );
}

export default App;
