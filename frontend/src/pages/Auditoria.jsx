
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  FileSearch,
  Search,
  ShieldCheck,
  User,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

const camposAuditoria = [
  { chave: 'tipo', label: 'Tipo de movimentação' },
  { chave: 'valor', label: 'Valor' },
  { chave: 'data', label: 'Data da movimentação' },
  { chave: 'grupo_id', label: 'Grupo (ID)' },
  { chave: 'categoria_id', label: 'Categoria (ID)' },
  { chave: 'forma_pagamento_id', label: 'Forma de pagamento (ID)' },
  { chave: 'evento_id', label: 'Evento (ID)' },
];

function formatarDataHora(data) {
  if (!data) return '—';

  const valor = String(data).replace(' ', 'T');
  const dataFormatada = new Date(valor);

  if (Number.isNaN(dataFormatada.getTime())) return String(data);

  return dataFormatada.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarData(data) {
  if (!data) return '—';

  const partes = String(data).slice(0, 10).split('-');

  if (partes.length !== 3) return String(data);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarValor(chave, valor) {
  if (valor === null || valor === undefined || valor === '') {
    return 'Não informado';
  }

  if (chave === 'valor') {
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  if (chave === 'data') {
    return formatarData(valor);
  }

  if (chave === 'tipo') {
    return valor === 'entrada'
      ? 'Entrada'
      : valor === 'saida'
        ? 'Saída'
        : valor;
  }

  return String(valor);
}

function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [busca, setBusca] = useState('');
  const [operacaoFiltro, setOperacaoFiltro] = useState('todos');
  const [registroExpandido, setRegistroExpandido] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregarAuditoria() {
    try {
      setCarregando(true);
      setErro('');

      const token = localStorage.getItem('token');
      const dados = await apiRequest('/api/auditoria', { token });

      setRegistros(Array.isArray(dados) ? dados : []);
    } catch (error) {
      console.error('Erro ao carregar auditoria:', error);
      setErro(
        error.message ||
          'Não foi possível carregar o histórico de auditoria.'
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAuditoria();
  }, []);

  const registrosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return registros.filter((registro) => {
      const correspondeBusca =
        !termo ||
        String(registro.usuario_nome || '')
          .toLowerCase()
          .includes(termo) ||
        String(registro.movimentacao_id || '').includes(termo);

      const correspondeOperacao =
        operacaoFiltro === 'todos' ||
        registro.operacao === operacaoFiltro;

      return correspondeBusca && correspondeOperacao;
    });
  }, [registros, busca, operacaoFiltro]);

  function alternarDetalhes(id) {
    setRegistroExpandido((atual) => (atual === id ? null : id));
  }

  function renderizarDetalhes(registro) {
    const anteriores = registro.dados_anteriores || {};
    const novos = registro.dados_novos || {};

    if (registro.operacao === 'exclusao') {
      return (
        <div className="rounded-lg border border-red-100 bg-red-50/50 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trash2 size={15} className="text-red-600" />
            <h3 className="text-xs font-semibold text-gray-800">
              Dados da movimentação excluída
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {camposAuditoria.map((campo) => (
              <div key={campo.chave}>
                <p className="text-[10px] font-medium text-gray-500">
                  {campo.label}
                </p>
                <p className="mt-0.5 break-words text-xs font-medium text-gray-800">
                  {formatarValor(campo.chave, anteriores[campo.chave])}
                </p>
              </div>
            ))}
          </div>

          {anteriores.observacao && (
            <div className="mt-3 border-t border-red-100 pt-3">
              <p className="text-[10px] font-medium text-gray-500">
                Observação
              </p>
              <p className="mt-0.5 break-words text-xs text-gray-800">
                {anteriores.observacao}
              </p>
            </div>
          )}
        </div>
      );
    }

    const camposAlterados = camposAuditoria.filter(
      (campo) =>
        String(anteriores[campo.chave] ?? '') !==
        String(novos[campo.chave] ?? '')
    );

    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <Pencil size={15} className="text-[#29458f]" />
          <h3 className="text-xs font-semibold text-gray-800">
            Comparação dos dados alterados
          </h3>
        </div>

        {camposAlterados.length === 0 ? (
          <p className="text-xs text-gray-500">
            Não foram identificadas diferenças nos campos auditados.
          </p>
        ) : (
          <div className="space-y-3">
            {camposAlterados.map((campo) => (
              <div
                key={campo.chave}
                className="grid grid-cols-1 gap-2 border-b border-blue-100 pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_1fr_1fr]"
              >
                <div>
                  <p className="text-[10px] font-medium text-gray-500">
                    Campo alterado
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-800">
                    {campo.label}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-gray-500">
                    Valor anterior
                  </p>
                  <p className="mt-0.5 break-words text-xs text-red-700">
                    {formatarValor(campo.chave, anteriores[campo.chave])}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-gray-500">
                    Novo valor
                  </p>
                  <p className="mt-0.5 break-words text-xs font-medium text-emerald-700">
                    {formatarValor(campo.chave, novos[campo.chave])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-4">
        <header className="mb-4">
          <Link
            to="/pastor/dashboard"
            className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 sm:min-h-0"
          >
            <ArrowLeft size={14} />
            Voltar para dashboard
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#29458f]" />
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl lg:text-2xl">
              Auditoria
            </h1>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Histórico de alterações e exclusões de movimentações financeiras.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por usuário ou ID da movimentação..."
                className="h-11 w-full rounded-md border border-gray-300 pl-9 pr-3 text-xs outline-none focus:border-[#29458f] sm:h-9"
              />
            </div>

            <select
              value={operacaoFiltro}
              onChange={(event) => setOperacaoFiltro(event.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700 outline-none focus:border-[#29458f] sm:h-9 sm:w-auto"
            >
              <option value="todos">Todas as operações</option>
              <option value="edicao">Edições</option>
              <option value="exclusao">Exclusões</option>
            </select>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSearch size={16} className="text-[#29458f]" />
              <h2 className="text-sm font-semibold text-gray-900">
                Registros de auditoria ({registrosFiltrados.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={carregarAuditoria}
              disabled={carregando}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-gray-200 px-3 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 sm:h-8"
            >
              <RefreshCw
                size={13}
                className={carregando ? 'animate-spin' : ''}
              />
              Atualizar
            </button>
          </div>

          {carregando ? (
            <div className="py-12 text-center">
              <RefreshCw
                size={22}
                className="mx-auto mb-2 animate-spin text-[#29458f]"
              />
              <p className="text-xs text-gray-500">
                Carregando histórico...
              </p>
            </div>
          ) : erro ? (
            <div className="py-10 text-center">
              <p className="mb-3 text-sm text-red-600">{erro}</p>
              <button
                type="button"
                onClick={carregarAuditoria}
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#29458f] px-4 text-xs font-medium text-white hover:bg-[#20376f]"
              >
                Tentar novamente
              </button>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-12 text-center">
              <FileSearch
                size={25}
                className="mx-auto mb-2 text-gray-400"
              />
              <p className="text-sm text-gray-500">
                {registros.length === 0
                  ? 'Nenhum registro de auditoria foi encontrado.'
                  : 'Nenhum registro corresponde aos filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-2 font-semibold text-gray-700">
                      Data e horário
                    </th>
                    <th className="px-2 py-2 font-semibold text-gray-700">
                      Usuário
                    </th>
                    <th className="px-2 py-2 font-semibold text-gray-700">
                      Operação
                    </th>
                    <th className="px-2 py-2 font-semibold text-gray-700">
                      Movimentação
                    </th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-700">
                      Detalhes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {registrosFiltrados.map((registro) => {
                    const expandido =
                      registroExpandido === registro.idauditoria;
                    const exclusao = registro.operacao === 'exclusao';

                    return (
                      <Fragment key={registro.idauditoria}>
                        <tr className="border-b border-gray-100">
                          <td className="whitespace-nowrap px-2 py-3 text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Clock size={13} className="text-gray-400" />
                              {formatarDataHora(registro.criado_em)}
                            </div>
                          </td>

                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                <User size={13} />
                              </div>
                              <span className="whitespace-nowrap font-medium text-gray-800">
                                {registro.usuario_nome}
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-3">
                            {exclusao ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
                                <Trash2 size={11} />
                                Exclusão
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                                <Pencil size={11} />
                                Edição
                              </span>
                            )}
                          </td>

                          <td className="px-2 py-3 font-medium text-gray-700">
                            #{registro.movimentacao_id}
                          </td>

                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                alternarDetalhes(registro.idauditoria)
                              }
                              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 sm:min-h-0 sm:min-w-0"
                              aria-label={
                                expandido
                                  ? 'Fechar detalhes do registro'
                                  : 'Ver detalhes do registro'
                              }
                            >
                              {expandido ? (
                                <ChevronUp size={15} />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                              <span>{expandido ? 'Fechar' : 'Ver'}</span>
                            </button>
                          </td>
                        </tr>

                        {expandido && (
                          <tr>
                            <td colSpan={5} className="px-2 py-3">
                              {renderizarDetalhes(registro)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default Auditoria;
