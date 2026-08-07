"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/app/UserContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ArrowLeft,
  Share2,
  Check,
} from 'lucide-react';

export default function DocumentPage() {
  const { activeUser, users } = useUser();
  const router = useRouter();
  const params = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const saveTimeoutRef = useRef(null);

  const debouncedSave = useCallback(
    (content) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(content);
      }, 1000);
    },
    [activeUser, params.id]
  );

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!activeUser || !params.id) return;
    setLoading(true);
    fetch(`/api/documents/${params.id}`, {
      headers: { 'x-user-id': activeUser.id },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setDoc(data);
        if (editor) {
          editor.commands.setContent(data.content || '');
        }
      })
      .catch((err) => {
        console.error('Failed to load document', err);
        setDoc(null);
      })
      .finally(() => setLoading(false));
  }, [activeUser, params.id, editor]);

  const saveContent = async (content) => {
    if (!activeUser || !params.id) return;
    try {
      await fetch(`/api/documents/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
        },
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      console.error('Failed to save', err);
    }
  };

  const handleTitleChange = async (e) => {
    const newTitle = e.target.value;
    setDoc((prev) => ({ ...prev, title: newTitle }));
    try {
      await fetch(`/api/documents/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
        },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (err) {
      console.error('Failed to update title', err);
    }
  };

  const handleShare = async () => {
    if (!shareUserId) return;
    try {
      const res = await fetch(`/api/documents/${params.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
        },
        body: JSON.stringify({ userIdToShare: shareUserId }),
      });
      if (res.ok) {
        setShareSuccess(true);
        setTimeout(() => {
          setShareSuccess(false);
          setShowShareModal(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to share', err);
    }
  };

  if (loading) {
    return <div className="empty-state">Loading document...</div>;
  }

  if (!doc) {
    return (
      <div className="empty-state">
        <h2>Document not found</h2>
        <p style={{ marginTop: '1rem' }}>
          This document doesn&apos;t exist or you don&apos;t have access.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1.5rem' }}
          onClick={() => router.push('/')}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const otherUsers = users.filter((u) => u.id !== activeUser?.id);

  return (
    <div>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-icon" onClick={() => router.push('/')}>
          <ArrowLeft size={20} />
        </button>
        <input
          type="text"
          className="title-input"
          value={doc.title || ''}
          onChange={handleTitleChange}
          style={{ flex: 1 }}
          placeholder="Document title..."
        />
        {doc.owner_id === activeUser?.id && (
          <button className="btn btn-primary" onClick={() => setShowShareModal(true)}>
            <Share2 size={18} /> Share
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="editor-container">
        <div className="editor-toolbar">
          <button
            className={`btn btn-icon ${editor?.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold size={18} />
          </button>
          <button
            className={`btn btn-icon ${editor?.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic size={18} />
          </button>
          <button
            className={`btn btn-icon ${editor?.isActive('underline') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon size={18} />
          </button>
          <div style={{ width: '1px', height: '1.5rem', background: 'var(--border-color)', margin: '0 0.25rem' }} />
          <button
            className={`btn btn-icon ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </button>
          <button
            className={`btn btn-icon ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </button>
          <div style={{ width: '1px', height: '1.5rem', background: 'var(--border-color)', margin: '0 0.25rem' }} />
          <button
            className={`btn btn-icon ${editor?.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={18} />
          </button>
          <button
            className={`btn btn-icon ${editor?.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </button>
        </div>

        <div className="editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Share Document</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select a user to share &quot;{doc.title}&quot; with:
            </p>
            <select
              value={shareUserId}
              onChange={(e) => setShareUserId(e.target.value)}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              <option value="">Select a user...</option>
              {otherUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={handleShare}
              disabled={!shareUserId}
              style={{ width: '100%' }}
            >
              {shareSuccess ? (
                <>
                  <Check size={18} /> Shared!
                </>
              ) : (
                <>
                  <Share2 size={18} /> Share
                </>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowShareModal(false)}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
