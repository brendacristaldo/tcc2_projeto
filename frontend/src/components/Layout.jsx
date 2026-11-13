
import { useEffect, useState } from 'react';

import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import { NavLink, useNavigate } from 'react-router';

import { useAuth } from './RotaProtegida';

function Layout({ children }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [menuRecolhido, setMenuRecolhido] = useState(false);

  const ehPastor = usuario?.tipo_perfil === 'pastor';

  const menuItems = ehPastor
    ? [
        {
          label: 'Dashboard',
          path: '/pastor/dashboard',
          icon: LayoutDashboard,
        },
        {
          label: 'Usuários',
          path: '/pastor/usuarios',
          icon: Users,
        },
        {
          label: 'Grupos',
          path: '/pastor/grupos',
          icon: FolderKanban,
        },
        {
          label: 'Atribuir tesoureiros',
          path: '/pastor/atribuir-tesoureiros',
          icon: UserRound,
        },
        {
          label: 'Auditoria',
          path: '/pastor/auditoria',
          icon: ShieldCheck,
        },
      ]
    : [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          label: 'Movimentações',
          path: '/movimentacoes',
          icon: Activity,
        },
        {
          label: 'Eventos',
          path: '/eventos',
          icon: CalendarDays,
        },
        {
          label: 'Relatórios',
          path: '/relatorios',
          icon: FileText,
        },
      ];

  function fecharMenuMobile() {
    setMenuMobileAberto(false);
  }

  function sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');

    fecharMenuMobile();
    navigate('/login', { replace: true });
  }

  // Fecha o menu mobile ao pressionar Escape.
  useEffect(() => {
    function tratarTecla(event) {
      if (event.key === 'Escape') {
        fecharMenuMobile();
      }
    }

    window.addEventListener('keydown', tratarTecla);

    return () => {
      window.removeEventListener('keydown', tratarTecla);
    };
  }, []);

  // Impede a rolagem do conteúdo de fundo com o menu mobile aberto.
  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = menuMobileAberto ? 'hidden' : '';

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [menuMobileAberto]);

  const larguraSidebar = menuRecolhido
    ? 'lg:ml-[76px]'
    : 'lg:ml-64';

  const nomeUsuario = usuario?.nome || 'Usuário';
  const perfilUsuario = ehPastor ? 'Pastor' : 'Tesoureiro';

  const iniciais = nomeUsuario
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-[#f3f4f6]">

      {/* Cabeçalho mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-[#29458f] px-4 text-white shadow-sm lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <ShieldCheck size={24} />
          </div>

          <span className="truncate text-lg font-semibold">
            Tesouraria Digital
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMenuMobileAberto(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Abrir menu"
          aria-expanded={menuMobileAberto}
          aria-controls="menu-principal"
        >
          <Menu size={26} />
        </button>
      </header>

      {/* Fundo escuro do menu mobile */}
      {menuMobileAberto && (
        <button
          type="button"
          onClick={fecharMenuMobile}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Fechar menu"
        />
      )}

      {/* Barra lateral */}
      <aside
        id="menu-principal"
        aria-label="Menu principal"
        className={`
          fixed left-0 top-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col
          bg-[#29458f] text-white shadow-xl
          transition-all duration-200 ease-in-out
          ${menuRecolhido ? 'lg:w-[76px]' : 'lg:w-64'}
          ${
            menuMobileAberto
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }
        `}
      >

        {/* Identificação do sistema */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-4">

          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <ShieldCheck size={24} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                Tesouraria
              </p>
              <p className="text-sm text-white/70">
                Digital
              </p>
            </div>
          </div>

          <div
            className={`
              hidden min-w-0 items-center gap-3
              ${menuRecolhido ? 'lg:hidden' : 'lg:flex'}
            `}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <ShieldCheck size={22} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                Tesouraria
              </p>
              <p className="text-sm text-white/70">
                Digital
              </p>
            </div>
          </div>

          {menuRecolhido && (
            <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-white/15 lg:mx-auto lg:flex">
              <ShieldCheck size={22} />
            </div>
          )}

          <button
            type="button"
            onClick={fecharMenuMobile}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>

          <button
            type="button"
            onClick={() => setMenuRecolhido(!menuRecolhido)}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white lg:flex"
            aria-label={menuRecolhido ? 'Expandir menu' : 'Recolher menu'}
            title={menuRecolhido ? 'Expandir menu' : 'Recolher menu'}
          >
            {menuRecolhido
              ? <ChevronRight size={21} />
              : <ChevronLeft size={21} />
            }
          </button>
        </div>

        {/* Usuário autenticado */}
        <div className="border-b border-white/15 px-4 py-4">
          <div className="flex items-center gap-3 lg:gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4269bd] text-base font-semibold"
              title={nomeUsuario}
            >
              {iniciais || 'U'}
            </div>

            <div
              className={`
                min-w-0
                ${menuRecolhido ? 'lg:hidden' : ''}
              `}
            >
              <p className="truncate text-base font-semibold">
                {nomeUsuario}
              </p>

              <p className="text-sm text-white/70">
                {perfilUsuario}
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p
            className={`
              mb-3 px-2 text-sm font-semibold uppercase
              tracking-wider text-white/70
              ${menuRecolhido ? 'lg:hidden' : ''}
            `}
          >
            Menu principal
          </p>

          {menuRecolhido && (
            <p className="mb-3 hidden text-center text-xs font-semibold uppercase tracking-wider text-white/70 lg:block">
              Menu
            </p>
          )}

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={
                    item.path === '/dashboard' ||
                    item.path === '/pastor/dashboard'
                  }
                  onClick={fecharMenuMobile}
                  title={menuRecolhido ? item.label : undefined}
                  className={({ isActive }) => `
                    flex min-h-12 items-center rounded-lg px-3
                    text-base transition-colors
                    focus-visible:outline focus-visible:outline-2
                    focus-visible:outline-offset-2 focus-visible:outline-white
                    ${
                      menuRecolhido
                        ? 'lg:justify-center lg:px-2'
                        : 'gap-3'
                    }
                    ${
                      isActive
                        ? 'bg-white/20 font-semibold text-white'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon
                    size={23}
                    strokeWidth={1.9}
                    className="shrink-0"
                  />

                  <span
                    className={`
                      truncate
                      ${menuRecolhido ? 'lg:hidden' : ''}
                    `}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Sair */}
        <div className="shrink-0 border-t border-white/15 p-3">
          <button
            type="button"
            onClick={sair}
            title={menuRecolhido ? 'Sair' : undefined}
            className={`
              flex min-h-12 w-full items-center rounded-lg px-3
              text-base text-white/90 transition-colors
              hover:bg-red-500/20 hover:text-white
              focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-white
              ${
                menuRecolhido
                  ? 'lg:justify-center lg:px-2'
                  : 'gap-3'
              }
            `}
          >
            <LogOut size={23} className="shrink-0" />

            <span className={menuRecolhido ? 'lg:hidden' : ''}>
              Sair
            </span>
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main
        className={`
          min-h-screen min-w-0 pt-16
          transition-[margin] duration-200
          ${larguraSidebar}
          lg:pt-0
        `}
      >
        {children}
      </main>
    </div>
  );
}

export default Layout;
