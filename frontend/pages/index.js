import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FaCheck, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import axios from 'axios';

export default function Home() {
  const router = useRouter();
  
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showMockInterviewInput, setShowMockInterviewInput] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatName, setEditingChatName] = useState('');
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [chats, setChats] = useState([]); // Список чатов
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);
  const profileButtonRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const access = localStorage.getItem('access');
        if (!access || access === 'undefined') {
          router.push('/login');
          return;
        }

        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/`, {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        });

        setEmail(response.data.email);
        setFirstName(response.data.first_name || '');
        setLastName(response.data.last_name || '');

        // Загружаем диалоги пользователя с резюме
        const dialogsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/`, {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        });

        const fetchedChats = dialogsResponse.data.map(dialog => ({
          id: dialog.id,
          name: dialog.title,
          messages: [],
          resume: dialog.attachments.length > 0 ? dialog.attachments[dialog.attachments.length - 1] : null // Берем последнее резюме
        }));
        setChats(fetchedChats);

        // Если есть диалоги, выбираем первый и устанавливаем его резюме
        if (fetchedChats.length > 0) {
          setCurrentChatId(fetchedChats[0].id);
          setSelectedResume(fetchedChats[0].resume ? {
            name: fetchedChats[0].resume.original_filename,
            id: fetchedChats[0].resume.id
          } : null);
        }
      } catch (error) {
        console.error('Error fetching user data or dialogs:', error);
        if (error.response?.status === 401) {
          router.push('/login');
        }
      }
    };

    fetchUserData();
  }, [router]);

  useEffect(() => {
    if (chatContainerRef.current && currentChatId) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [currentChatId, chats]);

  const handleAddChat = async () => {
    try {
      const access = localStorage.getItem('access');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/`,
        { title: `Чат ${chats.length + 1}` },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const newChat = {
        id: response.data.dialog_id,
        name: response.data.title,
        messages: [],
        resume: null
      };
      setChats([...chats, newChat]);
      setCurrentChatId(newChat.id);
      setSelectedResume(null); // Новый чат не имеет резюме
    } catch (error) {
      console.error('Error creating dialog:', error);
      alert('Ошибка при создании чата. Попробуйте снова.');
    }
  };

  const handleSelectChat = async (chatId) => {
    setCurrentChatId(chatId);
    setShowMockInterviewInput(false);
    try {
      const access = localStorage.getItem('access');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${chatId}/messages/`, {
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      const currentChat = chats.find(chat => chat.id === chatId);
      const updatedChats = chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: response.data.map(msg => ({
                sender: msg.sender,
                text: msg.content
              }))
            }
          : chat
      );
      setChats(updatedChats);

      // Устанавливаем резюме для выбранного чата
      setSelectedResume(currentChat.resume ? {
        name: currentChat.resume.original_filename,
        id: currentChat.resume.id
      } : null);
    } catch (error) {
      console.error('Error fetching messages:', error);
      alert('Ошибка при загрузке сообщений чата. Попробуйте снова.');
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      const access = localStorage.getItem('access');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${chatId}/`, {
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      const updatedChats = chats.filter((chat) => chat.id !== chatId);
      setChats(updatedChats);
      if (currentChatId === chatId) {
        const newChat = updatedChats.length ? updatedChats[0] : null;
        setCurrentChatId(newChat ? newChat.id : null);
        setSelectedResume(newChat && newChat.resume ? {
          name: newChat.resume.original_filename,
          id: newChat.resume.id
        } : null);
        setShowMockInterviewInput(false);
      }
      setDeletingChatId(null);
      alert('Чат успешно удален.');
    } catch (error) {
      console.error('Error deleting chat:', error);
      if (error.response?.status === 404) {
        alert('Чат не найден.');
      } else if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
        router.push('/login');
      } else {
        alert('Ошибка при удалении чата. Попробуйте снова.');
      }
    }
  };

  const handleEditChatName = (chatId, currentName) => {
    setEditingChatId(chatId);
    setEditingChatName(currentName);
  };

  const handleSaveChatName = async (chatId) => {
    if (!editingChatName.trim()) {
      alert('Название чата не может быть пустым.');
      return;
    }
    try {
      const access = localStorage.getItem('access');
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${chatId}/`,
        { title: editingChatName },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const updatedChats = chats.map((chat) =>
        chat.id === chatId ? { ...chat, name: response.data.title } : chat
      );
      setChats(updatedChats);
      setEditingChatId(null);
      setEditingChatName('');
      alert('Название чата успешно обновлено.');
    } catch (error) {
      console.error('Error updating chat name:', error);
      if (error.response?.status === 404) {
        alert('Чат не найден.');
      } else if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
        router.push('/login');
      } else if (error.response?.data?.title) {
        alert(`Ошибка: ${error.response.data.title.join(' ')}`);
      } else {
        alert('Ошибка при обновлении названия чата. Попробуйте снова.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditingChatName('');
  };

  const handleStartDelete = (chatId) => {
    setDeletingChatId(chatId);
  };

  const handleCancelDelete = () => {
    setDeletingChatId(null);
  };

  const startMockInterview = async () => {
    if (!currentChatId) {
      alert('Пожалуйста, выберите чат.');
      return;
    }
    if (!selectedResume) {
      alert('Пожалуйста, загрузите резюме перед началом мок-интервью.');
      return;
    }
    setShowMockInterviewInput(true);
    console.log(`Starting mock interview for chat ${currentChatId}`);
    try {
      const access = localStorage.getItem('access');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${currentChatId}/messages/`,
        { message: 'start_mock_interview' },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Mock interview response:', response.data);
      const aiResponse = {
        sender: 'bot',
        text: response.data.bot_response
      };
      const currentChat = chats.find((chat) => chat.id === currentChatId);
      updateChatMessages(currentChatId, [...currentChat.messages, aiResponse]);
    } catch (error) {
      console.error('Error starting mock interview:', error.response?.data || error.message);
      alert('Ошибка при запуске мок-интервью: ' + (error.response?.data?.error || 'Попробуйте снова.'));
      const errorMessage = {
        sender: 'bot',
        text: 'Ошибка при запуске мок-интервью. Попробуйте снова.'
      };
      const currentChat = chats.find((chat) => chat.id === currentChatId);
      updateChatMessages(currentChatId, [...currentChat.messages, errorMessage]);
    }
  };

  const handleCheckVacancies = async () => {
    if (!currentChatId) {
      alert('Пожалуйста, выберите чат.');
      return;
    }
    if (!selectedResume) {
      alert('Пожалуйста, загрузите резюме перед поиском вакансий.');
      return;
    }

    try {
      const access = localStorage.getItem('access');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${currentChatId}/messages/`,
        { message: 'check_vacancies' },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const jobTitle = response.data.bot_response.trim();
      if (!jobTitle) {
        throw new Error('Название профессии не получено от ИИ.');
      }

      const url = `https://tomsk.hh.ru/search/vacancy?text=${encodeURIComponent(jobTitle)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error checking vacancies:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        alert('Чат не найден.');
      } else if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
        router.push('/login');
      } else if (error.response?.data?.error) {
        alert(`Ошибка: ${error.response.data.error}`);
      } else {
        alert('Ошибка при поиске вакансий. Попробуйте снова.');
      }
    }
  };

  const updateChatMessages = (chatId, messages) => {
    const updatedChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, messages } : chat
    );
    setChats(updatedChats);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !currentChatId) return;

    const newUserMessage = { sender: 'user', text: userInput };
    const currentChat = chats.find((chat) => chat.id === currentChatId);
    const updatedMessages = [...currentChat.messages, newUserMessage];
    updateChatMessages(currentChatId, updatedMessages);

    try {
      const access = localStorage.getItem('access');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${currentChatId}/messages/`,
        { message: userInput },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = {
        sender: 'bot',
        text: response.data.bot_response
      };
      updateChatMessages(currentChatId, [...updatedMessages, aiResponse]);
    } catch (error) {
      console.error('Error sending message to DeepSeek:', error);
      const errorMessage = {
        sender: 'bot',
        text: 'Ошибка при получении ответа от ИИ. Попробуйте снова.'
      };
      updateChatMessages(currentChatId, [...updatedMessages, errorMessage]);
    }

    setUserInput('');
  };

  const handleEndInterview = () => {
    setShowMockInterviewInput(false);
    const currentChat = chats.find((chat) => chat.id === currentChatId);
    const finalMessage = {
      sender: 'bot',
      text: 'Мок-интервью завершено. Спасибо за участие!'
    };
    updateChatMessages(currentChatId, [...currentChat.messages, finalMessage]);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Пожалуйста, выберите файл в формате PDF.');
      setSelectedResume(null);
      e.target.value = null;
      return;
    }

    if (!currentChatId) {
      alert('Пожалуйста, выберите чат перед загрузкой резюме.');
      setSelectedResume(null);
      e.target.value = null;
      return;
    }

    setSelectedResume({ name: file.name, id: null }); // Временное резюме до загрузки

    const formData = new FormData();
    formData.append('file', file);

    try {
      const access = localStorage.getItem('access');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${currentChatId}/attachments/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Обновляем состояние чата с новым резюме
      const updatedChats = chats.map(chat =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  sender: 'bot',
                  text: `Резюме "${response.data.original_filename}" загружено и добавлено в чат.`
                }
              ],
              resume: {
                id: response.data.id,
                original_filename: response.data.original_filename,
                uploaded_at: response.data.uploaded_at,
                file: response.data.file
              }
            }
          : chat
      );
      setChats(updatedChats);
      setSelectedResume({
        name: response.data.original_filename,
        id: response.data.id
      });
      alert(`Резюме "${response.data.original_filename}" успешно загружено.`);
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert('Ошибка при загрузке резюме. Попробуйте снова.');
      setSelectedResume(null);
      e.target.value = null;
    }
  };

  const handleAnalyzeResume = async () => {
    if (!currentChatId) {
      alert('Пожалуйста, выберите чат.');
      return;
    }
    if (!selectedResume) {
      alert('Пожалуйста, загрузите резюме перед началом анализа.');
      return;
    }

    const currentChat = chats.find((chat) => chat.id === currentChatId);
    const updatedMessages = [
      ...currentChat.messages,
      { sender: 'user', text: 'Проанализируй резюме.' }
    ];
    updateChatMessages(currentChatId, updatedMessages);

    try {
      const access = localStorage.getItem('access');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dialogs/${currentChatId}/messages/`,
        { message: 'Проанализируй резюме.' },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = {
        sender: 'bot',
        text: response.data.bot_response
      };
      updateChatMessages(currentChatId, [...updatedMessages, aiResponse]);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      const errorMessage = {
        sender: 'bot',
        text: 'Ошибка при анализе резюме. Убедитесь, что резюме загружено, и попробуйте снова.'
      };
      updateChatMessages(currentChatId, [...updatedMessages, errorMessage]);
    }
  };

  const handleAddResume = () => {
    fileInputRef.current.click();
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleSettings = () => {
    setShowProfileDropdown(false);
    router.push('/settings');
  };

  const handleLogout = () => {
    setShowProfileDropdown(false);
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    router.push('/login');
  };
  
    return (
      <div className="flex h-screen bg-[#1E1E1E] text-white">
        {/* Боковая панель */}
        <div className="w-64 p-4 bg-[#3D3D3D] border-r border-[#3D3D3D]">
          <h1 className="text-2xl text-center font-bold mb-4">CV AI</h1>
          <div className="h-0.5 bg-teal-600 rounded-full mb-4 relative"></div>
          <div className="space-y-2">
            <div className="relative">
              <button
                ref={profileButtonRef}
                onClick={toggleProfileDropdown}
                className="w-full py-2 px-4 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors cursor-pointer"
              >
                Профиль
              </button>
              {showProfileDropdown && (
                <div className="absolute left-full top-0 ml-2 w-48 bg-[#3D3D3D] p-4 rounded-lg border border-teal-600 z-50 profile-dropdown">
                  <h2 className="text-lg font-semibold mb-3 text-center">Настройки</h2>
                  <div className="space-y-2">
                    <button
                      onClick={handleSettings}
                      className="w-full py-1 px-2 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors text-sm cursor-pointer"
                    >
                      Настройки пользователя
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full py-1 px-2 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors text-sm cursor-pointer"
                    >
                      Выйти из аккаунта
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleAddChat}
              className="w-full py-2 px-4 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors cursor-pointer"
            >
              Добавить чат
            </button>
            {/*<button className="w-full py-2 px-4 border border-teal-600 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors cursor-pointer">
              Автоотклик на вакансии
              </button>*/}
          </div>
          
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">История чатов:</h2>
            <div className="space-y-1">
              {chats.map((chat) => (
                <div key={chat.id} className="relative">
                  {editingChatId === chat.id ? (
                    <div className="flex items-center space-x-2 w-full">
                      <textarea
                        value={editingChatName}
                        onChange={(e) => setEditingChatName(e.target.value)}
                        className="flex-1 p-2 bg-[#3D3D3D] rounded-lg border border-[#4E4E4E] focus:outline-none focus:border-teal-600 min-w-0 "
                      />
                      <button
                        onClick={() => handleSaveChatName(chat.id)}
                        className="p-2 text-[#AAAAAA] hover:text-[#FFFFFF] flex-shrink-0 cursor-pointer"
                      >
                        <FaCheck/>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-[#AAAAAA] hover:text-[#FFFFFF] flex-shrink-0 cursor-pointer"
                      >
                        <FaTimes/>
                      </button>
                    </div>
                  ) : deletingChatId === chat.id ? (
                    <div className="relative">
                      <button
                        className="w-full py-2 px-4 text-left rounded-lg bg-[#4E4E4E] cursor-pointer"
                        disabled
                      >
                        {chat.name}
                      </button>
                      <button
                        onClick={() => handleDeleteChat(chat.id)}
                        className="absolute right-10 top-1/2 transform -translate-y-1/2 text-[#AAAAAA] hover:text-[#FFFFFF] cursor-pointer"
                      >
                        <FaCheck/>
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#AAAAAA] hover:text-[#FFFFFF] cursor-pointer"
                      >
                        <FaTimes/>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => handleSelectChat(chat.id)}
                        className={`w-full py-2 px-4 text-left rounded-lg transition-colors cursor-pointer break-words  ${
                          currentChatId === chat.id
                            ? 'bg-[#4E4E4E]'
                            : 'bg-[#3D3D3D] hover:bg-[#4E4E4E]'
                        }`}
                      >
                        {chat.name}
                      </button>
                      <button
                        onClick={() => handleEditChatName(chat.id, chat.name)}
                        className="absolute right-10 top-1/2 transform -translate-y-1/2 text-[#AAAAAA] hover:text-[#FFFFFF] cursor-pointer"
                      >
                        <FaEdit/>
                      </button>
                      <button
                        onClick={() => handleStartDelete(chat.id)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#AAAAAA] hover:text-[#FFFFFF] cursor-pointer"
                      >
                        <FaTrash/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
  
        {/* Основная область */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-[#3D3D3D]">
            <h2 className="text-lg font-semibold">
              {currentChatId
                ? chats.find((chat) => chat.id === currentChatId)?.name
                : 'Выберите чат'}
            </h2>
          </div>
  
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto flex flex-col"
          >
            {currentChatId ? (
              (() => {
                const currentChat = chats.find((chat) => chat.id === currentChatId);
                return currentChat.messages.length > 0 ? (
                  <div className="flex flex-col flex-1 justify-end">
                    {currentChat.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`mb-4 p-3 rounded-lg whitespace-pre-wrap ${
                          message.sender === 'bot'
                            ? 'bg-[#3D3D3D] mr-auto max-w-3xl'
                            : 'bg-teal-600 ml-auto max-w-md'
                        }`}
                      >
                        <p>{message.text}</p>
                      </div>
                    ))}
                  </div>
                ) : showMockInterviewInput ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">Мок-интервью началось...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">
                      {selectedResume
                        ? `Выбрано резюме: ${selectedResume.name}`
                        : 'Выберите действие ниже'}
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Выберите чат или создайте новый</p>
              </div>
            )}
          </div>
  
          <div className="p-4 border-t border-[#3D3D3D] flex justify-center">
            {showMockInterviewInput && currentChatId ? (
              <div className="flex items-center space-x-2 max-w-6xl w-full">
                <form onSubmit={handleSendMessage} className="flex-1 flex items-center space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Введите ответ..."
                    className="flex-1 p-2 bg-[#3D3D3D] rounded-lg border border-[#4E4E4E] focus:outline-none focus:border-teal-600"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-teal-600 rounded-lg hover:bg-teal-500 transition-colors cursor-pointer"
                  >
                    Отправить
                  </button>
                </form>
                <button
                  onClick={handleEndInterview}
                  className="p-2 bg-red-600 rounded-lg hover:bg-red-500 transition-colors cursor-pointer"
                >
                  Завершить интервью
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button
                    onClick={handleAddResume}
                    className="py-2 px-4 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors cursor-pointer"
                  >
                    Добавить резюме
                  </button>
                  <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <button
                  onClick={handleAnalyzeResume}
                  className="py-2 px-4 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors cursor-pointer"
                  disabled={!currentChatId}
                >
                  Проанализировать резюме
                </button>
                <button
                  onClick={handleCheckVacancies}
                  className="py-2 px-4 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors cursor-pointer"
                  disabled={!currentChatId}
                >
                  Подобрать вакансии
                </button>
                <button
                  onClick={startMockInterview}
                  className="py-2 px-4 bg-teal-600 rounded-lg hover:bg-teal-500 transition-colors cursor-pointer"
                  disabled={!currentChatId}
                >
                  Провести мок-интервью
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }