"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    fetch('/api/users')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
          if (data.length > 0) {
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
        } else {
          setUsers([]);
        }
      })
      .catch(err => {
        console.error("Failed to load users", err);
        setUsers([]);
      });
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
