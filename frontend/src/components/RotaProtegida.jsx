
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Navigate, Outlet } from 'react-router';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function RotaProtegida({ perfisPermitidos }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function verificarAutenticacao() {
      const token = localStorage.getItem('token');

      if (!token) {
        if (ativo) setCarregando(false);
        return;
      }

      try {
        const resposta = await apiRequest('/api/auth/me', {
          token,
        });

        const dadosUsuario = resposta.usuario ?? resposta;

        if (!ativo) return;

        setUsuario(dadosUsuario);

        localStorage.setItem(
          'usuario',
          JSON.stringify(dadosUsuario)
        );
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');

        if (ativo) {
          setUsuario(null);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    verificarAutenticacao();

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-600">
          Verificando autenticação...
        </p>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (
    perfisPermitidos &&
    !perfisPermitidos.includes(usuario.tipo_perfil)
  ) {
    const destino =
      usuario.tipo_perfil === 'pastor'
        ? '/pastor/dashboard'
        : '/dashboard';

    return <Navigate to={destino} replace />;
  }

  return (
    <AuthContext.Provider value={{ usuario }}>
      <Outlet />
    </AuthContext.Provider>
  );
}

export default RotaProtegida;
