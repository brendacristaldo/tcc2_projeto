
import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Users,
  X,
  Pencil,
  Power,
} from 'lucide-react';

import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
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
        <header className="mb-5">
            <Link
  to="/pastor/dashboard"
  className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold text-[#29458f] transition hover:bg-blue-50"
>
  <ArrowLeft size={18} />
  Voltar ao Dashboard
</Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-black sm:text-2xl lg:text-3xl">
                Grupos
              </h1>

              <p className="mt-2 text-sm text-black sm:text-base">
                Gerencie os grupos e suas informações financeiras.
              </p>
            </div>

            <button
              type="button"
              onClick={abrirModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#29458f] px-4 text-sm font-semibold text-white hover:bg-[#233d7d] sm:h-10"
            >
              <Plus size={17} />
              Novo grupo
            </button>
          </div>
        </header>

        {mensagem && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:text-base">
            {mensagem}
          </div>
        )}

        {erro && !modalAberto && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:text-base">
            {erro}
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-3 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users size={19} className="text-[#29458f]" />

              <h2 className="text-base font-semibold text-black sm:text-lg">
                Grupos cadastrados ({gruposFiltrados.length})
              </h2>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
              />

              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar grupo..."
                className="h-12 w-full rounded-md border border-gray-300 pl-10 pr-3 text-sm text-black placeholder:text-black outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] sm:text-base"
              />
            </div>
          </div>

          {carregando && (
            <p className="py-10 text-center text-base text-black">
              Carregando grupos...
            </p>
          )}

          {!carregando && erro && grupos.length === 0 && (
            <p className="py-10 text-center text-base text-red-600">
              Não foi possível carregar os grupos: {erro}
            </p>
          )}

          {!carregando && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px] border-collapse text-left text-sm sm:text-base">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-3 font-semibold text-black">
                        Grupo
                      </th>

                      <th className="px-3 py-3 font-semibold text-black">
                        Status
                      </th>

                      <th className="px-3 py-3 text-right font-semibold text-black">
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
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#29458f]">
                              <Users size={17} />
                            </div>

                            <span className="font-medium text-black">
                              {grupo.nome}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
                              grupo.ativo
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-black'
                            }`}
                          >
                            {grupo.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(grupo)}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-black hover:bg-blue-50 hover:text-[#29458f]"
                              title="Editar grupo"
                              aria-label={`Editar grupo ${grupo.nome}`}
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => alterarStatusGrupo(grupo)}
                              disabled={alterandoStatus === grupo.idgrupo}
                              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                grupo.ativo
                                  ? 'text-black hover:bg-red-50 hover:text-red-600'
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
                              <Power size={17} />
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
                    size={28}
                    className="mx-auto mb-3 text-black"
                  />

                  <p className="text-base text-black">
                    Nenhum grupo encontrado.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black">
                  {grupoEditando ? 'Editar grupo' : 'Novo grupo'}
                </h2>

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1 text-black hover:bg-gray-100 disabled:opacity-50"
                  aria-label="Fechar formulário"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={salvarGrupo}>
                <label
                  htmlFor="nomeGrupo"
                  className="mb-2 block text-sm font-semibold text-black sm:text-base"
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
                  className="h-12 w-full rounded-md border border-gray-300 px-3 text-base text-black placeholder:text-black outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f]"
                />

                {erro && (
                  <p className="mt-2 text-sm text-red-600">
                    {erro}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharModal}
                    disabled={salvando}
                    className="h-11 rounded-md border border-gray-300 px-5 text-sm font-semibold text-black hover:bg-gray-50 disabled:opacity-50 sm:text-base"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={salvando || !nomeGrupo.trim()}
                    className="h-11 rounded-md bg-[#29458f] px-5 text-sm font-semibold text-white hover:bg-[#233d7d] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
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
