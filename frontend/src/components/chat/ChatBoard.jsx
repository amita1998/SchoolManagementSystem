import { useCallback, useEffect, useRef, useState } from 'react';
import { Select } from '../forms/Field.jsx';
import { PageHeader, Notice } from '../ui/PageHeader.jsx';
import * as chat from '../../services/chat.js';
import { api } from '../../services/api.js';

/**
 * Parent–teacher chat board, one screen for the two roles that have it.
 *
 * mode 'teacher' — the students of my classes; open a conversation with a child's family
 * mode 'parent'  — my children; write to a teacher who teaches that child
 *
 * Refreshes every 15 s while the page is open (no websocket in this deployment): the thread list
 * and, when one is selected, its messages. Reading a thread marks it read.
 */

const POLL_MS = 15000;

export default function ChatBoard({ mode = 'teacher' }) {
  const isTeacher = mode === 'teacher';

  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [picked, setPicked] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const bottomRef = useRef(null);

  const loadThreads = useCallback(async () => {
    try {
      const data = await chat.getThreads();
      setThreads(data.rows);
      return data.rows;
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load conversations.' });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (threadId, { quiet = false } = {}) => {
    try {
      const data = await chat.getMessages(threadId);
      setActive(data.thread);
      setMessages(data.messages);
      await chat.markRead(threadId);
      setThreads((rows) => rows.map((row) => (row.id === threadId ? { ...row, unread: 0 } : row)));
      return data;
    } catch (error) {
      if (!quiet) {
        setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not open the conversation.' });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await loadThreads();
      if (cancelled) return;
      if (rows.length > 0) setActiveId((current) => current ?? rows[0].id);
    })();
    return () => { cancelled = true; };
  }, [loadThreads]);

  // Contacts / children for the "new conversation" card.
  useEffect(() => {
    if (isTeacher) {
      chat.getContacts()
        .then((data) => setContacts(data.rows || []))
        .catch(() => setContacts([]));
      return;
    }
    api.get('/dashboard/parent')
      .then(({ data }) => {
        const kids = data.data.children || [];
        setChildren(kids);
        if (kids.length === 1) setChildId(String(kids[0].id));
      })
      .catch(() => setChildren([]));
  }, [isTeacher]);

  useEffect(() => {
    if (!childId) {
      setContacts([]);
      return;
    }
    chat.getContacts({ studentId: childId })
      .then((data) => {
        setContacts(data.rows || []);
        if ((data.rows || []).length === 1) setPicked(String(data.rows[0].id));
      })
      .catch(() => setContacts([]));
  }, [childId]);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      return;
    }
    loadMessages(activeId);
  }, [activeId, loadMessages]);

  // Poll: the inbox always, the open conversation too.
  useEffect(() => {
    const timer = setInterval(async () => {
      const rows = await loadThreads();
      if (activeId && rows.some((row) => row.id === activeId)) {
        const data = await loadMessages(activeId, { quiet: true });
        if (data) await chat.markRead(activeId);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [activeId, loadThreads, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  async function openConversation(event) {
    event.preventDefault();
    setSending(true);
    try {
      const payload = isTeacher
        ? { studentId: Number(picked) }
        : { studentId: Number(childId), teacherId: Number(picked) };
      const result = await chat.startThread(payload);
      setNotice({ kind: 'success', text: result.created ? 'Conversation started.' : 'Conversation opened.' });
      const rows = await loadThreads();
      setActiveId(result.thread.id);
      if (!rows.some((row) => row.id === result.thread.id)) setThreads([result.thread, ...rows]);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not start the conversation.' });
    } finally {
      setSending(false);
    }
  }

  async function send(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    setSending(true);
    try {
      await chat.sendMessage(activeId, body);
      setDraft('');
      await loadMessages(activeId, { quiet: true });
      await loadThreads();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not send the message.' });
    } finally {
      setSending(false);
    }
  }

  const unread = threads.reduce((total, row) => total + (row.unread || 0), 0);

  return (
    <div className="page chat-page">
      <PageHeader
        title={isTeacher ? 'Chat with parents' : 'Chat with teachers'}
        subtitle={isTeacher
          ? 'One conversation per child. Parents see your reply on their own screen.'
          : 'Write to a teacher of your child. Only your family and that teacher can read it.'}
      />
      {notice.text ? <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice> : null}

      <section className="section-card chat-new">
        <form className="chat-new__form" onSubmit={openConversation}>
          {isTeacher ? (
            <Select label="Student" name="student" value={picked} placeholder="Choose a student" required
              options={contacts.map((row) => ({
                value: row.student_id,
                label: `${row.name} · ${row.admission_id} (${row.class_name}-${row.section_name})`,
              }))}
              onChange={(event) => setPicked(event.target.value)} />
          ) : (
            <>
              <Select label="Child" name="child" value={childId} placeholder="Choose a child" required
                options={children.map((child) => ({ value: child.id, label: `${child.name} · ${child.admissionId}` }))}
                onChange={(event) => { setChildId(event.target.value); setPicked(''); }} />
              <Select label="Teacher" name="teacher" value={picked} placeholder="Choose a teacher" required
                options={contacts.map((teacher) => ({
                  value: teacher.id,
                  label: `${teacher.name} — ${teacher.label}`,
                }))}
                onChange={(event) => setPicked(event.target.value)} />
            </>
          )}
          <button type="submit" className="btn-primary" disabled={sending || !picked}>
            {isTeacher ? 'Open conversation' : 'Write to teacher'}
          </button>
        </form>
      </section>

      <div className="chat-layout">
        <aside className="section-card chat-inbox">
          <div className="section-card__head">
            <h3>Conversations</h3>
            <span className="muted">{unread > 0 ? `${unread} unread` : `${threads.length} total`}</span>
          </div>
          {loading ? <div className="loading-block"><div className="skeleton skeleton--table" /></div> : null}
          {!loading && threads.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-chat-dots" aria-hidden="true" /></span>
              <strong>No conversations yet</strong>
              <span>{isTeacher ? 'Parents will appear here once they write to you.' : 'Start one with a teacher above.'}</span>
            </div>
          ) : null}
          <ul className="chat-list">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  className={`chat-list__item ${thread.id === activeId ? 'is-active' : ''}`}
                  onClick={() => setActiveId(thread.id)}
                >
                  <span className="chat-list__top">
                    <strong>{isTeacher ? thread.student_name : thread.teacher_name}</strong>
                    {thread.unread > 0 ? <span className="chat-badge">{thread.unread}</span> : null}
                  </span>
                  <span className="chat-list__meta">
                    {isTeacher
                      ? `${thread.admission_id} · ${thread.class_name}-${thread.section_name}`
                      : `${thread.student_name} · ${thread.class_name}-${thread.section_name}`}
                  </span>
                  <span className="chat-list__preview">{thread.last_body || 'No messages yet'}</span>
                  <span className="chat-list__time">{thread.last_label || ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="section-card chat-thread">
          {active ? (
            <>
              <div className="section-card__head">
                <h3>{isTeacher ? active.student_name : active.teacher_name}</h3>
                <span className="muted">
                  {isTeacher
                    ? `Parent of ${active.admission_id}`
                    : `${active.student_name} · ${active.class_name}-${active.section_name}`}
                </span>
              </div>
              <div className="chat-bubbles">
                {messages.length === 0 ? (
                  <p className="chat-bubbles__empty">No messages yet — say hello.</p>
                ) : messages.map((message) => (
                  <article key={message.id} className={`chat-bubble ${message.mine ? 'chat-bubble--mine' : ''}`}>
                    <header>
                      <strong>{message.mine ? 'You' : message.sender_name || 'School'}</strong>
                      <span>{message.sent_label}</span>
                    </header>
                    <p>{message.body}</p>
                  </article>
                ))}
                <div ref={bottomRef} />
              </div>
              <form className="chat-composer" onSubmit={send}>
                <textarea
                  name="message"
                  rows={2}
                  maxLength={2000}
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send(event);
                    }
                  }}
                />
                <button type="submit" className="btn-primary" disabled={sending || !draft.trim()}>Send</button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-chat-square-text" aria-hidden="true" /></span>
              <strong>Pick a conversation</strong>
              <span>Choose a thread on the left, or start a new one above.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
