
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { apiRequest } from '../services/api';

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErro('');
    setCarregando(true);

    try {
      const resposta = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email,
          senha
        }
      });

      localStorage.setItem('token', resposta.token);
      localStorage.setItem('usuario', JSON.stringify(resposta.usuario));

      if (resposta.usuario.tipo_perfil === 'pastor') {
        navigate('/pastor/dashboard');
      } else if (resposta.usuario.tipo_perfil === 'tesoureiro') {
        navigate('/dashboard');
      } else {
        setErro('Perfil de usuário não reconhecido.');
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }

    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#2D5BC8] px-4 py-8">
      <section className="w-full max-w-[400px] rounded-[10px] bg-white px-6 py-6 shadow-sm">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#29458F]">
            <svg
              width="38"
              height="38"
              viewBox="0 0 38 38"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Logo da igreja"
            >
              <path d="M12 31V13.5L19 9L26 13.5V31" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 31V19H23V31" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 4V12" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M15.5 8H22.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M12 31H26" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <div className="mt-5 text-center">
          <h1 className="text-[22px] font-semibold leading-7 text-black">
            Tesouraria Digital
          </h1>

          <p className="mt-2 text-[15px] leading-5 text-black">
            Sistema de Gestão Financeira para Igreja
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-6">

          {/* E-mail */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-[14px] font-semibold text-black"
            >
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
              className="h-12 w-full rounded-[5px] border border-gray-300 bg-[#F1F1F3] px-3 text-base text-black outline-none placeholder:text-black focus:ring-2 focus:ring-[#29458F]/30"
            />
          </div>

          {/* Senha */}
          <div className="mt-4">
            <label
              htmlFor="password"
              className="mb-2 block text-[14px] font-semibold text-black"
            >
              Senha
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="••••••••"
              required
              className="h-12 w-full rounded-[5px] border border-gray-300 bg-[#F1F1F3] px-3 text-base text-black outline-none placeholder:text-black focus:ring-2 focus:ring-[#29458F]/30"
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="mt-3 text-center text-sm font-medium text-red-600">
              {erro}
            </p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={carregando}
            className="mt-4 h-12 w-full rounded-[5px] bg-[#29458F] text-base font-semibold text-white transition hover:bg-[#233D7D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      </section>
    </main>
  );
}

export default Login;
