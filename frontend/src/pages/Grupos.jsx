
import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Users,
  X,
  Pencil,
  Power,
} from 'lucide-react';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [busca, setBusca] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(null);

  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [grupoEditando, setGrupoEditando] = useState(null);

  async function carregarGrupos() {
    const token = localStorage.getItem('token');

    const resposta = await apiRequest('/api/grupos', {
      token,
    });

    setGrupos(resposta.grupos || []);
  }

  useEffect(() => {
    async function iniciarCarregamento() {
      try {
        setErro('');
        await carregarGrupos();
      } catch (error) {
        setErro(error.message);
      } finally {
        setCarregando(false);
      }
    }

    iniciarCarregamento();
  }, []);

  function abrirModal() {
    setGrupoEditando(null);
    setNomeGrupo('');
    setErro('');
    setMensagem('');
    setModalAberto(true);
  }

  function abrirModalEdicao(grupo) {
    setGrupoEditando(grupo);
    setNomeGrupo(grupo.nome);
    setErro('');
    setMensagem('');
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setNomeGrupo('');
    setGrupoEditando(null);
    setErro('');
  }

  async function salvarGrupo(event) {
    event.preventDefault();

    const nome = nomeGrupo.trim();

    if (!nome) {
      setErro('Informe o nome do grupo.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      setMensagem('');

      const token = localStorage.getItem('token');

      if (grupoEditando) {
        await apiRequest(`/api/grupos/${grupoEditando.idgrupo}`, {
          method: 'PUT',
          token,
          body: { nome },
        });

        setMensagem('Grupo atualizado com sucesso!');
      } else {
        await apiRequest('/api/grupos', {
          method: 'POST',
          token,
          body: { nome },
        });

        setMensagem('Grupo cadastrado com sucesso!');
      }

      setModalAberto(false);
      setNomeGrupo('');
      setGrupoEditando(null);

      try {
        await carregarGrupos();
      } catch {
        setMensagem(
          'Operação realizada com sucesso! Atualize a página para visualizar a listagem.'
        );
      }
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatusGrupo(grupo) {
    const novoStatus = !grupo.ativo;

    const confirmado = window.confirm(
      novoStatus
        ? `Deseja realmente reativar o grupo "${grupo.nome}"?`
        : `Deseja realmente desativar o grupo "${grupo.nome}"? As movimentações históricas serão preservadas.`
    );

    if (!confirmado) return;

    try {
      setAlterandoStatus(grupo.idgrupo);
      setErro('');
      setMensagem('');

      const token = localStorage.getItem('token');

      await apiRequest(`/api/grupos/${grupo.idgrupo}/status`, {
        method: 'PATCH',
        token,
        body: {
          ativo: novoStatus,
        },
      });

      setMensagem(
        novoStatus
          ? 'Grupo reativado com sucesso!'
          : 'Grupo desativado com sucesso!'
      );

      await carregarGrupos();

    } catch (error) {
      setErro(error.message);
    } finally {
      setAlterandoStatus(null);
    }
  }

  const gruposFiltrados = grupos.filter((grupo) =>
    grupo.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-3 sm:p-4">
        <header className="mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 sm:text-xl lg:text-2xl">
                Grupos
              </h1>

              <p className="mt-1 text-xs text-gray-500">
                Gerencie os grupos e suas informações financeiras.
              </p>
            </div>

            <button
              type="button"
              onClick={abrirModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#29458f] px-4 text-xs font-medium text-white hover:bg-[#233d7d] sm:h-9"
            >
              <Plus size={14} />
              Novo grupo
            </button>
          </div>
        </header>

        {mensagem && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {mensagem}
          </div>
        )}

        {erro && !modalAberto && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {erro}
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#29458f]" />

              <h2 className="text-sm font-semibold text-gray-900">
                Grupos cadastrados ({gruposFiltrados.length})
              </h2>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar grupo..."
                className="h-11 w-full rounded-md border border-gray-300 pl-9 pr-3 text-xs outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] sm:h-9"
              />
            </div>
          </div>

          {carregando && (
            <p className="py-10 text-center text-sm text-gray-500">
              Carregando grupos...
            </p>
          )}

          {!carregando && erro && grupos.length === 0 && (
            <p className="py-10 text-center text-sm text-red-600">
              Não foi possível carregar os grupos: {erro}
            </p>
          )}

          {!carregando && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-2 py-2 font-semibold text-gray-700">
                        Grupo
                      </th>

                      <th className="px-2 py-2 font-semibold text-gray-700">
                        Status
                      </th>

                      <th className="px-2 py-2 text-right font-semibold text-gray-700">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {gruposFiltrados.map((grupo) => (
                      <tr
                        key={grupo.idgrupo}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#29458f]">
                              <Users size={14} />
                            </div>

                            <span className="font-medium text-gray-800">
                              {grupo.nome}
                            </span>
                          </div>
                        </td>

                        <td className="px-2 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${
                              grupo.ativo
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {grupo.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(grupo)}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-gray-500 hover:bg-blue-50 hover:text-[#29458f] sm:min-h-0 sm:min-w-0"
                              title="Editar grupo"
                              aria-label={`Editar grupo ${grupo.nome}`}
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => alterarStatusGrupo(grupo)}
                              disabled={alterandoStatus === grupo.idgrupo}
                              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:min-w-0 ${
                                grupo.ativo
                                  ? 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={
                                grupo.ativo
                                  ? 'Desativar grupo'
                                  : 'Reativar grupo'
                              }
                              aria-label={
                                grupo.ativo
                                  ? `Desativar grupo ${grupo.nome}`
                                  : `Reativar grupo ${grupo.nome}`
                              }
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {gruposFiltrados.length === 0 && (
                <div className="py-10 text-center">
                  <Users
                    size={24}
                    className="mx-auto mb-2 text-gray-400"
                  />

                  <p className="text-sm text-gray-500">
                    Nenhum grupo encontrado.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  {grupoEditando ? 'Editar grupo' : 'Novo grupo'}
                </h2>

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1 text-gray-500 hover:bg-gray-100 sm:min-h-0 sm:min-w-0"
                  aria-label="Fechar formulário"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={salvarGrupo}>
                <label
                  htmlFor="nomeGrupo"
                  className="mb-1.5 block text-xs font-medium text-gray-700"
                >
                  Nome do grupo
                </label>

                <input
                  id="nomeGrupo"
                  type="text"
                  value={nomeGrupo}
                  onChange={(event) => setNomeGrupo(event.target.value)}
                  placeholder="Ex.: Jovens"
                  maxLength={100}
                  autoFocus
                  required
                  className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] sm:h-10"
                />

                {erro && (
                  <p className="mt-2 text-xs text-red-600">
                    {erro}
                  </p>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharModal}
                    disabled={salvando}
                    className="h-11 rounded-md border border-gray-300 px-4 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:h-9"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={salvando || !nomeGrupo.trim()}
                    className="h-11 rounded-md bg-[#29458f] px-4 text-xs font-medium text-white hover:bg-[#233d7d] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9"
                  >
                    {salvando
                      ? 'Salvando...'
                      : grupoEditando
                        ? 'Salvar alterações'
                        : 'Salvar grupo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Grupos;
