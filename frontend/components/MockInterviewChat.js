import { useState } from 'react';

export default function MockInterviewChat() {
  const [dialogId, setDialogId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  const accessToken = localStorage.getItem('accessToken'); // Или где ты его хранишь

  async function startMockInterview() {
    const response = await fetch('/api/dialogs/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Моё мок-интервью' }),
    });

    const data = await response.json();
    setDialogId(data.dialog_id);
    setMessages([]); // Очищаем чат
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !dialogId) return;

    // Сначала показываем сообщение пользователя
    setMessages(prev => [...prev, { sender: 'user', content: inputMessage }]);

    const response = await fetch(`/api/dialogs/${dialogId}/messages/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: inputMessage }),
    });

    const data = await response.json();

    if (data.bot_response) {
      setMessages(prev => [...prev, { sender: 'bot', content: data.bot_response }]);
    }

    setInputMessage(''); // Очищаем поле ввода
  }

  return (
    <div className="p-4">
      <button onClick={startMockInterview} className="mb-4 p-2 bg-blue-500 text-white rounded">
        Провести мок-интервью
      </button>

      <div className="border p-4 h-80 overflow-y-scroll mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded ${msg.sender === 'user' ? 'bg-blue-100' : 'bg-gray-200'}`}>
              {msg.content}
            </span>
          </div>
        ))}
      </div>

      {dialogId && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Введите сообщение..."
          />
          <button onClick={sendMessage} className="p-2 bg-green-500 text-white rounded">
            Отправить
          </button>
        </div>
      )}
    </div>
  );
}