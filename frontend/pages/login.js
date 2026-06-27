import AuthForm from '../components/AuthForm';

export default function Login() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#333333]">
      <AuthForm isLogin={true} />
    </div>
  );
}