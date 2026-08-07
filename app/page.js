"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/UserContext';
import { Plus, Upload, FileText, Clock, Users as UsersIcon } from 'lucide-react';

export default function Dashboard() {
  const { activeUser } = useUser();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUser) return;
    setLoading(true);
    fetch('/api/documents', {
      headers: { 'x-user-id': activeUser.id },
    })
      .then((res) => res.json())
      .then((data) => {
        setOwned(data.owned || []);
        setShared(data.shared || []);
      })
      .catch((err) => console.error('Failed to fetch documents', err))
      .finally(() => setLoading(false));
  }, [activeUser]);

  const createDocument = async () => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUser.id,
      },
      body: JSON.stringify({ title: 'Untitled Document', content: '' }),
    });
    const data = await res.json();
    router.push(`/document/${data.id}`);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-user-id': activeUser.id },
      body: formData,
    });
    const data = await res.json();
    if (data.id) {
      router.push(`/document/${data.id}`);
    }
    // Reset input
    e.target.value = '';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!activeUser) {
    return <div className="empty-state">Loading...</div>;
  }

  return (
    <div>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Your Documents</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={createDocument}>
            <Plus size={18} /> New Document
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Upload File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading documents...</div>
      ) : (
        <>
          {/* My Documents Section */}
          <div className="section-title">
            <FileText size={20} />
            <h2>My Documents</h2>
          </div>
          {owned.length > 0 ? (
            <div className="grid" style={{ marginBottom: '3rem' }}>
              {owned.map((doc) => (
                <div
                  key={doc.id}
                  className="card"
                  onClick={() => router.push(`/document/${doc.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3 style={{ marginBottom: '0.5rem' }}>{doc.title}</h3>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: 'var(--text-secondary)', fontSize: '0.875rem',
                    marginTop: 'auto', paddingTop: '1rem',
                  }}>
                    <Clock size={14} />
                    {formatDate(doc.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ marginBottom: '3rem' }}>
              <p>No documents yet. Create one to get started!</p>
            </div>
          )}

          {/* Shared with Me Section */}
          <div className="section-title">
            <UsersIcon size={20} />
            <h2>Shared with Me</h2>
          </div>
          {shared.length > 0 ? (
            <div className="grid">
              {shared.map((doc) => (
                <div
                  key={doc.id}
                  className="card"
                  onClick={() => router.push(`/document/${doc.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>{doc.title}</h3>
                    <span style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--accent-color)',
                      padding: '0.125rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}>
                      Shared
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: 'var(--text-secondary)', fontSize: '0.875rem',
                    marginTop: 'auto', paddingTop: '1rem',
                  }}>
                    <Clock size={14} />
                    {formatDate(doc.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No documents have been shared with you yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
