"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/app/UserContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  ArrowLeft,
  Share2,
  Check,
  Download,
  Printer,
  PanelLeft,
  CloudCheck,
  CloudUpload,
} from 'lucide-react';

export default function DocumentPage() {
  const { activeUser, users } = useUser();
  const router = useRouter();
  const params = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [, setTick] = useState(0);

  const saveTimeoutRef = useRef(null);
  const isLoadedRef = useRef(false);

  const saveContent = async (content) => {
    if (!activeUser || !params.id) return;
    try {
      setSaving(true);
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
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const debouncedSave = useCallback(
    (content) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaving(true);
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(content);
      }, 1000);
    },
    [activeUser, params.id]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
    },
    onSelectionUpdate: () => setTick((t) => t + 1),
    onTransaction: () => setTick((t) => t + 1),
  });

  useEffect(() => {
    if (!activeUser || !params.id) return;
    setLoading(true);
    isLoadedRef.current = false;
    fetch(`/api/documents/${params.id}`, {
      headers: { 'x-user-id': activeUser.id },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setDoc(data);
      })
      .catch((err) => {
        console.error('Failed to load document', err);
        setDoc(null);
      })
      .finally(() => setLoading(false));
  }, [activeUser, params.id]);

  useEffect(() => {
    if (doc && editor && !isLoadedRef.current) {
      editor.commands.setContent(doc.content || '');
      isLoadedRef.current = true;
    }
  }, [doc, editor]);

  const handleTitleChange = async (e) => {
    const newTitle = e.target.value;
    setDoc((prev) => ({ ...prev, title: newTitle }));
    try {
      setSaving(true);
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
    } finally {
      setTimeout(() => setSaving(false), 500);
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

  // Export functions
  const downloadFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportAsText = () => {
    if (!editor) return;
    downloadFile(`${doc.title || 'Document'}.txt`, editor.getText(), 'text/plain;charset=utf-8');
  };

  const exportAsHTML = () => {
    if (!editor) return;
    downloadFile(`${doc.title || 'Document'}.html`, editor.getHTML(), 'text/html;charset=utf-8');
  };

  const exportAsPDF = () => {
    setShowExportMenu(false);
    window.print();
  };

  // Extract Outline Headings
  const getHeadings = () => {
    if (!editor) return [];
    const headings = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          level: node.attrs.level,
          text: node.textContent,
          pos,
        });
      }
    });
    return headings;
  };

  // Statistics
  const text = editor ? editor.getText() : '';
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const readingTime = Math.ceil(wordCount / 200);

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

  const otherUsers = (users || []).filter((u) => u.id !== activeUser?.id);
  const headings = getHeadings();

  return (
    <div>
      {/* Top Bar / Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-icon" onClick={() => router.push('/')} title="Back to Dashboard">
          <ArrowLeft size={20} />
        </button>

        <input
          type="text"
          className="title-input"
          value={doc.title || ''}
          onChange={handleTitleChange}
          style={{ flex: 1, minWidth: '200px' }}
          placeholder="Untitled document..."
        />

        {/* Save Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {saving ? (
            <>
              <CloudUpload size={16} className="spin" style={{ color: 'var(--accent-color)' }} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CloudCheck size={16} style={{ color: '#10b981' }} />
              <span>Saved to cloud</span>
            </>
          )}
        </div>

        {/* Export Dropdown */}
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary" onClick={() => setShowExportMenu(!showExportMenu)} title="Export Document">
            <Download size={18} /> Export
          </button>
          {showExportMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.5rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 60,
              minWidth: '180px',
              padding: '0.5rem 0',
            }}>
              <button
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={exportAsPDF}
              >
                <Printer size={16} /> Print / PDF
              </button>
              <button
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={exportAsText}
              >
                📄 Plain Text (.txt)
              </button>
              <button
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={exportAsHTML}
              >
                🌐 Web Page (.html)
              </button>
            </div>
          )}
        </div>

        {/* Share Button */}
        {doc.owner_id === activeUser?.id && (
          <button className="btn btn-primary" onClick={() => setShowShareModal(true)}>
            <Share2 size={18} /> Share
          </button>
        )}
      </div>

      {/* Editor Container */}
      <div className="editor-container">
        {/* Full Rich Toolbar */}
        <div className="editor-toolbar">
          {/* Outline Toggle */}
          <button
            type="button"
            className={`btn btn-icon ${showSidebar ? 'active' : ''}`}
            onClick={() => setShowSidebar(!showSidebar)}
            title="Toggle Outline Sidebar"
          >
            <PanelLeft size={18} />
          </button>

          <div style={{ width: '1px', height: '1.25rem', background: 'var(--border-color)', margin: '0 0.25rem' }} />

          {/* Undo / Redo */}
          <button
            type="button"
            className="btn btn-icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={18} />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={18} />
          </button>

          <div style={{ width: '1px', height: '1.25rem', background: 'var(--border-color)', margin: '0 0.25rem' }} />

          {/* Text Styles: Bold, Italic, Underline, Strike, Highlight */}
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('bold') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('italic') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('underline') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('strike') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('highlight') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
            title="Highlight Text"
          >
            <Highlighter size={18} />
          </button>

          <div style={{ width: '1px', height: '1.25rem', background: 'var(--border-color)', margin: '0 0.25rem' }} />

          {/* Headings */}
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('heading', { level: 3 }) ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </button>

          <div style={{ width: '1px', height: '1.25rem', background: 'var(--border-color)', margin: '0 0.25rem' }} />

          {/* Alignments */}
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            title="Align Left"
          >
            <AlignLeft size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            title="Align Center"
          >
            <AlignCenter size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            title="Align Right"
          >
            <AlignRight size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
            title="Justify"
          >
            <AlignJustify size={18} />
          </button>

          <div style={{ width: '1px', height: '1.25rem', background: 'var(--border-color)', margin: '0 0.25rem' }} />

          {/* Lists & Quotes */}
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('bulletList') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('orderedList') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('blockquote') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-icon ${editor?.isActive('codeBlock') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <Code size={18} />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider"
          >
            <Minus size={18} />
          </button>
        </div>

        {/* Workspace: Sidebar + Paper Viewport */}
        <div className="editor-workspace">
          {/* Outline Sidebar */}
          {showSidebar && (
            <div className="editor-outline-sidebar">
              <div className="editor-outline-title">Outline</div>
              {headings.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Headings you add will appear here.
                </div>
              ) : (
                headings.map((h, i) => (
                  <div
                    key={i}
                    className={`outline-item outline-h${h.level}`}
                    onClick={() => editor?.chain().focus().setTextSelection(h.pos).run()}
                  >
                    {h.text || 'Untitled Section'}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Main Document Paper Viewport */}
          <div className="editor-main-viewport">
            <div className="doc-paper">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Real-time Status Bar */}
        <div className="editor-statusbar">
          <div>
            <span>{wordCount} words</span>
            <span style={{ margin: '0 0.5rem' }}>•</span>
            <span>{charCount} characters</span>
            <span style={{ margin: '0 0.5rem' }}>•</span>
            <span>~{readingTime} min read</span>
          </div>
          <div>Google Docs Mode • Auto-Synced</div>
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
              <option value="">Select a user by email...</option>
              {otherUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email || `${u.name.toLowerCase()}@example.com`})
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
