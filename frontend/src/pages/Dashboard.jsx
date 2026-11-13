
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
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Cabeçalho */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight text-black sm:text-4xl">
            Dashboard
          </h1>

          <p className="text-base text-black sm:text-lg">
            Bem-vindo(a), {nomeUsuario}!
          </p>
        </header>

        {/* Erro */}
        {erro && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-base text-red-800">{erro}</p>

            <button
              type="button"
              onClick={carregarMovimentacoes}
              disabled={carregando}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-3 text-base font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw
                size={18}
                className={carregando ? 'animate-spin' : ''}
              />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Ações rápidas */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-black sm:text-2xl">
              Ações rápidas
            </h2>

            <p className="mt-1 text-base text-black">
              Acesse rapidamente as principais funcionalidades.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              label="Nova entrada"
              icon={<PlusCircle size={21} />}
              variant="income"
              onClick={() => navigate('/movimentacoes/nova-entrada')}
            />

            <QuickAction
              label="Nova saída"
              icon={<PlusCircle size={21} />}
              variant="expense"
              onClick={() => navigate('/movimentacoes/nova-saida')}
            />

            <QuickAction
              label="Consultar"
              icon={<Search size={21} />}
              variant="outline"
              onClick={() => navigate('/movimentacoes')}
            />

            <QuickAction
              label="Relatórios"
              icon={<FileText size={21} />}
              variant="outline"
              onClick={() => navigate('/relatorios')}
            />
          </div>
        </section>

        {/* Cards de resumo */}
        <section aria-label="Resumo financeiro">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-black sm:text-2xl">
              Resumo financeiro
            </h2>

            <p className="mt-1 text-base text-black">
              Visão geral das movimentações dos seus grupos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Saldo Atual"
              value={moeda(dados.saldoAtual)}
              description="Todos os grupos vinculados"
              icon={<TrendingUp size={24} />}
              carregando={carregando}
            />

            <SummaryCard
              title="Entradas do Mês"
              value={moeda(dados.entradasMes)}
              description="Receitas do mês atual"
              type="income"
              icon={<ArrowUp size={24} />}
              carregando={carregando}
            />

            <SummaryCard
              title="Saídas do Mês"
              value={moeda(dados.saidasMes)}
              description="Despesas do mês atual"
              type="expense"
              icon={<ArrowDown size={24} />}
              carregando={carregando}
            />

            <SummaryCard
              title="Movimentações"
              value={String(dados.quantidadeMes)}
              description="Registros no mês atual"
              icon={<BarChart3 size={24} />}
              carregando={carregando}
            />
          </div>
        </section>

        {/* Gráficos */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-black sm:text-2xl">
              Visão financeira
            </h2>

            <p className="mt-1 text-base text-black">
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
                      left: 0,
                      bottom: 4,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 14, fill: '#000000' }}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 13, fill: '#000000' }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />

                    <Tooltip
                      formatter={(value) => moeda(value)}
                      contentStyle={{ color: '#000000', fontSize: '14px' }}
                    />

                    <Legend
                      wrapperStyle={{
                        fontSize: '14px',
                        color: '#000000',
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
                      left: 0,
                      bottom: 4,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 14, fill: '#000000' }}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 13, fill: '#000000' }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />

                    <Tooltip
                      formatter={(value) => moeda(value)}
                      contentStyle={{ color: '#000000', fontSize: '14px' }}
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
              <h2 className="text-xl font-semibold text-black sm:text-2xl">
                Últimas movimentações
              </h2>

              <p className="mt-1 text-base text-black">
                Registros financeiros mais recentes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/movimentacoes')}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-3 text-base font-medium text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:self-auto"
            >
              Ver todas
              <Search size={19} />
            </button>
          </div>

          {carregando ? (
            <p className="py-8 text-center text-base text-black">
              Carregando movimentações...
            </p>
          ) : dados.ultimasMovimentacoes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center">
              <BarChart3
                className="mx-auto mb-3 text-black"
                size={32}
              />

              <p className="text-base font-medium text-black">
                Nenhuma movimentação encontrada.
              </p>

              <p className="mt-2 text-sm text-black">
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
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold text-black">
                          {transaction.observacao ||
                            transaction.categoria ||
                            'Movimentação sem descrição'}
                        </p>

                        <p className="mt-2 text-sm text-black">
                          {formatarData(transaction.data)}
                        </p>
                      </div>

                      <TipoBadge tipo={transaction.tipo} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-black">
                          Evento
                        </p>

                        <p className="break-words text-base text-black">
                          {transaction.evento || '-'}
                        </p>

                        <p className="mt-2 text-sm text-black">
                          Grupo: {transaction.grupo || '-'}
                        </p>
                      </div>

                      <p
                        className={`text-lg font-semibold ${
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
                <table className="w-full min-w-[700px] border-collapse text-left text-base">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm uppercase tracking-wide text-black">
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
                        className="border-b border-gray-200 last:border-0 hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-black">
                          {formatarData(transaction.data)}
                        </td>

                        <td className="px-3 py-4">
                          <TipoBadge tipo={transaction.tipo} />
                        </td>

                        <td className="px-3 py-4 text-black">
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

                        <td className="px-3 py-4 text-black">
                          {transaction.evento || '-'}
                        </td>

                        <td className="px-3 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => navigate('/movimentacoes')}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-black transition hover:bg-gray-100 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                            aria-label="Consultar movimentações"
                            title="Consultar movimentações"
                          >
                            <Search size={19} />
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
      value: 'text-black',
      icon: 'bg-blue-50 text-blue-700',
    },
    income: {
      value: 'text-emerald-700',
      icon: 'bg-emerald-50 text-emerald-700',
    },
    expense: {
      value: 'text-red-700',
      icon: 'bg-red-50 text-red-700',
    },
  };

  return (
    <article className="flex min-h-36 items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-black">
          {title}
        </h3>

        <p
          className={`mt-3 break-words text-2xl font-bold sm:text-3xl ${styles[type].value}`}
        >
          {carregando ? '...' : value}
        </p>

        <p className="mt-2 text-sm text-black">
          {description}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles[type].icon}`}
      >
        {icon}
      </div>
    </article>
  );
}

function QuickAction({ label, icon, variant, onClick }) {
  const styles = {
    income:
      'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700',
    expense:
      'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700',
    outline:
      'border border-gray-400 bg-white text-black hover:bg-gray-50 focus-visible:ring-blue-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles[variant]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ChartCard({ title, children }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-lg font-semibold text-black">
        {title}
      </h3>

      <div className="h-64 min-w-0 w-full sm:h-72">
        {children}
      </div>
    </article>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center text-base text-black">
      Carregando gráfico...
    </div>
  );
}

function TipoBadge({ tipo }) {
  const entrada = tipo === 'entrada';

  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
        entrada
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      {entrada ? 'Entrada' : 'Saída'}
    </span>
  );
}

export default Dashboard;
