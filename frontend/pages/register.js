import AuthForm from '../components/AuthForm';

export default function Register() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#333333]">
      <AuthForm isLogin={false} />
    </div>
  );
}