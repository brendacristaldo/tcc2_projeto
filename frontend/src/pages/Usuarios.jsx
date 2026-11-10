
import { useCallback, useEffect, useState } from 'react';
import {
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
  Link
} from 'lucide-react';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Estados do formulário de cadastro
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');

  // Estados do modal de visualização e edição
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [gruposUsuario, setGruposUsuario] = useState([]);
  const [gruposDisponiveis, setGruposDisponiveis] = useState([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [erroVisualizacao, setErroVisualizacao] = useState('');

  // Estados da associação de grupos
  const [salvandoGrupo, setSalvandoGrupo] = useState(false);
  const [erroGrupos, setErroGrupos] = useState('');

  const [modoEdicao, setModoEdicao] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [emailEdicao, setEmailEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');

  // Estados da alteração de senha
  const [alteracaoSenhaAberta, setAlteracaoSenhaAberta] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');

  // Estado da ativação/desativação
  const [salvandoStatusId, setSalvandoStatusId] = useState(null);

  // Carrega os tesoureiros cadastrados no banco
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

  // Filtra por nome ou e-mail
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const termo = busca.toLowerCase().trim();

    return (
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo)
    );
  });

  // Limpa os campos do formulário de cadastro
  const limparFormulario = () => {
    setNome('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setErroCadastro('');
  };

  // Abre o formulário de cadastro
  const abrirModal = () => {
    limparFormulario();
    setSucesso('');
    setModalAberto(true);
  };

  // Fecha o formulário de cadastro
  const fecharModal = () => {
    if (salvando) return;

    setModalAberto(false);
    limparFormulario();
  };

  // Cadastra um novo tesoureiro
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

  // Ativa ou desativa um tesoureiro
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

  // Carrega os grupos já vinculados ao tesoureiro
  const carregarGruposUsuario = async (idusuario, token) => {
    const resposta = await apiRequest(
      `/api/usuarios/${idusuario}/grupos`,
      { token }
    );

    const lista = resposta.grupos || resposta;

    setGruposUsuario(Array.isArray(lista) ? lista : []);
  };

  // Abre o modal e carrega os dados do tesoureiro e os grupos
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

  // Grupos ativos que ainda não estão vinculados ao tesoureiro
  const gruposAindaNaoVinculados = gruposDisponiveis.filter(
    (grupo) =>
      !gruposUsuario.some(
        (grupoVinculado) =>
          String(grupoVinculado.idgrupo) === String(grupo.idgrupo)
      )
  );

  // Associa um grupo ao tesoureiro
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

  // Fecha o modal de visualização
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

  // Ativa o modo de edição
  const iniciarEdicao = () => {
    if (!usuarioSelecionado) return;

    setNomeEdicao(usuarioSelecionado.nome || '');
    setEmailEdicao(usuarioSelecionado.email || '');
    setErroEdicao('');
    setModoEdicao(true);
    setAlteracaoSenhaAberta(false);
  };

  // Cancela a edição e restaura os dados originais
  const cancelarEdicao = () => {
    if (salvandoEdicao) return;

    setNomeEdicao(usuarioSelecionado?.nome || '');
    setEmailEdicao(usuarioSelecionado?.email || '');
    setErroEdicao('');
    setModoEdicao(false);
  };

  // Salva as alterações do tesoureiro
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

  // Abre ou fecha a seção de alteração de senha
  const alternarAlteracaoSenha = () => {
    setAlteracaoSenhaAberta((aberta) => !aberta);
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setErroSenha('');
  };

  // Altera a senha do tesoureiro
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

  // Formata a data de cadastro
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

        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Usuários
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Gerencie os tesoureiros cadastrados no sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800"
          >
            <Plus size={18} />
            Novo usuário
          </button>
        </div>

        {/* Mensagem de sucesso */}
        {sucesso && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {sucesso}
          </div>
        )}

        {/* Erro de operação */}
        {erro && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Conteúdo da tabela */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* Pesquisa */}
          <div className="border-b border-gray-100 p-4">
            <div className="relative max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="min-h-11 w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Carregamento */}
          {carregando && (
            <p className="py-10 text-center text-sm text-gray-500">
              Carregando usuários...
            </p>
          )}

          {/* Erro da listagem */}
          {!carregando && erro && usuarios.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-red-600">
                Não foi possível carregar os usuários.
              </p>
            </div>
          )}

          {/* Tabela */}
          {!carregando && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Usuário
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Perfil
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
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
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {usuario.nome.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {usuario.nome}
                            </p>

                            <p className="text-xs text-gray-500">
                              {usuario.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700">
                          Tesoureiro
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${
                            usuario.ativo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
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
                            className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Editar usuário"
                            aria-label="Editar usuário"
                            onClick={() => visualizarUsuario(usuario.idusuario, true)}
                            className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                            aria-label={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                            onClick={() => alterarStatusUsuario(usuario)}
                            disabled={salvandoStatusId === usuario.idusuario}
                            className={`inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              usuario.ativo
                                ? 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            {usuario.ativo
                              ? <UserX size={17} />
                              : <UserCheck size={17} />}
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
                    size={24}
                    className="mx-auto mb-2 text-gray-400"
                  />

                  <p className="text-sm text-gray-500">
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
              <p className="text-xs text-gray-500">
                Exibindo {usuariosFiltrados.length}{' '}
                {usuariosFiltrados.length === 1
                  ? 'tesoureiro'
                  : 'tesoureiros'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de cadastro */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Novo tesoureiro
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Preencha os dados para cadastrar um usuário.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Fechar formulário"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={cadastrarTesoureiro} className="space-y-4 p-6">
              <div>
                <label htmlFor="nome" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="senha" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="confirmarSenha" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-lg bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">Perfil do usuário</p>
                <p className="mt-1 text-sm font-medium text-gray-800">Tesoureiro</p>
              </div>

              {erroCadastro && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {erroCadastro}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="min-h-11 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de visualização e edição */}
      {modalVisualizacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {modoEdicao ? 'Editar tesoureiro' : 'Detalhes do tesoureiro'}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {modoEdicao
                    ? 'Atualize as informações pessoais do usuário.'
                    : 'Consulte as informações e os grupos vinculados ao usuário.'}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalVisualizacao}
                disabled={salvandoEdicao || salvandoSenha || salvandoGrupo}
                className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              {carregandoDetalhes && (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-500">
                    Carregando informações do tesoureiro...
                  </p>
                </div>
              )}

              {!carregandoDetalhes && erroVisualizacao && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">
                    Não foi possível carregar os dados do tesoureiro.
                  </p>

                  <p className="mt-1 text-xs text-red-600">
                    {erroVisualizacao}
                  </p>
                </div>
              )}

              {!carregandoDetalhes && !erroVisualizacao && usuarioSelecionado && (
                <div className="space-y-6">

                  {/* Identificação */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
                      {usuarioSelecionado.nome?.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {modoEdicao
                          ? nomeEdicao || usuarioSelecionado.nome
                          : usuarioSelecionado.nome}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">Tesoureiro</p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        usuarioSelecionado.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {usuarioSelecionado.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Informações pessoais */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Informações pessoais
                    </h3>

                    {modoEdicao ? (
                      <form
                        id="form-edicao-usuario"
                        onSubmit={salvarEdicao}
                        className="space-y-4"
                      >
                        <div>
                          <label htmlFor="nomeEdicao" className="mb-1.5 block text-sm font-medium text-gray-700">
                            Nome completo
                          </label>

                          <input
                            id="nomeEdicao"
                            type="text"
                            value={nomeEdicao}
                            onChange={(e) => setNomeEdicao(e.target.value)}
                            required
                            disabled={salvandoEdicao}
                            className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label htmlFor="emailEdicao" className="mb-1.5 block text-sm font-medium text-gray-700">
                            E-mail
                          </label>

                          <input
                            id="emailEdicao"
                            type="email"
                            value={emailEdicao}
                            onChange={(e) => setEmailEdicao(e.target.value)}
                            required
                            disabled={salvandoEdicao}
                            className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        {erroEdicao && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                            {erroEdicao}
                          </div>
                        )}
                      </form>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <UserRound size={18} className="mt-0.5 text-gray-400" />

                          <div>
                            <p className="text-xs text-gray-500">Nome completo</p>
                            <p className="mt-1 text-sm text-gray-800">
                              {usuarioSelecionado.nome}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Mail size={18} className="mt-0.5 text-gray-400" />

                          <div>
                            <p className="text-xs text-gray-500">E-mail</p>
                            <p className="mt-1 break-all text-sm text-gray-800">
                              {usuarioSelecionado.email}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-start gap-3">
                      <CalendarDays size={18} className="mt-0.5 text-gray-400" />

                      <div>
                        <p className="text-xs text-gray-500">Data de cadastro</p>
                        <p className="mt-1 text-sm text-gray-800">
                          {formatarData(usuarioSelecionado.criado_em)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Grupos vinculados */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-gray-500" />

                      <h3 className="text-sm font-semibold text-gray-900">
                        Grupos vinculados
                      </h3>
                    </div>

                    {gruposUsuario.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {gruposUsuario.map((grupo) => (
                          <span
                            key={grupo.idgrupo}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                              grupo.ativo === false
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {grupo.nome}
                            {grupo.ativo === false && ' (Inativo)'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Este tesoureiro ainda não possui grupos vinculados.
                      </p>
                    )}

                    {/* Formulário para associar grupo */}
                    {!modoEdicao && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Link size={16} className="text-gray-500" />

                          <p className="text-sm font-medium text-gray-800">
                            Vincular novo grupo
                          </p>
                        </div>

                        {gruposAindaNaoVinculados.length > 0 ? (
                          <form onSubmit={associarGrupo} className="space-y-3">
                            <div>
                              <label
                                htmlFor="grupoSelecionado"
                                className="mb-1.5 block text-xs font-medium text-gray-600"
                              >
                                Selecione um grupo ativo
                              </label>

                              <select
                                id="grupoSelecionado"
                                value={grupoSelecionado}
                                onChange={(e) => setGrupoSelecionado(e.target.value)}
                                disabled={salvandoGrupo}
                                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
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
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                                {erroGrupos}
                              </div>
                            )}

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={salvandoGrupo || !grupoSelecionado}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus size={16} />

                                {salvandoGrupo
                                  ? 'Vinculando...'
                                  : 'Vincular grupo'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {gruposDisponiveis.length === 0
                              ? 'Não há grupos ativos disponíveis.'
                              : 'Todos os grupos ativos já estão vinculados a este tesoureiro.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Alteração de senha */}
                  {!modoEdicao && (
                    <>
                      <div className="border-t border-gray-100" />

                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <LockKeyhole size={18} className="text-gray-500" />

                            <h3 className="text-sm font-semibold text-gray-900">
                              Segurança da conta
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={alternarAlteracaoSenha}
                            disabled={salvandoSenha}
                            className="min-h-11 self-start rounded-lg px-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
                          >
                            {alteracaoSenhaAberta ? 'Cancelar' : 'Alterar senha'}
                          </button>
                        </div>

                        {alteracaoSenhaAberta && (
                          <form
                            onSubmit={alterarSenhaTesoureiro}
                            className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
                          >
                            <p className="text-xs text-gray-500">
                              Defina uma nova senha para este tesoureiro.
                              A senha deve conter pelo menos 6 caracteres.
                            </p>

                            <div>
                              <label htmlFor="novaSenha" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>

                            <div>
                              <label htmlFor="confirmarNovaSenha" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>

                            {erroSenha && (
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                                {erroSenha}
                              </div>
                            )}

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={salvandoSenha}
                                className="min-h-11 w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

            {/* Rodapé */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
              {modoEdicao ? (
                <>
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                    disabled={salvandoEdicao}
                    className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    form="form-edicao-usuario"
                    disabled={salvandoEdicao || carregandoDetalhes}
                    className="min-h-11 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Fechar
                  </button>

                  {usuarioSelecionado && (
                    <button
                      type="button"
                      onClick={iniciarEdicao}
                      disabled={salvandoSenha || salvandoGrupo}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
                    >
                      <Pencil size={16} />
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
