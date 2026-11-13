
import { useEffect, useRef, useState } from 'react';

import {
  Eye,
  Pencil,
  Trash2,
  Filter,
  Search,
  ArrowLeft,
} from 'lucide-react';

import { Link } from 'react-router';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function Movimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [erroExclusao, setErroExclusao] = useState('');
  const [excluindoId, setExcluindoId] = useState(null);

  const dataInicioRef = useRef(null);
  const dataFimRef = useRef(null);

  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    tipo: '',
  });

  // Buscar movimentações no backend
  useEffect(() => {
    async function carregarMovimentacoes() {
      try {
        setCarregando(true);
        setErro('');

        const token = localStorage.getItem('token');

        const resposta = await apiRequest('/api/movimentacoes', {
          token,
        });

        setMovimentacoes(resposta.movimentacoes || []);
      } catch (error) {
        setErro(error.message);
      } finally {
        setCarregando(false);
      }
    }

    carregarMovimentacoes();
  }, []);

  const formatarTipo = (tipo) => {
    return tipo === 'entrada' ? 'Entrada' : 'Saída';
  };

  const formatarData = (data) => {
    if (!data) return '-';

    const [ano, mes, dia] = String(data)
      .slice(0, 10)
      .split('-');

    return `${dia}/${mes}/${ano}`;
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));
  };

  const abrirCalendario = (referencia) => {
    const campo = referencia.current;

    if (!campo) return;

    campo.focus();

    if (typeof campo.showPicker === 'function') {
      try {
        campo.showPicker();
      } catch (error) {
        console.warn('Não foi possível abrir o calendário:', error);
      }
    }
  };

  const excluirMovimentacao = async (movimentacao) => {
    const confirmacao = window.confirm(
      `Tem certeza de que deseja excluir definitivamente a movimentação #${movimentacao.idmovimentacao}?\n\n` +
      `Tipo: ${formatarTipo(movimentacao.tipo)}\n` +
      `Valor: ${formatarMoeda(movimentacao.valor)}\n\n` +
      'Essa ação não poderá ser desfeita. Os comprovantes vinculados também serão excluídos.'
    );

    if (!confirmacao) {
      return;
    }

    try {
      setExcluindoId(movimentacao.idmovimentacao);
      setErroExclusao('');
      setMensagemSucesso('');

      const token = localStorage.getItem('token');

      const resposta = await apiRequest(
        `/api/movimentacoes/${movimentacao.idmovimentacao}`,
        {
          method: 'DELETE',
          token,
        }
      );

      setMovimentacoes((anteriores) =>
        anteriores.filter(
          (item) =>
            item.idmovimentacao !== movimentacao.idmovimentacao
        )
      );

      setMensagemSucesso(
        resposta.mensagem || 'Movimentação excluída com sucesso!'
      );
    } catch (error) {
      setErroExclusao(
        error.message || 'Não foi possível excluir a movimentação.'
      );
    } finally {
      setExcluindoId(null);
    }
  };

  const atualizarFiltro = (campo, valor) => {
    setFiltros((anteriores) => ({
      ...anteriores,
      [campo]: valor,
    }));
  };

  const movimentacoesFiltradas = movimentacoes.filter(
    (movimentacao) => {
      const data = String(movimentacao.data || '').slice(0, 10);
      const tipo = formatarTipo(movimentacao.tipo);

      if (filtros.tipo && tipo !== filtros.tipo) {
        return false;
      }

      if (filtros.dataInicio && data < filtros.dataInicio) {
        return false;
      }

      if (filtros.dataFim && data > filtros.dataFim) {
        return false;
      }

      return true;
    }
  );

  const limparFiltros = () => {
    setFiltros({
      dataInicio: '',
      dataFim: '',
      tipo: '',
    });
  };

  const renderAcoes = (movimentacao) => {
    const estaExcluindo =
      excluindoId === movimentacao.idmovimentacao;

    return (
      <div className="flex items-center gap-2">
        <Link
          to={`/movimentacoes/${movimentacao.idmovimentacao}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 text-black transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#29458f] focus:ring-offset-2"
          aria-label="Visualizar movimentação"
          title="Visualizar"
        >
          <Eye size={20} />
        </Link>

        <Link
          to={`/movimentacoes/${movimentacao.idmovimentacao}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 text-black transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#29458f] focus:ring-offset-2"
          aria-label="Editar movimentação"
          title="Editar"
        >
          <Pencil size={20} />
        </Link>

        <button
          type="button"
          onClick={() => excluirMovimentacao(movimentacao)}
          disabled={excluindoId !== null}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Excluir movimentação"
          title="Excluir movimentação"
        >
          {estaExcluindo ? (
            <span className="text-sm font-semibold">...</span>
          ) : (
            <Trash2 size={20} />
          )}
        </button>
      </div>
    );
  };

  return (
    <Layout>
      <main className="w-full min-w-0 p-3 sm:p-5 lg:p-6">

        {/* Cabeçalho */}
        <header className="mb-5">

          {/* Botão voltar ao Dashboard */}
          <Link
              to="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold text-[#29458f] transition hover:bg-blue-50"
            >
              <ArrowLeft size={19} />
              Voltar ao Dashboard
            </Link>

          <h1 className="text-2xl font-bold text-black sm:text-3xl">
            Consulta de Movimentações
          </h1>

          <p className="mt-1 text-base text-black">
            Consulte e acompanhe as entradas e saídas financeiras.
          </p>
        </header>

        {/* Filtros */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={21} className="text-black" />

            <h2 className="text-xl font-semibold text-black">
              Filtros
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Data inicial */}
            <div>
              <label
                htmlFor="dataInicio"
                className="mb-1.5 block text-base font-semibold text-black"
              >
                Data inicial
              </label>

              <input
                ref={dataInicioRef}
                id="dataInicio"
                type="date"
                value={filtros.dataInicio}
                onChange={(event) =>
                  atualizarFiltro('dataInicio', event.target.value)
                }
                onClick={() => abrirCalendario(dataInicioRef)}
                className="min-h-12 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-base text-black outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20"
              />
            </div>

            {/* Data final */}
            <div>
              <label
                htmlFor="dataFim"
                className="mb-1.5 block text-base font-semibold text-black"
              >
                Data final
              </label>

              <input
                ref={dataFimRef}
                id="dataFim"
                type="date"
                value={filtros.dataFim}
                onChange={(event) =>
                  atualizarFiltro('dataFim', event.target.value)
                }
                onClick={() => abrirCalendario(dataFimRef)}
                className="min-h-12 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-base text-black outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20"
              />
            </div>

            {/* Tipo de movimentação */}
            <div>
              <label
                htmlFor="tipo"
                className="mb-1.5 block text-base font-semibold text-black"
              >
                Tipo de movimentação
              </label>

              <select
                id="tipo"
                value={filtros.tipo}
                onChange={(event) =>
                  atualizarFiltro('tipo', event.target.value)
                }
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-black outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20"
              >
                <option value="">Todos</option>
                <option value="Entrada">Entrada</option>
                <option value="Saída">Saída</option>
              </select>
            </div>

            {/* Limpar filtros */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={limparFiltros}
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base font-semibold text-black transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#29458f] focus:ring-offset-2"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </section>

        {/* Listagem */}
        <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-black">
                Movimentações
              </h2>

              <p className="mt-0.5 text-base text-black">
                {movimentacoesFiltradas.length}{' '}
                {movimentacoesFiltradas.length === 1
                  ? 'registro encontrado'
                  : 'registros encontrados'}
              </p>
            </div>
          </div>

          {/* Mensagem de sucesso */}
          {mensagemSucesso && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-base text-emerald-700"
            >
              {mensagemSucesso}
            </div>
          )}

          {/* Mensagem de erro na exclusão */}
          {erroExclusao && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-base text-red-700"
            >
              {erroExclusao}
            </div>
          )}

          {/* Carregamento */}
          {carregando && (
            <p className="py-10 text-center text-base text-black">
              Carregando movimentações...
            </p>
          )}

          {/* Erro ao carregar */}
          {!carregando && erro && (
            <p
              role="alert"
              className="py-10 text-center text-base text-red-600"
            >
              {erro}
            </p>
          )}

          {!carregando && !erro && (
            <>
              {/* Cards para dispositivos móveis */}
              <div className="space-y-3 md:hidden">

                {movimentacoesFiltradas.map((movimentacao) => {
                  const tipo = formatarTipo(movimentacao.tipo);

                  return (
                    <article
                      key={movimentacao.idmovimentacao}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      {/* Identificação e tipo */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-black">
                            Movimentação #{movimentacao.idmovimentacao}
                          </p>

                          <p className="mt-1 text-base font-semibold text-black">
                            {formatarData(movimentacao.data)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                            tipo === 'Entrada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {tipo}
                        </span>
                      </div>

                      {/* Valor */}
                      <div className="my-4">
                        <p className="text-sm font-medium text-black">
                          Valor
                        </p>

                        <p
                          className={`mt-1 text-2xl font-bold ${
                            tipo === 'Entrada'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatarMoeda(movimentacao.valor)}
                        </p>
                      </div>

                      {/* Informações adicionais */}
                      <div className="space-y-3 border-t border-gray-100 pt-3">
                        <div>
                          <p className="text-sm font-semibold text-black">
                            Descrição
                          </p>

                          <p className="break-words text-base text-black">
                            {movimentacao.observacao || '-'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm font-semibold text-black">
                              Evento
                            </p>

                            <p className="break-words text-base text-black">
                              {movimentacao.evento || '-'}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-black">
                              Responsável
                            </p>

                            <p className="break-words text-base text-black">
                              {movimentacao.responsavel || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-base font-semibold text-black">
                          Ações
                        </span>

                        {renderAcoes(movimentacao)}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Tabela para tablets e desktops */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] border-collapse text-left text-base">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-black">
                        Data
                      </th>

                      <th className="px-3 py-3 font-semibold text-black">
                        Tipo
                      </th>

                      <th className="px-3 py-3 font-semibold text-black">
                        Descrição
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-black">
                        Valor
                      </th>

                      <th className="hidden px-3 py-3 font-semibold text-black lg:table-cell">
                        Evento
                      </th>

                      <th className="hidden px-3 py-3 font-semibold text-black xl:table-cell">
                        Responsável
                      </th>

                      <th className="px-3 py-3 text-center font-semibold text-black">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {movimentacoesFiltradas.map((movimentacao) => {
                      const tipo = formatarTipo(movimentacao.tipo);

                      return (
                        <tr
                          key={movimentacao.idmovimentacao}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-3 py-4 text-black">
                            {formatarData(movimentacao.data)}
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${
                                tipo === 'Entrada'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {tipo}
                            </span>
                          </td>

                          <td className="max-w-[240px] break-words px-3 py-4 text-black">
                            {movimentacao.observacao || '-'}
                          </td>

                          <td
                            className={`whitespace-nowrap px-3 py-4 font-bold ${
                              tipo === 'Entrada'
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatarMoeda(movimentacao.valor)}
                          </td>

                          <td className="hidden px-3 py-4 text-black lg:table-cell">
                            {movimentacao.evento || '-'}
                          </td>

                          <td className="hidden px-3 py-4 text-black xl:table-cell">
                            {movimentacao.responsavel || '-'}
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex justify-center">
                              {renderAcoes(movimentacao)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Estado vazio */}
              {movimentacoesFiltradas.length === 0 && (
                <div className="py-10 text-center">
                  <Search
                    size={32}
                    className="mx-auto mb-3 text-black"
                  />

                  <p className="text-base font-semibold text-black">
                    Nenhuma movimentação encontrada.
                  </p>

                  <p className="mt-1 text-sm text-black">
                    Tente alterar ou limpar os filtros aplicados.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}

export default Movimentacoes;
