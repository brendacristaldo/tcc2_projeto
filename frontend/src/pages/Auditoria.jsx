
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
        <div className="rounded-lg border border-red-100 bg-red-50/50 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trash2 size={19} className="text-red-600" />
            <h3 className="text-lg font-semibold text-black">
              Dados da movimentação excluída
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {camposAuditoria.map((campo) => (
              <div key={campo.chave}>
                <p className="text-sm font-semibold text-black">
                  {campo.label}
                </p>
                <p className="mt-1 break-words text-base font-medium text-black">
                  {formatarValor(campo.chave, anteriores[campo.chave])}
                </p>
              </div>
            ))}
          </div>

          {anteriores.observacao && (
            <div className="mt-4 border-t border-red-100 pt-4">
              <p className="text-sm font-semibold text-black">
                Observação
              </p>
              <p className="mt-1 break-words text-base text-black">
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
      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Pencil size={19} className="text-[#29458f]" />
          <h3 className="text-lg font-semibold text-black">
            Comparação dos dados alterados
          </h3>
        </div>

        {camposAlterados.length === 0 ? (
          <p className="text-base text-black">
            Não foram identificadas diferenças nos campos auditados.
          </p>
        ) : (
          <div className="space-y-4">
            {camposAlterados.map((campo) => (
              <div
                key={campo.chave}
                className="grid grid-cols-1 gap-3 border-b border-blue-100 pb-4 last:border-0 last:pb-0 sm:grid-cols-[1fr_1fr_1fr]"
              >
                <div>
                  <p className="text-sm font-semibold text-black">
                    Campo alterado
                  </p>
                  <p className="mt-1 text-base font-semibold text-black">
                    {campo.label}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-black">
                    Valor anterior
                  </p>
                  <p className="mt-1 break-words text-base text-red-700">
                    {formatarValor(campo.chave, anteriores[campo.chave])}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-black">
                    Novo valor
                  </p>
                  <p className="mt-1 break-words text-base font-medium text-emerald-700">
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
        <header className="mb-5">
          <Link
            to="/pastor/dashboard"
            className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold text-[#29458f] transition hover:bg-blue-50"
>
            <ArrowLeft size={18} />
            Voltar ao Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <ShieldCheck size={26} className="text-[#29458f]" />
            <h1 className="text-2xl font-bold text-black sm:text-3xl">
              Auditoria
            </h1>
          </div>

          <p className="mt-2 text-sm text-black sm:text-base">
            Histórico de alterações e exclusões de movimentações financeiras.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-3 sm:p-5">
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
              />
              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por usuário ou ID da movimentação..."
                className="h-12 w-full rounded-md border border-gray-300 pl-10 pr-3 text-sm text-black placeholder:text-black outline-none focus:border-[#29458f] sm:text-base"
              />
            </div>

            <select
              value={operacaoFiltro}
              onChange={(event) => setOperacaoFiltro(event.target.value)}
              className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-[#29458f] sm:w-auto sm:text-base"
            >
              <option value="todos">Todas as operações</option>
              <option value="edicao">Edições</option>
              <option value="exclusao">Exclusões</option>
            </select>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSearch size={21} className="text-[#29458f]" />
              <h2 className="text-lg font-semibold text-black sm:text-xl">
                Registros de auditoria ({registrosFiltrados.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={carregarAuditoria}
              disabled={carregando}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-semibold text-black transition hover:bg-gray-50 disabled:opacity-50 sm:text-base"
            >
              <RefreshCw
                size={17}
                className={carregando ? 'animate-spin' : ''}
              />
              Atualizar
            </button>
          </div>

          {carregando ? (
            <div className="py-12 text-center">
              <RefreshCw
                size={27}
                className="mx-auto mb-3 animate-spin text-[#29458f]"
              />
              <p className="text-base text-black">
                Carregando histórico...
              </p>
            </div>
          ) : erro ? (
            <div className="py-10 text-center">
              <p className="mb-4 text-base text-red-600">{erro}</p>
              <button
                type="button"
                onClick={carregarAuditoria}
                className="inline-flex h-12 items-center justify-center rounded-md bg-[#29458f] px-5 text-base font-semibold text-white hover:bg-[#20376f]"
              >
                Tentar novamente
              </button>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-12 text-center">
              <FileSearch
                size={28}
                className="mx-auto mb-3 text-black"
              />
              <p className="text-base text-black">
                {registros.length === 0
                  ? 'Nenhum registro de auditoria foi encontrado.'
                  : 'Nenhum registro corresponde aos filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-3 font-semibold text-black">
                      Data e horário
                    </th>
                    <th className="px-3 py-3 font-semibold text-black">
                      Usuário
                    </th>
                    <th className="px-3 py-3 font-semibold text-black">
                      Operação
                    </th>
                    <th className="px-3 py-3 font-semibold text-black">
                      Movimentação
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-black">
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
                          <td className="whitespace-nowrap px-3 py-4 text-black">
                            <div className="flex items-center gap-2">
                              <Clock size={17} className="text-black" />
                              {formatarDataHora(registro.criado_em)}
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-black">
                                <User size={17} />
                              </div>
                              <span className="whitespace-nowrap font-semibold text-black">
                                {registro.usuario_nome}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            {exclusao ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                                <Trash2 size={15} />
                                Exclusão
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                                <Pencil size={15} />
                                Edição
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-4 font-semibold text-black">
                            #{registro.movimentacao_id}
                          </td>

                          <td className="px-3 py-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                alternarDetalhes(registro.idauditoria)
                              }
                              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md p-2 text-base font-medium text-black transition hover:bg-gray-100"
                              aria-label={
                                expandido
                                  ? 'Fechar detalhes do registro'
                                  : 'Ver detalhes do registro'
                              }
                            >
                              {expandido ? (
                                <ChevronUp size={19} />
                              ) : (
                                <ChevronDown size={19} />
                              )}
                              <span>{expandido ? 'Fechar' : 'Ver'}</span>
                            </button>
                          </td>
                        </tr>

                        {expandido && (
                          <tr>
                            <td colSpan={5} className="px-3 py-4">
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
