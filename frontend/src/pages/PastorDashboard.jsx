
import { useEffect, useState } from 'react';

import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarDays,
  Users,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor) || 0);
};

const formatarData = (data) => {
  if (!data) return '';

  const [ano, mes, dia] = String(data).split('T')[0].split('-');

  return `${dia}/${mes}/${ano}`;
};

const formatarMes = (mes) => {
  if (!mes) return '';

  const [ano, numeroMes] = mes.split('-');

  const data = new Date(
    Number(ano),
    Number(numeroMes) - 1,
    1
  );

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
  })
    .format(data)
    .replace('.', '');
};

function PastorDashboard() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregarDashboard() {
      try {
        setCarregando(true);
        setErro('');

        const token = localStorage.getItem('token');

        const resposta = await apiRequest(
          '/api/dashboard/pastor',
          { token }
        );

        if (ativo) {
          setDados(resposta);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error.message ||
              'Não foi possível carregar os dados do dashboard.'
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDashboard();

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const resumo = [
    {
      titulo: 'Saldo Geral',
      valor: formatarMoeda(dados?.resumo?.saldo_geral),
      descricao: 'Saldo consolidado',
      icon: BarChart3,
      tipo: 'saldo',
    },
    {
      titulo: 'Entradas',
      valor: formatarMoeda(dados?.resumo?.entradas_mes),
      descricao: 'No mês atual',
      icon: ArrowUpCircle,
      tipo: 'entrada',
    },
    {
      titulo: 'Saídas',
      valor: formatarMoeda(dados?.resumo?.saidas_mes),
      descricao: 'No mês atual',
      icon: ArrowDownCircle,
      tipo: 'saida',
    },
    {
      titulo: 'Grupos',
      valor: Number(
        dados?.resumo?.total_grupos_ativos || 0
      ).toString(),
      descricao: 'Grupos ativos',
      icon: Users,
      tipo: 'grupos',
    },
  ];

  const dadosMensais = (dados?.dadosMensais || []).map(
    (item) => ({
      mes: formatarMes(item.mes),
      entradas: Number(item.entradas) || 0,
      saidas: Number(item.saidas) || 0,
    })
  );

  const grupos = dados?.grupos || [];
  const eventos = dados?.eventos || [];

  const iconClasses = {
    saldo: 'bg-blue-50 text-[#29458f]',
    entrada: 'bg-emerald-50 text-emerald-600',
    saida: 'bg-red-50 text-red-600',
    grupos: 'bg-gray-100 text-black',
  };

  if (carregando) {
    return (
      <Layout>
        <div className="p-4 sm:p-5">
          <header className="mb-5">
            <h1 className="text-3xl font-semibold text-black sm:text-4xl">
              Dashboard do Pastor
            </h1>

            <p className="mt-2 text-lg text-black">
              Carregando informações financeiras da igreja...
            </p>
          </header>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
              />
            ))}
          </div>

          <div className="mt-5 h-[300px] animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      </Layout>
    );
  }

  if (erro) {
    return (
      <Layout>
        <div className="p-4 sm:p-5">
          <header className="mb-5">
            <h1 className="text-3xl font-semibold text-black sm:text-4xl">
              Dashboard do Pastor
            </h1>
          </header>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={24}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-lg font-semibold text-red-800">
                  Não foi possível carregar o dashboard
                </p>

                <p className="mt-2 text-base text-red-800">
                  {erro}
                </p>

                <button
                  type="button"
                  onClick={() => setTentativa((valor) => valor + 1)}
                  className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-base font-semibold text-white transition hover:bg-red-800"
                >
                  <RefreshCw size={18} />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-5">
        <header className="mb-5">
          <h1 className="text-3xl font-semibold text-black sm:text-4xl">
            Dashboard do Pastor
          </h1>

          <p className="mt-2 text-lg text-black">
            Visão geral da situação financeira da igreja.
          </p>
        </header>

        {/* Cards de resumo */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {resumo.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.titulo}
                className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${iconClasses[item.tipo]}`}
                  >
                    <Icon size={21} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-medium text-black">
                      {item.titulo}
                    </p>

                    <p className="mt-1 text-2xl font-semibold text-black">
                      {item.valor}
                    </p>

                    <p className="mt-1 text-sm text-black">
                      {item.descricao}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Gráfico */}
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3
              size={22}
              className="text-[#29458f]"
            />

            <h2 className="text-xl font-semibold text-black">
              Entradas x Saídas
            </h2>
          </div>

          {dadosMensais.length > 0 ? (
            <div className="h-[300px] w-full sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosMensais}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 15, fill: '#000000' }}
                  />

                  <YAxis
                    tick={{ fontSize: 14, fill: '#000000' }}
                  />

                  <Tooltip
                    formatter={(value) => formatarMoeda(value)}
                    contentStyle={{ color: '#000000', fontSize: '16px' }}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: '16px',
                      color: '#000000',
                    }}
                  />

                  <Bar
                    dataKey="entradas"
                    name="Entradas"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                  />

                  <Bar
                    dataKey="saidas"
                    name="Saídas"
                    fill="#ef4444"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-lg text-black">
              Não há dados de movimentações para exibir.
            </p>
          )}
        </section>

        {/* Grupos e eventos */}
        <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Saldo por grupo */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users
                size={22}
                className="text-[#29458f]"
              />

              <h2 className="text-xl font-semibold text-black">
                Saldo por Grupo
              </h2>
            </div>

            {grupos.length > 0 ? (
              <div className="space-y-4">
                {grupos.map((grupo) => (
                  <div
                    key={grupo.idgrupo}
                    className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-lg text-black">
                        {grupo.nome}
                      </span>

                      {grupo.ativo === false && (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-sm text-black">
                          Inativo
                        </span>
                      )}
                    </div>

                    <span className="shrink-0 text-lg font-semibold text-black">
                      {formatarMoeda(grupo.saldo)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-lg text-black">
                Nenhum grupo cadastrado.
              </p>
            )}
          </div>

          {/* Próximos eventos */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays
                size={22}
                className="text-[#29458f]"
              />

              <h2 className="text-xl font-semibold text-black">
                Próximos Eventos
              </h2>
            </div>

            {eventos.length > 0 ? (
              <div className="space-y-4">
                {eventos.map((evento) => {
                  const dataInicio = formatarData(
                    evento.data_inicio
                  );

                  const dataFim = evento.data_fim
                    ? formatarData(evento.data_fim)
                    : '';

                  const periodo =
                    dataFim && dataFim !== dataInicio
                      ? `${dataInicio} - ${dataFim}`
                      : dataInicio;

                  return (
                    <div
                      key={evento.idevento}
                      className="border-b border-gray-200 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-lg font-medium text-black">
                          {evento.nome}
                        </p>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${
                            evento.status === 'Em andamento'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {evento.status}
                        </span>
                      </div>

                      <p className="mt-2 text-base text-black">
                        {periodo}
                        {evento.grupo_nome
                          ? ` • ${evento.grupo_nome}`
                          : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-lg text-black">
                Não há próximos eventos cadastrados.
              </p>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default PastorDashboard;
