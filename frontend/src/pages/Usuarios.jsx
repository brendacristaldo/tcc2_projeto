
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Pencil,
  Plus,
  Search,
  UserPlus,
  X,
  Users,
  CalendarDays,
  Mail,
  UserRound,
  LockKeyhole,
  UserCheck,
  UserX,
  Link as LinkIcon
} from 'lucide-react';
import { Link } from 'react-router';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');

  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [gruposUsuario, setGruposUsuario] = useState([]);
  const [gruposDisponiveis, setGruposDisponiveis] = useState([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [erroVisualizacao, setErroVisualizacao] = useState('');

  const [salvandoGrupo, setSalvandoGrupo] = useState(false);
  const [erroGrupos, setErroGrupos] = useState('');

  const [modoEdicao, setModoEdicao] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [emailEdicao, setEmailEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');

  const [alteracaoSenhaAberta, setAlteracaoSenhaAberta] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');

  const [salvandoStatusId, setSalvandoStatusId] = useState(null);

  const carregarUsuarios = useCallback(async () => {
    try {
      setCarregando(true);
      setErro('');

      const token = localStorage.getItem('token');

      const resposta = await apiRequest(
        '/api/usuarios/tesoureiros',
        { token }
      );

      setUsuarios(resposta.usuarios || resposta.tesoureiros || []);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const termo = busca.toLowerCase().trim();

    return (
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo)
    );
  });

  const limparFormulario = () => {
    setNome('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setErroCadastro('');
  };

  const abrirModal = () => {
    limparFormulario();
    setSucesso('');
    setModalAberto(true);
  };

  const fecharModal = () => {
    if (salvando) return;

    setModalAberto(false);
    limparFormulario();
  };

  const cadastrarTesoureiro = async (e) => {
    e.preventDefault();

    setErroCadastro('');
    setSucesso('');

    if (!nome.trim() || !email.trim() || !senha) {
      setErroCadastro('Preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 6) {
      setErroCadastro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErroCadastro('As senhas não coincidem.');
      return;
    }

    try {
      setSalvando(true);

      const token = localStorage.getItem('token');

      await apiRequest('/api/usuarios/tesoureiros', {
        method: 'POST',
        token,
        body: {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha
        }
      });

      setModalAberto(false);
      limparFormulario();

      setSucesso('Tesoureiro cadastrado com sucesso!');

      await carregarUsuarios();
    } catch (error) {
      setErroCadastro(error.message);
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatusUsuario = async (usuario) => {
    const novoStatus = !usuario.ativo;

    const mensagem = novoStatus
      ? `Deseja realmente ativar o usuário ${usuario.nome}? Ele poderá acessar o sistema novamente.`
      : `Deseja realmente desativar o usuário ${usuario.nome}? Ele perderá o acesso ao sistema.`;

    if (!window.confirm(mensagem)) {
      return;
    }

    try {
      setSalvandoStatusId(usuario.idusuario);
      setErro('');
      setSucesso('');

      const token = localStorage.getItem('token');

      await apiRequest(
        `/api/usuarios/tesoureiros/${usuario.idusuario}/status`,
        {
          method: 'PATCH',
          token,
          body: {
            ativo: novoStatus
          }
        }
      );

      setUsuarios((listaAtual) =>
        listaAtual.map((item) =>
          item.idusuario === usuario.idusuario
            ? { ...item, ativo: novoStatus }
            : item
        )
      );

      setUsuarioSelecionado((usuarioAtual) => {
        if (
          usuarioAtual &&
          usuarioAtual.idusuario === usuario.idusuario
        ) {
          return {
            ...usuarioAtual,
            ativo: novoStatus
          };
        }

        return usuarioAtual;
      });

      setSucesso(
        novoStatus
          ? 'Tesoureiro ativado com sucesso!'
          : 'Tesoureiro desativado com sucesso!'
      );
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvandoStatusId(null);
    }
  };

  const carregarGruposUsuario = async (idusuario, token) => {
    const resposta = await apiRequest(
      `/api/usuarios/${idusuario}/grupos`,
      { token }
    );

    const lista = resposta.grupos || resposta;

    setGruposUsuario(Array.isArray(lista) ? lista : []);
  };

  const visualizarUsuario = async (
    idusuario,
    iniciarEmModoEdicao = false
  ) => {
    setModalVisualizacaoAberto(true);
    setUsuarioSelecionado(null);
    setGruposUsuario([]);
    setGruposDisponiveis([]);
    setGrupoSelecionado('');
    setErroVisualizacao('');
    setErroGrupos('');
    setErroEdicao('');
    setModoEdicao(false);
    setAlteracaoSenhaAberta(false);
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setErroSenha('');
    setCarregandoDetalhes(true);

    try {
      const token = localStorage.getItem('token');

      const respostaUsuario = await apiRequest(
        `/api/usuarios/tesoureiros/${idusuario}`,
        { token }
      );

      const respostaGrupos = await apiRequest(
        `/api/usuarios/${idusuario}/grupos`,
        { token }
      );

      const respostaGruposDisponiveis = await apiRequest(
        '/api/grupos',
        { token }
      );

      const dadosUsuario =
        respostaUsuario.usuario ||
        respostaUsuario.tesoureiro ||
        respostaUsuario;

      const listaGrupos =
        respostaGrupos.grupos ||
        respostaGrupos;

      const listaDisponiveis =
        respostaGruposDisponiveis.grupos ||
        respostaGruposDisponiveis;

      setUsuarioSelecionado(dadosUsuario);
      setGruposUsuario(Array.isArray(listaGrupos) ? listaGrupos : []);

      setGruposDisponiveis(
        Array.isArray(listaDisponiveis)
          ? listaDisponiveis.filter((grupo) => grupo.ativo === true)
          : []
      );

      setNomeEdicao(dadosUsuario.nome || '');
      setEmailEdicao(dadosUsuario.email || '');

      setModoEdicao(iniciarEmModoEdicao);
    } catch (error) {
      setErroVisualizacao(error.message);
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const gruposAindaNaoVinculados = gruposDisponiveis.filter(
    (grupo) =>
      !gruposUsuario.some(
        (grupoVinculado) =>
          String(grupoVinculado.idgrupo) === String(grupo.idgrupo)
      )
  );

  const associarGrupo = async (e) => {
    e.preventDefault();

    setErroGrupos('');
    setSucesso('');

    if (!grupoSelecionado) {
      setErroGrupos('Selecione um grupo para continuar.');
      return;
    }

    if (!usuarioSelecionado) {
      setErroGrupos('Não foi possível identificar o tesoureiro.');
      return;
    }

    try {
      setSalvandoGrupo(true);

      const token = localStorage.getItem('token');

      await apiRequest(
        `/api/usuarios/${usuarioSelecionado.idusuario}/grupos`,
        {
          method: 'POST',
          token,
          body: {
            grupo_id: Number(grupoSelecionado)
          }
        }
      );

      await carregarGruposUsuario(
        usuarioSelecionado.idusuario,
        token
      );

      setGrupoSelecionado('');
      setSucesso('Grupo vinculado ao tesoureiro com sucesso!');
    } catch (error) {
      setErroGrupos(error.message);
    } finally {
      setSalvandoGrupo(false);
    }
  };

  const fecharModalVisualizacao = () => {
    if (salvandoEdicao || salvandoSenha || salvandoGrupo) return;

    setModalVisualizacaoAberto(false);
    setUsuarioSelecionado(null);
    setGruposUsuario([]);
    setGruposDisponiveis([]);
    setGrupoSelecionado('');
    setErroVisualizacao('');
    setErroEdicao('');
    setErroSenha('');
    setErroGrupos('');
    setModoEdicao(false);
    setAlteracaoSenhaAberta(false);
    setNovaSenha('');
    setConfirmarNovaSenha('');
  };

  const iniciarEdicao = () => {
    if (!usuarioSelecionado) return;

    setNomeEdicao(usuarioSelecionado.nome || '');
    setEmailEdicao(usuarioSelecionado.email || '');
    setErroEdicao('');
    setModoEdicao(true);
    setAlteracaoSenhaAberta(false);
  };

  const cancelarEdicao = () => {
    if (salvandoEdicao) return;

    setNomeEdicao(usuarioSelecionado?.nome || '');
    setEmailEdicao(usuarioSelecionado?.email || '');
    setErroEdicao('');
    setModoEdicao(false);
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();

    setErroEdicao('');
    setSucesso('');

    if (!nomeEdicao.trim() || !emailEdicao.trim()) {
      setErroEdicao('Preencha o nome e o e-mail.');
      return;
    }

    try {
      setSalvandoEdicao(true);

      const token = localStorage.getItem('token');

      const resposta = await apiRequest(
        `/api/usuarios/tesoureiros/${usuarioSelecionado.idusuario}`,
        {
          method: 'PUT',
          token,
          body: {
            nome: nomeEdicao.trim(),
            email: emailEdicao.trim().toLowerCase()
          }
        }
      );

      const dadosAtualizados =
        resposta.usuario ||
        resposta.tesoureiro ||
        {};

      const usuarioAtualizado = {
        ...usuarioSelecionado,
        ...dadosAtualizados,
        nome: dadosAtualizados.nome || nomeEdicao.trim(),
        email: dadosAtualizados.email || emailEdicao.trim().toLowerCase()
      };

      setUsuarioSelecionado(usuarioAtualizado);

      setUsuarios((listaAtual) =>
        listaAtual.map((usuario) =>
          usuario.idusuario === usuarioAtualizado.idusuario
            ? { ...usuario, ...usuarioAtualizado }
            : usuario
        )
      );

      setNomeEdicao(usuarioAtualizado.nome);
      setEmailEdicao(usuarioAtualizado.email);
      setModoEdicao(false);
      setSucesso('Dados do tesoureiro atualizados com sucesso!');
    } catch (error) {
      setErroEdicao(error.message);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const alternarAlteracaoSenha = () => {
    setAlteracaoSenhaAberta((aberta) => !aberta);
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setErroSenha('');
  };

  const alterarSenhaTesoureiro = async (e) => {
    e.preventDefault();

    setErroSenha('');
    setSucesso('');

    if (!novaSenha || !confirmarNovaSenha) {
      setErroSenha('Preencha os dois campos de senha.');
      return;
    }

    if (novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErroSenha('As senhas não coincidem.');
      return;
    }

    try {
      setSalvandoSenha(true);

      const token = localStorage.getItem('token');

      await apiRequest(
        `/api/usuarios/tesoureiros/${usuarioSelecionado.idusuario}/senha`,
        {
          method: 'PATCH',
          token,
          body: {
            senha: novaSenha
          }
        }
      );

      setNovaSenha('');
      setConfirmarNovaSenha('');
      setAlteracaoSenhaAberta(false);

      setSucesso('Senha do tesoureiro alterada com sucesso!');
    } catch (error) {
      setErroSenha(error.message);
    } finally {
      setSalvandoSenha(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return 'Não informado';

    const dataFormatada = new Date(data);

    if (Number.isNaN(dataFormatada.getTime())) {
      return 'Não informado';
    }

    return dataFormatada.toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="space-y-6">

        {/* Botão para voltar ao Dashboard */}
        <Link
          to="/pastor/dashboard"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold text-[#29458f] transition hover:bg-blue-50"
        >
          <ArrowLeft size={20} />
          Voltar ao Dashboard
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black sm:text-4xl">
              Usuários
            </h1>

            <p className="mt-1 text-base text-black">
              Gerencie os tesoureiros cadastrados no sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-800"
          >
            <Plus size={20} />
            Novo usuário
          </button>
        </div>

        {sucesso && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
            {sucesso}
          </div>
        )}

        {erro && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">
            {erro}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <div className="relative max-w-md">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
              />

              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="min-h-12 w-full rounded-lg border border-gray-200 py-2.5 pl-11 pr-4 text-base text-black placeholder:text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {carregando && (
            <p className="py-10 text-center text-base text-black">
              Carregando usuários...
            </p>
          )}

          {!carregando && erro && usuarios.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-base text-red-600">
                Não foi possível carregar os usuários.
              </p>
            </div>
          )}

          {!carregando && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-black">
                      Usuário
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-black">
                      Perfil
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-black">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-sm font-semibold uppercase tracking-wider text-black">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {usuariosFiltrados.map((usuario) => (
                    <tr
                      key={usuario.idusuario}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700">
                            {usuario.nome.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="text-base font-semibold text-black">
                              {usuario.nome}
                            </p>

                            <p className="text-sm text-black">
                              {usuario.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-base text-black">
                          Tesoureiro
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${
                            usuario.ativo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-black'
                          }`}
                        >
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="Visualizar usuário"
                            aria-label="Visualizar usuário"
                            onClick={() => visualizarUsuario(usuario.idusuario)}
                            className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-black transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={19} />
                          </button>

                          <button
                            type="button"
                            title="Editar usuário"
                            aria-label="Editar usuário"
                            onClick={() => visualizarUsuario(usuario.idusuario, true)}
                            className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-black transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil size={19} />
                          </button>

                          <button
                            type="button"
                            title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                            aria-label={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                            onClick={() => alterarStatusUsuario(usuario)}
                            disabled={salvandoStatusId === usuario.idusuario}
                            className={`inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              usuario.ativo
                                ? 'text-black hover:bg-red-50 hover:text-red-600'
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            {usuario.ativo
                              ? <UserX size={19} />
                              : <UserCheck size={19} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usuariosFiltrados.length === 0 && (
                <div className="py-10 text-center">
                  <UserPlus
                    size={28}
                    className="mx-auto mb-2 text-black"
                  />

                  <p className="text-base text-black">
                    {busca
                      ? 'Nenhum usuário encontrado para essa pesquisa.'
                      : 'Nenhum tesoureiro cadastrado.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {!carregando && !erro && usuariosFiltrados.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-3">
              <p className="text-sm text-black">
                Exibindo {usuariosFiltrados.length}{' '}
                {usuariosFiltrados.length === 1
                  ? 'tesoureiro'
                  : 'tesoureiros'}
              </p>
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-black">
                  Novo tesoureiro
                </h2>

                <p className="mt-1 text-sm text-black">
                  Preencha os dados para cadastrar um usuário.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-black transition-colors hover:bg-gray-100 disabled:opacity-50"
                aria-label="Fechar formulário"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={cadastrarTesoureiro} className="space-y-4 p-6">
              <div>
                <label htmlFor="nome" className="mb-1.5 block text-base font-medium text-black">
                  Nome completo
                </label>

                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome completo"
                  required
                  disabled={salvando}
                  className="min-h-12 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-black placeholder:text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-base font-medium text-black">
                  E-mail
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  required
                  disabled={salvando}
                  className="min-h-12 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-black placeholder:text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="senha" className="mb-1.5 block text-base font-medium text-black">
                  Senha
                </label>

                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  minLength={6}
                  required
                  disabled={salvando}
                  autoComplete="new-password"
                  className="min-h-12 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-black placeholder:text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="confirmarSenha" className="mb-1.5 block text-base font-medium text-black">
                  Confirmar senha
                </label>

                <input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  disabled={salvando}
                  autoComplete="new-password"
                  className="min-h-12 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-black placeholder:text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-lg bg-gray-50 px-3 py-3">
                <p className="text-sm text-black">Perfil do usuário</p>
                <p className="mt-1 text-base font-medium text-black">Tesoureiro</p>
              </div>

              {erroCadastro && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-base text-red-700">
                  {erroCadastro}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-black transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="min-h-11 rounded-lg bg-blue-700 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalVisualizacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-black">
                  {modoEdicao ? 'Editar tesoureiro' : 'Detalhes do tesoureiro'}
                </h2>

                <p className="mt-1 text-sm text-black">
                  {modoEdicao
                    ? 'Atualize as informações pessoais do usuário.'
                    : 'Consulte as informações e os grupos vinculados ao usuário.'}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalVisualizacao}
                disabled={salvandoEdicao || salvandoSenha || salvandoGrupo}
                className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-black transition-colors hover:bg-gray-100 disabled:opacity-50"
                aria-label="Fechar modal"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              {carregandoDetalhes && (
                <div className="py-10 text-center">
                  <p className="text-base text-black">
                    Carregando informações do tesoureiro...
                  </p>
                </div>
              )}

              {!carregandoDetalhes && erroVisualizacao && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-base text-red-700">
                    Não foi possível carregar os dados do tesoureiro.
                  </p>

                  <p className="mt-1 text-sm text-red-600">
                    {erroVisualizacao}
                  </p>
                </div>
              )}

              {!carregandoDetalhes && !erroVisualizacao && usuarioSelecionado && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700">
                      {usuarioSelecionado.nome?.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-black">
                        {modoEdicao
                          ? nomeEdicao || usuarioSelecionado.nome
                          : usuarioSelecionado.nome}
                      </h3>

                      <p className="mt-1 text-base text-black">Tesoureiro</p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                        usuarioSelecionado.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-black'
                      }`}
                    >
                      {usuarioSelecionado.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-black">
                      Informações pessoais
                    </h3>

                    {modoEdicao ? (
                      <form
                        id="form-edicao-usuario"
                        onSubmit={salvarEdicao}
                        className="space-y-4"
                      >
                        <div>
                          <label htmlFor="nomeEdicao" className="mb-1.5 block text-base font-medium text-black">
                            Nome completo
                          </label>

                          <input
                            id="nomeEdicao"
                            type="text"
                            value={nomeEdicao}
                            onChange={(e) => setNomeEdicao(e.target.value)}
                            required
                            disabled={salvandoEdicao}
                            className="min-h-12 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label htmlFor="emailEdicao" className="mb-1.5 block text-base font-medium text-black">
                            E-mail
                          </label>

                          <input
                            id="emailEdicao"
                            type="email"
                            value={emailEdicao}
                            onChange={(e) => setEmailEdicao(e.target.value)}
                            required
                            disabled={salvandoEdicao}
                            className="min-h-12 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        {erroEdicao && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-base text-red-700">
                            {erroEdicao}
                          </div>
                        )}
                      </form>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <UserRound size={20} className="mt-0.5 text-black" />

                          <div>
                            <p className="text-sm text-black">Nome completo</p>
                            <p className="mt-1 text-base text-black">
                              {usuarioSelecionado.nome}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Mail size={20} className="mt-0.5 text-black" />

                          <div>
                            <p className="text-sm text-black">E-mail</p>
                            <p className="mt-1 break-all text-base text-black">
                              {usuarioSelecionado.email}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-start gap-3">
                      <CalendarDays size={20} className="mt-0.5 text-black" />

                      <div>
                        <p className="text-sm text-black">Data de cadastro</p>
                        <p className="mt-1 text-base text-black">
                          {formatarData(usuarioSelecionado.criado_em)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users size={20} className="text-black" />

                      <h3 className="text-base font-semibold text-black">
                        Grupos vinculados
                      </h3>
                    </div>

                    {gruposUsuario.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {gruposUsuario.map((grupo) => (
                          <span
                            key={grupo.idgrupo}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                              grupo.ativo === false
                                ? 'bg-gray-100 text-black'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {grupo.nome}
                            {grupo.ativo === false && ' (Inativo)'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base text-black">
                        Este tesoureiro ainda não possui grupos vinculados.
                      </p>
                    )}

                    {!modoEdicao && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <LinkIcon size={18} className="text-black" />

                          <p className="text-base font-medium text-black">
                            Vincular novo grupo
                          </p>
                        </div>

                        {gruposAindaNaoVinculados.length > 0 ? (
                          <form onSubmit={associarGrupo} className="space-y-3">
                            <div>
                              <label
                                htmlFor="grupoSelecionado"
                                className="mb-1.5 block text-sm font-medium text-black"
                              >
                                Selecione um grupo ativo
                              </label>

                              <select
                                id="grupoSelecionado"
                                value={grupoSelecionado}
                                onChange={(e) => setGrupoSelecionado(e.target.value)}
                                disabled={salvandoGrupo}
                                className="min-h-12 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                              >
                                <option value="">Selecione um grupo...</option>

                                {gruposAindaNaoVinculados.map((grupo) => (
                                  <option
                                    key={grupo.idgrupo}
                                    value={grupo.idgrupo}
                                  >
                                    {grupo.nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {erroGrupos && (
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-base text-red-700">
                                {erroGrupos}
                              </div>
                            )}

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={salvandoGrupo || !grupoSelecionado}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus size={18} />

                                {salvandoGrupo
                                  ? 'Vinculando...'
                                  : 'Vincular grupo'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="text-base text-black">
                            {gruposDisponiveis.length === 0
                              ? 'Não há grupos ativos disponíveis.'
                              : 'Todos os grupos ativos já estão vinculados a este tesoureiro.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!modoEdicao && (
                    <>
                      <div className="border-t border-gray-100" />

                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <LockKeyhole size={20} className="text-black" />

                            <h3 className="text-base font-semibold text-black">
                              Segurança da conta
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={alternarAlteracaoSenha}
                            disabled={salvandoSenha}
                            className="min-h-11 self-start rounded-lg px-3 text-base font-medium text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
                          >
                            {alteracaoSenhaAberta ? 'Cancelar' : 'Alterar senha'}
                          </button>
                        </div>

                        {alteracaoSenhaAberta && (
                          <form
                            onSubmit={alterarSenhaTesoureiro}
                            className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
                          >
                            <p className="text-sm text-black">
                              Defina uma nova senha para este tesoureiro.
                              A senha deve conter pelo menos 6 caracteres.
                            </p>

                            <div>
                              <label htmlFor="novaSenha" className="mb-1.5 block text-base font-medium text-black">
                                Nova senha
                              </label>

                              <input
                                id="novaSenha"
                                type="password"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                placeholder="Digite a nova senha"
                                minLength={6}
                                required
                                disabled={salvandoSenha}
                                autoComplete="new-password"
                                className="min-h-12 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-black placeholder:text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>

                            <div>
                              <label htmlFor="confirmarNovaSenha" className="mb-1.5 block text-base font-medium text-black">
                                Confirmar nova senha
                              </label>

                              <input
                                id="confirmarNovaSenha"
                                type="password"
                                value={confirmarNovaSenha}
                                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                                placeholder="Digite a nova senha novamente"
                                required
                                disabled={salvandoSenha}
                                autoComplete="new-password"
                                className="min-h-12 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-black placeholder:text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>

                            {erroSenha && (
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-base text-red-700">
                                {erroSenha}
                              </div>
                            )}

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={salvandoSenha}
                                className="min-h-11 w-full rounded-lg bg-blue-700 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                              >
                                {salvandoSenha ? 'Alterando senha...' : 'Salvar nova senha'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
              {modoEdicao ? (
                <>
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                    disabled={salvandoEdicao}
                    className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-black transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    form="form-edicao-usuario"
                    disabled={salvandoEdicao || carregandoDetalhes}
                    className="min-h-11 rounded-lg bg-blue-700 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={fecharModalVisualizacao}
                    disabled={salvandoSenha || salvandoGrupo}
                    className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-black transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Fechar
                  </button>

                  {usuarioSelecionado && (
                    <button
                      type="button"
                      onClick={iniciarEdicao}
                      disabled={salvandoSenha || salvandoGrupo}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
                    >
                      <Pencil size={18} />
                      Editar dados
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Usuarios;
