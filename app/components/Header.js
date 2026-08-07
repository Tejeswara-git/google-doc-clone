"use client";

import Link from 'next/link';
import { useUser } from '@/app/UserContext';
import { FileText } from 'lucide-react';

export default function Header() {
  const { users, activeUser, changeUser } = useUser();

  return (
    <header className="app-header">
      <Link href="/" className="logo">
        <FileText size={24} />
        <span>Doc</span>Editor
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Signed in as
        </span>
        <select
          value={activeUser?.id || ''}
          onChange={(e) => changeUser(e.target.value)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email || `${user.name.toLowerCase()}@example.com`})
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
