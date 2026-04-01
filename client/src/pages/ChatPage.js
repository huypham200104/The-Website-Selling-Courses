import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/apiService';
import Layout from '../components/Layout';
import StudentHeader from '../components/StudentHeader';
import './ChatPage.css';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const selectedPartnerIdRef = useRef('');
  const messagesEndRef = useRef(null);

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

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  // Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

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
      setConnected(false);
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
        if (!socketRef.current || !socketRef.current.connected) {
          reject(new Error('Mất kết nối realtime'));
          return;
        }
        socketRef.current.emit('chat:send', { to: selectedPartnerId, text: content }, (ack) => {
          if (ack?.ok) resolve(ack.data);
          else reject(new Error(ack?.error || 'Không thể gửi tin nhắn'));
        });
      });
      setText('');
    } catch (e2) {
      setError(e2?.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const content = (
    <div className="chat-page">
      <div className="chat-header-row">
        <div>
          <h1>💬 Tin nhắn</h1>
          <p>Kết nối giữa giảng viên và học viên theo khóa học đã tham gia</p>
        </div>
        <div className="chat-header-status">
          <span className={`connection-dot ${connected ? 'online' : 'offline'}`} />
          <span className="connection-label">{connected ? 'Đã kết nối' : 'Đang kết nối...'}</span>
        </div>
      </div>

      {error && (
        <div className="chat-error">
          ⚠️ {error}
          <button className="chat-error-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="chat-layout">
        {/* Partner list */}
        <aside className="chat-partner-panel">
          <div className="chat-search-wrapper">
            <span className="chat-search-icon">🔍</span>
            <input
              className="chat-search"
              placeholder="Tìm theo tên, email, khóa học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loadingPartners ? (
            <div className="chat-placeholder">
              <div className="chat-spinner" />
              <span>Đang tải...</span>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="chat-placeholder">
              <span>😔</span>
              <span>
                {search
                  ? 'Không tìm thấy kết quả'
                  : user?.role === 'instructor'
                  ? 'Chưa có học viên nào trong khóa học của bạn'
                  : 'Bạn chưa đăng ký khóa học nào'}
              </span>
            </div>
          ) : (
            <div className="chat-partner-list">
              {filteredPartners.map((partner) => (
                <button
                  key={partner._id}
                  className={partner._id === selectedPartnerId ? 'chat-partner-item active' : 'chat-partner-item'}
                  onClick={() => setSelectedPartnerId(partner._id)}
                >
                  <div className="chat-partner-avatar">
                    <img
                      src={
                        partner.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name || 'U')}&background=random&color=fff&size=40`
                      }
                      alt={partner.name}
                    />
                  </div>
                  <div className="chat-partner-info">
                    <div className="chat-partner-top">
                      <strong>{partner.name}</strong>
                      {partner.lastMessageAt && (
                        <span className="chat-partner-time">{formatTime(partner.lastMessageAt)}</span>
                      )}
                    </div>
                    <div className="chat-partner-role">
                      {partner.role === 'instructor'
                        ? '👨‍🏫 Giảng viên'
                        : partner.role === 'admin'
                        ? '👨‍💼 Admin'
                        : '👨‍🎓 Học viên'}
                    </div>
                    {partner.lastMessage ? (
                      <div className="chat-last-message">{partner.lastMessage}</div>
                    ) : (
                      <div className="chat-partner-courses">
                        {(partner.sharedCourses || []).slice(0, 1).join(' • ')}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Chat box */}
        <section className="chat-box-panel">
          {!selectedPartner ? (
            <div className="chat-placeholder chat-empty-state">
              <div className="chat-empty-icon">💬</div>
              <h3>Chọn một cuộc trò chuyện</h3>
              <p>Chọn một người từ danh sách để bắt đầu nhắn tin</p>
            </div>
          ) : (
            <>
              <div className="chat-box-header">
                <div className="chat-box-header-info">
                  <img
                    src={
                      selectedPartner.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPartner.name || 'U')}&background=random&color=fff&size=40`
                    }
                    alt={selectedPartner.name}
                    className="chat-box-avatar"
                  />
                  <div>
                    <h2>{selectedPartner.name}</h2>
                    <p>
                      {selectedPartner.role === 'instructor'
                        ? '👨‍🏫 Giảng viên'
                        : selectedPartner.role === 'admin'
                        ? '👨‍💼 Admin'
                        : '👨‍🎓 Học viên'}
                    </p>
                  </div>
                </div>
                <div className="chat-box-header-actions">
                  <div className="chat-shared-courses">
                    📚 {(selectedPartner.sharedCourses || []).slice(0, 2).join(' • ')}
                  </div>
                  {selectedPartner.role === 'instructor' && (
                    <button
                      type="button"
                      className="chat-messenger-btn"
                      disabled={!(selectedPartner.messengerLink || selectedPartner.facebookUrl)}
                      onClick={() => {
                        const pick = selectedPartner.messengerLink || selectedPartner.facebookUrl;
                        if (!pick) return;
                        const hasProtocol = /^https?:\/\//i.test(pick);
                        const href = hasProtocol ? pick : `https://${pick}`;
                        window.open(href, '_blank', 'noopener');
                      }}
                    >
                      📨 Liên hệ Messenger
                    </button>
                  )}
                </div>
              </div>

              <div className="chat-messages">
                {loadingMessages ? (
                  <div className="chat-placeholder">
                    <div className="chat-spinner" />
                    <span>Đang tải tin nhắn...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-placeholder">
                    <span>👋</span>
                    <span>Chưa có tin nhắn. Hãy gửi lời chào đầu tiên!</span>
                  </div>
                ) : (
                  <>
                    {messages.map((m, idx) => {
                      const mine = String(m.sender) === String(user?._id);
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showDate =
                        !prevMsg ||
                        formatDate(m.createdAt) !== formatDate(prevMsg.createdAt);
                      return (
                        <React.Fragment key={m._id}>
                          {showDate && (
                            <div className="chat-date-divider">
                              <span>{formatDate(m.createdAt)}</span>
                            </div>
                          )}
                          <div className={mine ? 'msg-row mine' : 'msg-row'}>
                            {!mine && (
                              <img
                                src={
                                  selectedPartner.avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPartner.name || 'U')}&background=random&color=fff&size=28`
                                }
                                alt=""
                                className="msg-avatar"
                              />
                            )}
                            <div className={mine ? 'msg-bubble mine' : 'msg-bubble'}>
                              <div className="msg-text">{m.text}</div>
                              <time>{formatTime(m.createdAt)}</time>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="chat-input-row" onSubmit={handleSend}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                  maxLength={2000}
                  rows={1}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !text.trim()} className="chat-send-btn">
                  {sending ? (
                    <span className="chat-spinner small" />
                  ) : (
                    <span>➤</span>
                  )}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );

  if (user?.role === 'instructor' || user?.role === 'admin') {
    return <Layout>{content}</Layout>;
  }

  // Student: hiện full page với StudentHeader
  return (
    <div className="student-chat-wrapper">
      <StudentHeader />
      {content}
    </div>
  );
}

export default ChatPage;
