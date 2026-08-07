"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        if (data.length > 0) {
          // Initialize active user from localStorage or default to first user
          const savedUserId = localStorage.getItem('activeUserId');
          if (savedUserId) {
            const saved = data.find(u => u.id === parseInt(savedUserId));
            if (saved) {
              setActiveUser(saved);
              return;
            }
          }
          setActiveUser(data[0]);
        }
      })
      .catch(err => console.error("Failed to load users", err));
  }, []);

  const changeUser = (userId) => {
    const user = users.find(u => u.id === parseInt(userId));
    if (user) {
      setActiveUser(user);
      localStorage.setItem('activeUserId', user.id);
    }
  };

  return (
    <UserContext.Provider value={{ users, activeUser, changeUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
