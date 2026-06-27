import RestoreForm from "../components/RestoreForm.js";

export default function Login() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#333333]">
      <RestoreForm isLogin={true} />
    </div>
  );
}
