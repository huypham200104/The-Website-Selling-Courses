import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/apiService';
import Layout from '../components/Layout';
import './ChatPage.css';

const SOCKET_URL = 'http://localhost:5000';

function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const selectedPartnerIdRef = useRef('');

  const selectedPartner = useMemo(
    () => partners.find((p) => p._id === selectedPartnerId) || null,
    [partners, selectedPartnerId]
  );

  const filteredPartners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const inName = p.name?.toLowerCase().includes(q);
      const inEmail = p.email?.toLowerCase().includes(q);
      const inCourses = (p.sharedCourses || []).join(' ').toLowerCase().includes(q);
      return inName || inEmail || inCourses;
    });
  }, [partners, search]);

  const loadPartners = async (keepSelection = true) => {
    try {
      setLoadingPartners(true);
      const res = await chatService.getPartners();
      const list = res.data || [];
      setPartners(list);

      if (list.length === 0) {
        setSelectedPartnerId('');
        setMessages([]);
        return;
      }

      const selectedStillExists = list.some((p) => p._id === selectedPartnerId);
      if (!keepSelection || !selectedStillExists) {
        setSelectedPartnerId(list[0]._id);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Không thể tải danh sách chat');
    } finally {
      setLoadingPartners(false);
    }
  };

  const loadMessages = async (partnerId) => {
    if (!partnerId) return;
    try {
      setLoadingMessages(true);
      const res = await chatService.getMessages(partnerId);
      setMessages(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Không thể tải tin nhắn');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadPartners(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMessages(selectedPartnerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartnerId]);

  useEffect(() => {
    selectedPartnerIdRef.current = selectedPartnerId;
  }, [selectedPartnerId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('chat:new', (msg) => {
      const sender = String(msg.sender);
      const recipient = String(msg.recipient);
      const me = String(user?._id);
      const partnerId = sender === me ? recipient : sender;

      setPartners((prev) => {
        const idx = prev.findIndex((p) => p._id === partnerId);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          lastMessage: msg.text,
          lastMessageAt: msg.createdAt,
        };
        const next = [...prev];
        next.splice(idx, 1);
        next.unshift(updated);
        return next;
      });

      if (partnerId === selectedPartnerIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
      }
    });

    socket.on('connect_error', () => {
      setError('Không thể kết nối realtime, vui lòng tải lại trang.');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedPartnerId) return;
    const content = text.trim();
    if (!content || sending) return;

    try {
      setSending(true);
      await new Promise((resolve, reject) => {
        if (!socketRef.current) {
          reject(new Error('Socket not connected'));
          return;
        }
        socketRef.current.emit('chat:send', { to: selectedPartnerId, text: content }, (ack) => {
          if (ack?.ok) resolve(ack.data);
          else reject(new Error(ack?.error || 'Không thể gửi tin nhắn'));
        });
      });
      setText('');
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const content = (
    <div className="chat-page">
      <div className="chat-header-row">
        <div>
          <h1>💬 Chat</h1>
          <p>Kết nối giữa giảng viên và học viên theo khóa học đã tham gia</p>
        </div>
        {user?.role === 'student' && (
          <button className="chat-logout-btn" onClick={handleLogout}>🚪 Đăng xuất</button>
        )}
      </div>

      {error && <div className="chat-error">{error}</div>}

      <div className="chat-layout">
        <aside className="chat-partner-panel">
          <input
            className="chat-search"
            placeholder="Tìm theo tên, email, khóa học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loadingPartners ? (
            <div className="chat-placeholder">Đang tải danh sách...</div>
          ) : filteredPartners.length === 0 ? (
            <div className="chat-placeholder">Chưa có đối tượng chat phù hợp.</div>
          ) : (
            <div className="chat-partner-list">
              {filteredPartners.map((partner) => (
                <button
                  key={partner._id}
                  className={partner._id === selectedPartnerId ? 'chat-partner-item active' : 'chat-partner-item'}
                  onClick={() => setSelectedPartnerId(partner._id)}
                >
                  <div className="chat-partner-top">
                    <strong>{partner.name}</strong>
                    <span>{partner.role === 'instructor' ? 'Giảng viên' : 'Học viên'}</span>
                  </div>
                  <div className="chat-partner-email">{partner.email}</div>
                  <div className="chat-partner-courses">
                    {(partner.sharedCourses || []).slice(0, 2).join(' • ')}
                  </div>
                  {partner.lastMessage && (
                    <div className="chat-last-message">{partner.lastMessage}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="chat-box-panel">
          {!selectedPartner ? (
            <div className="chat-placeholder">Chọn một người để bắt đầu cuộc trò chuyện.</div>
          ) : (
            <>
              <div className="chat-box-header">
                <div>
                  <h2>{selectedPartner.name}</h2>
                  <p>{selectedPartner.email}</p>
                </div>
                <div className="chat-shared-courses">
                  {(selectedPartner.sharedCourses || []).slice(0, 2).join(' • ')}
                </div>
              </div>

              <div className="chat-messages">
                {loadingMessages ? (
                  <div className="chat-placeholder">Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-placeholder">Chưa có tin nhắn. Hãy gửi lời chào đầu tiên.</div>
                ) : (
                  messages.map((m) => {
                    const mine = String(m.sender) === String(user?._id);
                    return (
                      <div key={m._id} className={mine ? 'msg-row mine' : 'msg-row'}>
                        <div className={mine ? 'msg-bubble mine' : 'msg-bubble'}>
                          <div>{m.text}</div>
                          <time>{new Date(m.createdAt).toLocaleString('vi-VN')}</time>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="chat-input-row" onSubmit={handleSend}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  maxLength={2000}
                />
                <button type="submit" disabled={sending || !text.trim()}>
                  {sending ? 'Đang gửi...' : 'Gửi'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );

  if (user?.role === 'instructor') {
    return <Layout>{content}</Layout>;
  }

  return <div className="student-chat-wrapper">{content}</div>;
}

export default ChatPage;
