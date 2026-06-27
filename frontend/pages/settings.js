import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function Settings() {
  const router = useRouter();

  // Состояние формы
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Загрузка данных пользователя при монтировании
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
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (error.response?.status === 401) {
          router.push('/login');
        }
      }
    };

    fetchUserData();
  }, [router]);

  // Валидации
  const isLettersOnly = (value) => /^[а-яА-Яa-zA-Z]+$/.test(value);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password) => password.length >= 8;

  // Выход из аккаунта
  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    router.push('/login');
  };

  // Переход в чат
  const goToChat = () => {
    router.push('/');
  };

  // Сохранение профиля
  const handleSaveProfile = async () => {
    const newErrors = {
      email: '',
      firstName: '',
      lastName: '',
    };

    // Валидация
    if (!isValidEmail(email)) {
      newErrors.email = 'Введите корректный email';
    }
    if (firstName && !isLettersOnly(firstName)) {
      newErrors.firstName = 'Имя должно содержать только буквы';
    }
    if (lastName && !isLettersOnly(lastName)) {
      newErrors.lastName = 'Фамилия должна содержать только буквы';
    }

    setErrors(newErrors);

    // Проверка на ошибки
    if (Object.values(newErrors).some(error => error)) {
      return;
    }

    setLoading(true);
    try {
      const access = localStorage.getItem('access');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/`, {
        email,
        first_name: firstName,
        last_name: lastName
      }, {
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });
      alert('Изменения сохранены!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка при сохранении: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Смена пароля
  const handlePasswordChange = async () => {
    const newErrors = {
      newPassword: '',
      confirmPassword: '',
    };

    // Валидация пароля
    if (!isValidPassword(newPassword)) {
      newErrors.newPassword = 'Пароль должен содержать минимум 8 символов';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);

    // Проверка на ошибки
    if (Object.values(newErrors).some(error => error)) {
      return;
    }

    setLoading(true);
    try {
    let access = localStorage.getItem('access');
    
    // Первая попытка запроса
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/`, {
        password: newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert('Пароль успешно изменён!');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      return;
    } catch (firstAttemptError) {
      if (firstAttemptError.response?.status !== 401) throw firstAttemptError;
      
      // Если 401 - пробуем обновить токен
      const refresh = localStorage.getItem('refresh');
      const refreshResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/token/refresh/`,
        { refresh }
      );
      
      // Сохраняем новый токен
      localStorage.setItem('access', refreshResponse.data.access);
      access = refreshResponse.data.access;
      
      // Повторяем запрос с новым токеном
      await axios.patch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/`, {
        password: newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert('Пароль успешно изменён!');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    }
  } catch (error) {
    console.error('Error changing password:', error);
    alert('Ошибка при смене пароля: ' + 
      (error.response?.data?.detail || 
       error.response?.data?.error || 
       error.message));
  } finally {
    setLoading(false);
  }
};

  // Стили для полей ввода
  const getInputClass = (hasError) =>
    `w-full px-4 py-2 border rounded-md 
    ${hasError ? 'border-red-500' : 'border-[#000000]'} 
    bg-[#2A2A2A] text-white 
    hover:bg-[#7C7C7C] hover:border-[#FFFFFF]
    focus:outline-none focus:bg-[#7C7C7C] focus:border-[#FFFFFF]
    transition-all duration-200`;

  return (
    <div className="flex h-screen bg-[#1E1E1E] text-white">
      {/* Боковая панель */}
      <div className="w-64 p-4 bg-[#3D3D3D] border-r border-[#3D3D3D] flex flex-col justify-between">
        <div>
          <h1 className="text-2xl text-center font-bold mb-4">CV AI</h1>
          <div className="h-0.5 bg-teal-600 rounded-full mb-4" />
          <button
            onClick={goToChat}
            className="w-full py-2 px-4 bg-[#3D3D3D] rounded-lg hover:bg-[#4E4E4E] transition-colors cursor-pointer"
          >
            Назад к чату
          </button>
        </div>
      </div>

      {/* Основное содержимое */}
      <div className="flex-1 flex items-start justify-start p-8 overflow-y-auto">
        <div className="w-full max-w-3xl flex flex-col md:flex-row gap-8">
          {/* Настройки профиля */}
          <div className="w-full md:w-1/2">
            <h3 className="text-xl font-semibold mb-4">Настройки аккаунта</h3>
            <p className="mb-6 text-sm text-gray-400">
              Здесь вы можете изменять персональную информацию
            </p>

            <div className="space-y-4">
              {/* Поле Email */}
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={getInputClass(!!errors.email)}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Поле Имя */}
              <div>
                <label className="block text-sm mb-1">Имя</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={getInputClass(!!errors.firstName)}
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              {/* Поле Фамилия */}
              <div>
                <label className="block text-sm mb-1">Фамилия</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={getInputClass(!!errors.lastName)}
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>

              {/* Кнопка смены пароля */}
              <button
                onClick={() => setShowPasswordFields(!showPasswordFields)}
                className="mt-4 py-2 px-4 bg-[#4E4E4E] hover:bg-[#5f5f5f] rounded text-sm transition-colors cursor-pointer"
              >
                {showPasswordFields ? "Скрыть смену пароля" : "Сменить пароль"}
              </button>

              {/* Кнопка сохранения */}
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className={`w-full mt-4 py-2 px-4 bg-teal-600 hover:bg-teal-700 rounded text-sm transition-colors font-semibold cursor-pointer ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>

              {/* Кнопка выхода */}
              <button
                onClick={handleLogout}
                className="w-full mt-8 py-2 px-4 bg-[#2A2A2A] border border-[#555] hover:bg-[#3A3A3A] rounded text-sm transition-colors cursor-pointer"
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>

          {/* Форма смены пароля */}
          {showPasswordFields && (
            <div className="w-full md:w-1/2 bg-[#2A2A2A] p-6 rounded-xl mt-[4px]">
              <h3 className="text-xl font-semibold mb-6 text-center">Смена пароля</h3>
              <div className="space-y-4">
                {/* Новый пароль */}
                <div>
                  <label className="block text-sm mb-1">Введите новый пароль</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={getInputClass(!!errors.newPassword)}
                    placeholder="Не менее 8 символов"
                  />
                  {errors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
                  )}
                </div>

                {/* Подтверждение пароля */}
                <div>
                  <label className="block text-sm mb-1">Повторите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={getInputClass(!!errors.confirmPassword)}
                    placeholder="Повторите новый пароль"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Кнопка подтверждения смены пароля */}
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  className={`w-full mt-4 py-2 px-4 bg-teal-600 hover:bg-teal-700 rounded text-white font-semibold transition-colors cursor-pointer ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Сохранение...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
