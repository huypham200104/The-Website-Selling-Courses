import React, { useMemo, useState } from 'react';
import api from '../services/api';
import './StudentChatBubble.css';

function StudentChatBubble({ courseId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Xin chao, minh la tro ly AI. Ban co the hoi ve khoa hoc dang co trong he thong.'
    }
  ]);

  const historyForApi = useMemo(() => {
    return messages.map((item) => ({
      role: item.role,
      text: item.text
    }));
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || loading) return;

    const userMessage = { role: 'user', text: content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat', {
        message: content,
        history: historyForApi,
        courseId: courseId || null
      });

      const reply = response.data?.data?.reply || 'Mình chưa tìm thấy thông tin này trong dữ liệu hiện có.';

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Co loi khi ket noi chatbot.';
      setMessages((prev) => [...prev, { role: 'assistant', text: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="student-chat-root">
      {isOpen && (
        <div className="student-chat-panel">
          <div className="student-chat-header">
            <h3>Tro ly hoc tap</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Dong chat">
              x
            </button>
          </div>

          <div className="student-chat-messages">
            {messages.map((item, index) => (
              <div key={index} className={`chat-item ${item.role}`}>
                {item.text}
              </div>
            ))}
            {loading && <div className="chat-item assistant">Dang tra loi...</div>}
          </div>

          <div className="student-chat-input">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Hoi ve khoa hoc trong he thong"
              rows={2}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              Gui
            </button>
          </div>
        </div>
      )}

      <button className="student-chat-fab" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? 'Dong' : 'AI'}
      </button>
    </div>
  );
}

export default StudentChatBubble;
