
import { useEffect, useRef, useState } from 'react';
import {
  Eye,
  Pencil,
  Trash2,
  Filter,
  Search,
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

  // Converter o tipo armazenado no banco
  const formatarTipo = (tipo) => {
    return tipo === 'entrada' ? 'Entrada' : 'Saída';
  };

  // Formatar data para o padrão brasileiro
  const formatarData = (data) => {
    if (!data) return '-';

    const [ano, mes, dia] = String(data)
      .slice(0, 10)
      .split('-');

    return `${dia}/${mes}/${ano}`;
  };

  // Formatar valor monetário
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));
  };

  // Abrir o calendário nativo do navegador
  const abrirCalendario = (referencia) => {
    const campo = referencia.current;

    if (!campo) return;

    campo.focus();

    if (typeof campo.showPicker === 'function') {
      try {
        campo.showPicker();
      } catch (error) {
        // Se o navegador não permitir showPicker,
        // o campo continua focado para uso do seletor nativo.
        console.warn('Não foi possível abrir o calendário:', error);
      }
    }
  };

  // Excluir movimentação definitivamente
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

  // Atualizar filtros sem perder os demais valores
  const atualizarFiltro = (campo, valor) => {
    setFiltros((anteriores) => ({
      ...anteriores,
      [campo]: valor,
    }));
  };

  // Aplicar filtros
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

  // Ações compartilhadas entre cards e tabela
  const renderAcoes = (movimentacao) => {
    const estaExcluindo =
      excluindoId === movimentacao.idmovimentacao;

    return (
      <div className="flex items-center gap-2">
        <Link
          to={`/movimentacoes/${movimentacao.idmovimentacao}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          aria-label="Visualizar movimentação"
          title="Visualizar"
        >
          <Eye size={18} />
        </Link>

        <Link
          to={`/movimentacoes/${movimentacao.idmovimentacao}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          aria-label="Editar movimentação"
          title="Editar"
        >
          <Pencil size={18} />
        </Link>

        <button
          type="button"
          onClick={() => excluirMovimentacao(movimentacao)}
          disabled={excluindoId !== null}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Excluir movimentação"
          title="Excluir movimentação"
        >
          {estaExcluindo ? (
            <span className="text-xs font-semibold">...</span>
          ) : (
            <Trash2 size={18} />
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
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Consulta de Movimentações
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Consulte e acompanhe as entradas e saídas financeiras.
          </p>
        </header>

        {/* Filtros */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={19} className="text-gray-700" />

            <h2 className="text-base font-semibold text-gray-900">
              Filtros
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="dataInicio"
                className="mb-1.5 block text-sm font-medium text-gray-700"
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
                onTouchEnd={() => abrirCalendario(dataInicioRef)}
                className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20"
              />
            </div>

            <div>
              <label
                htmlFor="dataFim"
                className="mb-1.5 block text-sm font-medium text-gray-700"
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
                onTouchEnd={() => abrirCalendario(dataFimRef)}
                className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20"
              />
            </div>

            <div>
              <label
                htmlFor="tipo"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Tipo de movimentação
              </label>

              <select
                id="tipo"
                value={filtros.tipo}
                onChange={(event) =>
                  atualizarFiltro('tipo', event.target.value)
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20"
              >
                <option value="">Todos</option>
                <option value="Entrada">Entrada</option>
                <option value="Saída">Saída</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limparFiltros}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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
              <h2 className="text-base font-semibold text-gray-900">
                Movimentações
              </h2>

              <p className="mt-0.5 text-sm text-gray-500">
                {movimentacoesFiltradas.length}{' '}
                {movimentacoesFiltradas.length === 1
                  ? 'registro encontrado'
                  : 'registros encontrados'}
              </p>
            </div>
          </div>

          {mensagemSucesso && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
            >
              {mensagemSucesso}
            </div>
          )}

          {erroExclusao && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {erroExclusao}
            </div>
          )}

          {carregando && (
            <p className="py-10 text-center text-sm text-gray-500">
              Carregando movimentações...
            </p>
          )}

          {!carregando && erro && (
            <p
              role="alert"
              className="py-10 text-center text-sm text-red-600"
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            Movimentação #{movimentacao.idmovimentacao}
                          </p>

                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {formatarData(movimentacao.data)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            tipo === 'Entrada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {tipo}
                        </span>
                      </div>

                      <div className="my-4">
                        <p className="text-xs text-gray-500">
                          Valor
                        </p>

                        <p
                          className={`mt-1 text-xl font-bold ${
                            tipo === 'Entrada'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatarMoeda(movimentacao.valor)}
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            Descrição
                          </p>

                          <p className="break-words text-sm text-gray-800">
                            {movimentacao.observacao || '-'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">
                              Evento
                            </p>

                            <p className="break-words text-sm text-gray-800">
                              {movimentacao.evento || '-'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Responsável
                            </p>

                            <p className="break-words text-sm text-gray-800">
                              {movimentacao.responsavel || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-sm font-medium text-gray-600">
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
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-gray-700">
                        Data
                      </th>

                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Tipo
                      </th>

                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Descrição
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-gray-700">
                        Valor
                      </th>

                      <th className="hidden px-3 py-3 font-semibold text-gray-700 lg:table-cell">
                        Evento
                      </th>

                      <th className="hidden px-3 py-3 font-semibold text-gray-700 xl:table-cell">
                        Responsável
                      </th>

                      <th className="px-3 py-3 text-center font-semibold text-gray-700">
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
                          <td className="whitespace-nowrap px-3 py-4 text-gray-700">
                            {formatarData(movimentacao.data)}
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                tipo === 'Entrada'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {tipo}
                            </span>
                          </td>

                          <td className="max-w-[240px] break-words px-3 py-4 text-gray-700">
                            {movimentacao.observacao || '-'}
                          </td>

                          <td
                            className={`whitespace-nowrap px-3 py-4 font-semibold ${
                              tipo === 'Entrada'
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatarMoeda(movimentacao.valor)}
                          </td>

                          <td className="hidden px-3 py-4 text-gray-700 lg:table-cell">
                            {movimentacao.evento || '-'}
                          </td>

                          <td className="hidden px-3 py-4 text-gray-700 xl:table-cell">
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
                    size={30}
                    className="mx-auto mb-3 text-gray-400"
                  />

                  <p className="text-sm font-medium text-gray-700">
                    Nenhuma movimentação encontrada.
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
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
