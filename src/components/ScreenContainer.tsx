import React from 'react';
import { useAppContext } from '../context';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { JoinScreen } from './screens/JoinScreen';
import { AuthScreen } from './screens/AuthScreen';
import { CreateQueueScreen } from './screens/CreateQueueScreen';
import { TicketScreen } from './screens/TicketScreen';

export const ScreenContainer: React.FC = () => {
  const { currentScreen } = useAppContext();

  return (
    <div className="container">
      {currentScreen === 'welcome' && <WelcomeScreen />}
      {currentScreen === 'join' && <JoinScreen />}
      {currentScreen === 'auth' && <AuthScreen />}
      {currentScreen === 'create' && <CreateQueueScreen />}
      {currentScreen === 'ticket' && <TicketScreen />}
    </div>
  );
};
