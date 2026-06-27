import { useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function RestoreForm() {
  const email = useRef();
  const password = useRef();
  const confirmPassword = useRef();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [passwordError, setPasswordError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  // Проверка корректности email
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Проверка корректности пароля (минимум 8 символов)
  const isValidPassword = (password) => password.length >= 8;

  // Обработчик отправки формы регистрации или логина
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Проверка заполненности полей
    if (!email.current.value || !password.current.value || !confirmPassword.current.value) {
        setError("Пожалуйста, заполните все поля");
        setLoading(false);
        return;
    }

    // Проверка корректности email
    if (!isValidEmail(email.current.value)) {
        setEmailError(true);
        setError("Пожалуйста, введите корректный email");
        setLoading(false);
        return;
    }

    // Проверка корректности пароля
    if (!isValidPassword(password.current.value)) {
        setPasswordError(true);
        setError("Пароль должен содержать минимум 8 символов");
        setLoading(false);
        return;
    }

    if (password.current.value !== confirmPassword.current.value) {
        setError("Пароли не совпадают");
        setPasswordError(true);
        setLoading(false);
        return;
    }

    try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/restore-password/`;
        const requestData = {
            email: email.current.value,
            new_password: password.current.value,
        };

        console.log("Sending request to:", url, "with data:", requestData);

        const response = await axios.post(url, requestData, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        console.log("Response:", response.data);
        alert("Пароль успешно изменен!");
        router.push("/login");
    } catch (e) {
    console.error("Full error:", e);
    console.error("Response data:", e.response?.data);
    if (e.response) {
        setError(e.response.data.error || "Ошибка при изменении пароля");
    } else {
        setError("Не удалось подключиться к серверу");
    }
    }    finally {
        setLoading(false);
    }
  };

  return (
    <div className="w-[450px] h-auto mx-auto p-6 bg-[#555454] rounded-3xl shadow-md">
      <h1 className="text-3xl font-bold text-center mb-4 text-[#FFFFFF]">
        CV AI
      </h1>
      <h2 className="text-xl font-semibold text-center mb-4 text-[#FFFFFF]">
        Восстановить пароль
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Форма авторизации */}

        <>
          {/* Поле Email */}
          <div>
            <label className="block text-sm font-medium text-[#FFFFFF] mb-1">
              Email
            </label>
            <input
              type="email"
              className={`w-full px-4 py-2 border rounded-md 
                           hover:bg-[#7C7C7C] hover:border-[#FFFFFF] focus:outline-none
                           focus:bg-[#7C7C7C] focus:border-[#FFFFFF] transition-all duration-200
                           ${
                             emailError ? "border-red-500" : "border-[#000000]"
                           }`}
              placeholder="Email"
              ref={email}
              onChange={(e) => {
                setError("");
              }}
            />
          </div>

          {/* Поле Пароль */}
          <div>
            <label className="block text-sm font-medium text-[#FFFFFF] mb-1">
              Пароль
            </label>
            <input
              type="password"
              className={`w-full px-4 py-2 border rounded-md 
                           hover:bg-[#7C7C7C] hover:border-[#FFFFFF] focus:outline-none
                           focus:bg-[#7C7C7C] focus:border-[#FFFFFF] transition-all duration-200
                           ${
                             passwordError
                               ? "border-red-500"
                               : "border-[#000000]"
                           }`}
              placeholder="••••••••"
              ref={password}
              onChange={(e) => {
                setError("");
              }}
            />
            {/* Поле Пароль */}
            <div>
              <label className="block text-sm font-medium text-[#FFFFFF] mb-1 mt-1">
                Повторите пароль
              </label>
              <input
                type="password"
                className={`w-full px-4 py-2 border rounded-md 
                           hover:bg-[#7C7C7C] hover:border-[#FFFFFF] focus:outline-none
                           focus:bg-[#7C7C7C] focus:border-[#FFFFFF] transition-all duration-200
                           ${
                             passwordError
                               ? "border-red-500"
                               : "border-[#000000]"
                           }`}
                placeholder="••••••••"
                ref={confirmPassword}
                onChange={(e) => {
                  setError("");
                }}
              />
            </div>
            <div className="mt-2 text-right">
              <Link
                href="/login"
                className="text-sm text-[#FFFFFF] hover:text-[#2C9092] transition-colors cursor-pointer"
              >
                назад
              </Link>
            </div>
          </div>
        </>

        {/* Сообщение об ошибке */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Кнопка действия */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-[#3D3D3D] text-[#FFFFFF] py-2 px-4 rounded-md 
                     hover:bg-[#292929] transition-colors duration-200 cursor-pointer
                     ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Загрузка..." : "Изменить пароль"}
        </button>
      </form>
    </div>
  );
}
