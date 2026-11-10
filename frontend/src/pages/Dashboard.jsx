
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  FileText,
  PlusCircle,
  Search,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Layout from '../components/Layout';
import { useAuth } from '../components/RotaProtegida';
import { apiRequest } from '../services/api';

const moeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

function converterData(data) {
  if (!data) return null;

  const valor = String(data).slice(0, 10);
  const partes = valor.split('-');

  if (partes.length !== 3) return null;

  const [ano, mes, dia] = partes.map(Number);

  if (!ano || !mes || !dia) return null;

  return { ano, mes, dia };
}

function formatarData(data) {
  const partes = converterData(data);

  if (!partes) return '-';

  return [
    String(partes.dia).padStart(2, '0'),
    String(partes.mes).padStart(2, '0'),
    partes.ano,
  ].join('/');
}

function obterMesChave(data) {
  const partes = converterData(data);

  if (!partes) return null;

  return partes.ano * 12 + partes.mes - 1;
}

function Dashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const nomeUsuario = usuario?.nome?.split(' ')[0] || 'usuário';

  async function carregarMovimentacoes() {
    try {
      setCarregando(true);
      setErro('');

      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      const resposta = await apiRequest('/api/movimentacoes', {
        token,
      });

      setMovimentacoes(resposta.movimentacoes || []);
    } catch (error) {
      setErro(
        error.message ||
          'Não foi possível carregar os dados financeiros.'
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function buscarDados() {
      try {
        setCarregando(true);
        setErro('');

        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('Sessão não encontrada. Faça login novamente.');
        }

        const resposta = await apiRequest('/api/movimentacoes', {
          token,
        });

        if (ativo) {
          setMovimentacoes(resposta.movimentacoes || []);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error.message ||
              'Não foi possível carregar os dados financeiros.'
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    buscarDados();

    return () => {
      ativo = false;
    };
  }, []);

  const dados = useMemo(() => {
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;

    const mesChaveAtual = anoAtual * 12 + mesAtual - 1;
    const inicioGrafico = mesChaveAtual - 5;

    const registros = movimentacoes.map((movimentacao) => ({
      ...movimentacao,
      valorNumerico: Number(movimentacao.valor) || 0,
      mesChave: obterMesChave(movimentacao.data),
    }));

    const entradasTotais = registros
      .filter((item) => item.tipo === 'entrada')
      .reduce((total, item) => total + item.valorNumerico, 0);

    const saidasTotais = registros
      .filter((item) => item.tipo === 'saida')
      .reduce((total, item) => total + item.valorNumerico, 0);

    const movimentacoesMes = registros.filter((item) => {
      const partes = converterData(item.data);

      return (
        partes &&
        partes.ano === anoAtual &&
        partes.mes === mesAtual
      );
    });

    const entradasMes = movimentacoesMes
      .filter((item) => item.tipo === 'entrada')
      .reduce((total, item) => total + item.valorNumerico, 0);

    const saidasMes = movimentacoesMes
      .filter((item) => item.tipo === 'saida')
      .reduce((total, item) => total + item.valorNumerico, 0);

    const meses = [];

    const nomesMeses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    for (let chave = inicioGrafico; chave <= mesChaveAtual; chave++) {
      const ano = Math.floor(chave / 12);
      const mes = (chave % 12) + 1;

      meses.push({
        chave,
        ano,
        mes,
        month: nomesMeses[mes - 1],
        entradas: 0,
        saidas: 0,
      });
    }

    const mapaMeses = new Map(
      meses.map((mes) => [mes.chave, mes])
    );

    registros.forEach((item) => {
      const mes = mapaMeses.get(item.mesChave);

      if (!mes) return;

      if (item.tipo === 'entrada') {
        mes.entradas += item.valorNumerico;
      } else if (item.tipo === 'saida') {
        mes.saidas += item.valorNumerico;
      }
    });

    // Saldo acumulado anterior ao primeiro mês exibido.
    let saldoAcumulado = registros
      .filter(
        (item) =>
          item.mesChave !== null &&
          item.mesChave < inicioGrafico
      )
      .reduce((total, item) => {
        if (item.tipo === 'entrada') {
          return total + item.valorNumerico;
        }

        if (item.tipo === 'saida') {
          return total - item.valorNumerico;
        }

        return total;
      }, 0);

    const evolucaoSaldo = meses.map((mes) => {
      saldoAcumulado += mes.entradas - mes.saidas;

      return {
        month: mes.month,
        saldo: saldoAcumulado,
      };
    });

    const ultimasMovimentacoes = [...registros]
      .sort((a, b) => {
        const dataA = String(a.data || '');
        const dataB = String(b.data || '');

        if (dataA !== dataB) {
          return dataB.localeCompare(dataA);
        }

        return (
          Number(b.idmovimentacao || 0) -
          Number(a.idmovimentacao || 0)
        );
      })
      .slice(0, 5);

    return {
      saldoAtual: entradasTotais - saidasTotais,
      entradasMes,
      saidasMes,
      quantidadeMes: movimentacoesMes.length,
      graficoMensal: meses,
      evolucaoSaldo,
      ultimasMovimentacoes,
    };
  }, [movimentacoes]);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
        {/* Cabeçalho */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
            Dashboard
          </h1>

          <p className="text-sm text-gray-600 sm:text-base">
            Bem-vindo(a), {nomeUsuario}!
          </p>
        </header>

        {/* Erro */}
        {erro && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-800">{erro}</p>

            <button
              type="button"
              onClick={carregarMovimentacoes}
              disabled={carregando}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw
                size={16}
                className={carregando ? 'animate-spin' : ''}
              />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Cards de resumo */}
        <section aria-label="Resumo financeiro">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Resumo financeiro
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Visão geral das movimentações dos seus grupos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Saldo Atual"
              value={moeda(dados.saldoAtual)}
              description="Todos os grupos vinculados"
              icon={<TrendingUp size={22} />}
              carregando={carregando}
            />

            <SummaryCard
              title="Entradas do Mês"
              value={moeda(dados.entradasMes)}
              description="Receitas do mês atual"
              type="income"
              icon={<ArrowUp size={22} />}
              carregando={carregando}
            />

            <SummaryCard
              title="Saídas do Mês"
              value={moeda(dados.saidasMes)}
              description="Despesas do mês atual"
              type="expense"
              icon={<ArrowDown size={22} />}
              carregando={carregando}
            />

            <SummaryCard
              title="Movimentações"
              value={String(dados.quantidadeMes)}
              description="Registros no mês atual"
              icon={<BarChart3 size={22} />}
              carregando={carregando}
            />
          </div>
        </section>

        {/* Ações rápidas */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Ações rápidas
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Acesse rapidamente as principais funcionalidades.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              label="Nova entrada"
              icon={<PlusCircle size={19} />}
              variant="income"
              onClick={() => navigate('/movimentacoes/nova-entrada')}
            />

            <QuickAction
              label="Nova saída"
              icon={<PlusCircle size={19} />}
              variant="expense"
              onClick={() => navigate('/movimentacoes/nova-saida')}
            />

            <QuickAction
              label="Consultar"
              icon={<Search size={19} />}
              variant="outline"
              onClick={() => navigate('/movimentacoes')}
            />

            <QuickAction
              label="Relatórios"
              icon={<FileText size={19} />}
              variant="outline"
              onClick={() => navigate('/relatorios')}
            />
          </div>
        </section>

        {/* Gráficos */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Visão financeira
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Comparativo e evolução dos últimos seis meses.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Entradas x Saídas">
              {carregando ? (
                <ChartLoading />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dados.graficoMensal}
                    margin={{
                      top: 8,
                      right: 8,
                      left: -12,
                      bottom: 4,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />

                    <Tooltip
                      formatter={(value) => moeda(value)}
                    />

                    <Legend
                      wrapperStyle={{
                        fontSize: '12px',
                        paddingTop: '8px',
                      }}
                    />

                    <Bar
                      dataKey="entradas"
                      name="Entradas"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="saidas"
                      name="Saídas"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Evolução Financeira">
              {carregando ? (
                <ChartLoading />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dados.evolucaoSaldo}
                    margin={{
                      top: 8,
                      right: 12,
                      left: -12,
                      bottom: 4,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />

                    <Tooltip
                      formatter={(value) => moeda(value)}
                    />

                    <Line
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </section>

        {/* Últimas movimentações */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Últimas movimentações
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Registros financeiros mais recentes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/movimentacoes')}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:self-auto"
            >
              Ver todas
              <Search size={17} />
            </button>
          </div>

          {carregando ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Carregando movimentações...
            </p>
          ) : dados.ultimasMovimentacoes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center">
              <BarChart3
                className="mx-auto mb-3 text-gray-400"
                size={30}
              />

              <p className="text-sm font-medium text-gray-700">
                Nenhuma movimentação encontrada.
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Quando houver registros, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <>
              {/* Visualização mobile */}
              <div className="space-y-3 md:hidden">
                {dados.ultimasMovimentacoes.map((transaction) => (
                  <article
                    key={transaction.idmovimentacao}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-gray-900">
                          {transaction.observacao ||
                            transaction.categoria ||
                            'Movimentação sem descrição'}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatarData(transaction.data)}
                        </p>
                      </div>

                      <TipoBadge tipo={transaction.tipo} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Evento</p>

                        <p className="break-words text-sm text-gray-700">
                          {transaction.evento || '-'}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Grupo: {transaction.grupo || '-'}
                        </p>
                      </div>

                      <p
                        className={`text-base font-semibold ${
                          transaction.tipo === 'entrada'
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {moeda(transaction.valorNumerico)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {/* Visualização desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3 font-semibold">Data</th>
                      <th className="px-3 py-3 font-semibold">Tipo</th>
                      <th className="px-3 py-3 font-semibold">Descrição</th>
                      <th className="px-3 py-3 font-semibold">Valor</th>
                      <th className="px-3 py-3 font-semibold">Evento</th>
                      <th className="px-3 py-3 text-center font-semibold">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dados.ultimasMovimentacoes.map((transaction) => (
                      <tr
                        key={transaction.idmovimentacao}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-gray-700">
                          {formatarData(transaction.data)}
                        </td>

                        <td className="px-3 py-4">
                          <TipoBadge tipo={transaction.tipo} />
                        </td>

                        <td className="px-3 py-4 text-gray-700">
                          {transaction.observacao ||
                            transaction.categoria ||
                            'Sem descrição'}
                        </td>

                        <td
                          className={`whitespace-nowrap px-3 py-4 font-semibold ${
                            transaction.tipo === 'entrada'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        >
                          {moeda(transaction.valorNumerico)}
                        </td>

                        <td className="px-3 py-4 text-gray-700">
                          {transaction.evento || '-'}
                        </td>

                        <td className="px-3 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => navigate('/movimentacoes')}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                            aria-label="Consultar movimentações"
                            title="Consultar movimentações"
                          >
                            <Search size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  type = 'default',
  carregando,
}) {
  const styles = {
    default: {
      value: 'text-gray-900',
      icon: 'bg-blue-50 text-blue-600',
    },
    income: {
      value: 'text-emerald-600',
      icon: 'bg-emerald-50 text-emerald-600',
    },
    expense: {
      value: 'text-red-600',
      icon: 'bg-red-50 text-red-600',
    },
  };

  return (
    <article className="flex min-h-32 items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-gray-600">
          {title}
        </h3>

        <p
          className={`mt-3 break-words text-xl font-bold sm:text-2xl ${styles[type].value}`}
        >
          {carregando ? '...' : value}
        </p>

        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          {description}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[type].icon}`}
      >
        {icon}
      </div>
    </article>
  );
}

function QuickAction({ label, icon, variant, onClick }) {
  const styles = {
    income:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600',
    expense:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
    outline:
      'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-blue-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles[variant]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ChartCard({ title, children }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-base font-semibold text-gray-900">
        {title}
      </h3>

      <div className="h-60 min-w-0 w-full sm:h-72">
        {children}
      </div>
    </article>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-500">
      Carregando gráfico...
    </div>
  );
}

function TipoBadge({ tipo }) {
  const entrada = tipo === 'entrada';

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        entrada
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {entrada ? 'Entrada' : 'Saída'}
    </span>
  );
}

export default Dashboard;
