import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface UserContextType {
  isOfficePro: boolean;
  setIsOfficePro: (value: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOfficePro, setIsOfficePro] = useState(false);

  return (
    <UserContext.Provider value={{ isOfficePro, setIsOfficePro }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
