
import { useEffect, useState } from 'react';

import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  FileText,
  Save,
  Upload,
  X,
} from 'lucide-react';

import { Link, useNavigate } from 'react-router';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function NovaEntrada() {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [eventos, setEventos] = useState([]);

  // Dados do formulário
  const [valor, setValor] = useState('');
  const [observacao, setObservacao] = useState('');
  const [data, setData] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState('');

  // Comprovante
  const [comprovante, setComprovante] = useState(null);
  const [erroComprovante, setErroComprovante] = useState('');

  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState('');
  const [erroEventos, setErroEventos] = useState('');
  const [erroCadastro, setErroCadastro] = useState('');

  // Carrega categorias, formas de pagamento e grupos
  useEffect(() => {
    async function carregarOpcoes() {
      try {
        const token = localStorage.getItem('token');

        const [respostaOpcoes, respostaGrupos] = await Promise.all([
          apiRequest('/api/movimentacoes/opcoes', { token }),
          apiRequest('/api/grupos/meus', { token }),
        ]);

        setCategorias(respostaOpcoes.categorias);
        setFormasPagamento(respostaOpcoes.formasPagamento);
        setGrupos(respostaGrupos.grupos);
      } catch (error) {
        setErro(error.message);
      } finally {
        setCarregandoOpcoes(false);
      }
    }

    carregarOpcoes();
  }, []);

  // Carrega eventos ativos do grupo selecionado
  useEffect(() => {
    let ativo = true;

    async function carregarEventos() {
      if (!grupoSelecionado) {
        setEventos([]);
        setEventoSelecionado('');
        setErroEventos('');
        setCarregandoEventos(false);
        return;
      }

      try {
        setCarregandoEventos(true);
        setErroEventos('');
        setEventos([]);

        const token = localStorage.getItem('token');

        const resposta = await apiRequest(
          `/api/eventos?grupo_id=${grupoSelecionado}`,
          { token }
        );

        if (ativo) {
          setEventos(resposta.eventos);
        }
      } catch (error) {
        if (ativo) {
          setErroEventos(error.message);
          setEventos([]);
        }
      } finally {
        if (ativo) {
          setCarregandoEventos(false);
        }
      }
    }

    carregarEventos();

    return () => {
      ativo = false;
    };
  }, [grupoSelecionado]);

  // Atualiza o grupo e limpa o evento selecionado
  const handleGrupoChange = (event) => {
    setGrupoSelecionado(event.target.value);
    setEventoSelecionado('');
  };

  // Valida e seleciona o comprovante
  const handleComprovanteChange = (event) => {
    const arquivo = event.target.files?.[0];

    setErroComprovante('');

    if (!arquivo) {
      setComprovante(null);
      return;
    }

    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setComprovante(null);
      event.target.value = '';
      setErroComprovante('Formato inválido. Selecione um PDF, JPG ou PNG.');
      return;
    }

    const tamanhoMaximo = 5 * 1024 * 1024;

    if (arquivo.size > tamanhoMaximo) {
      setComprovante(null);
      event.target.value = '';
      setErroComprovante('O comprovante deve ter no máximo 5 MB.');
      return;
    }

    setComprovante(arquivo);
  };

  // Remove o comprovante selecionado
  const removerComprovante = () => {
    setComprovante(null);
    setErroComprovante('');

    const campoArquivo = document.getElementById('comprovante');

    if (campoArquivo) {
      campoArquivo.value = '';
    }
  };

  // Envia a entrada para o backend
  const handleSubmit = async (event) => {
    event.preventDefault();

    setErroCadastro('');

    if (erroComprovante) {
      return;
    }

    setSalvando(true);

    try {
      const token = localStorage.getItem('token');

      const dadosEntrada = new FormData();

      dadosEntrada.append('valor', Number(valor));
      dadosEntrada.append('observacao', observacao.trim());
      dadosEntrada.append('data', data);
      dadosEntrada.append('grupo_id', Number(grupoSelecionado));
      dadosEntrada.append('categoria_id', Number(categoriaSelecionada));
      dadosEntrada.append(
        'forma_pagamento_id',
        Number(formaPagamentoSelecionada)
      );

      if (eventoSelecionado) {
        dadosEntrada.append('evento_id', Number(eventoSelecionado));
      }

      if (comprovante) {
        dadosEntrada.append('comprovante', comprovante);
      }

      await apiRequest('/api/movimentacoes/entradas', {
        method: 'POST',
        body: dadosEntrada,
        token,
      });

      navigate('/movimentacoes');
    } catch (error) {
      setErroCadastro(error.message);
    } finally {
      setSalvando(false);
    }
  };

  const classeCampo =
    'min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70';

  const classeLabel =
    'mb-2 block text-sm font-medium text-gray-700';

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl p-3 sm:p-5 lg:p-6">
        {/* Cabeçalho */}
        <header className="mb-5 sm:mb-6">
          <Link
            to="/movimentacoes"
            className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#29458f] transition hover:bg-blue-50"
          >
            <ArrowLeft size={18} />
            Voltar para movimentações
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Nova Entrada
          </h1>

          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Cadastre uma nova entrada financeira.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Dados da entrada */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <DollarSign size={21} className="text-[#29458f]" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Dados da Entrada
                </h2>
                <p className="text-sm text-gray-500">
                  Preencha as informações da movimentação.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
              {/* Observação */}
              <div className="sm:col-span-2">
                <label htmlFor="observacao" className={classeLabel}>
                  Observação
                </label>

                <input
                  id="observacao"
                  type="text"
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  placeholder="Ex.: Oferta especial do culto"
                  required
                  className={classeCampo}
                />
              </div>

              {/* Valor */}
              <div>
                <label htmlFor="valor" className={classeLabel}>
                  Valor
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    R$
                  </span>

                  <input
                    id="valor"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={valor}
                    onChange={(event) => setValor(event.target.value)}
                    placeholder="0,00"
                    required
                    className={`${classeCampo} pl-10`}
                  />
                </div>
              </div>

              {/* Data */}
              <div>
                <label htmlFor="data" className={classeLabel}>
                  Data
                </label>

                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    id="data"
                    type="date"
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                    required
                    className={`${classeCampo} pl-10`}
                  />
                </div>
              </div>

              {/* Grupo */}
              <div>
                <label htmlFor="grupo" className={classeLabel}>
                  Grupo
                </label>

                <select
                  id="grupo"
                  value={grupoSelecionado}
                  onChange={handleGrupoChange}
                  required
                  disabled={carregandoOpcoes || !!erro}
                  className={classeCampo}
                >
                  <option value="">
                    {carregandoOpcoes
                      ? 'Carregando grupos...'
                      : 'Selecione um grupo'}
                  </option>

                  {grupos.map((grupo) => (
                    <option key={grupo.idgrupo} value={grupo.idgrupo}>
                      {grupo.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label htmlFor="categoria" className={classeLabel}>
                  Categoria
                </label>

                <select
                  id="categoria"
                  value={categoriaSelecionada}
                  onChange={(event) =>
                    setCategoriaSelecionada(event.target.value)
                  }
                  required
                  disabled={carregandoOpcoes || !!erro}
                  className={classeCampo}
                >
                  <option value="">
                    {carregandoOpcoes
                      ? 'Carregando categorias...'
                      : 'Selecione uma categoria'}
                  </option>

                  {categorias.map((categoria) => (
                    <option
                      key={categoria.idcategoria}
                      value={categoria.idcategoria}
                    >
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label htmlFor="formaPagamento" className={classeLabel}>
                  Forma de pagamento
                </label>

                <select
                  id="formaPagamento"
                  value={formaPagamentoSelecionada}
                  onChange={(event) =>
                    setFormaPagamentoSelecionada(event.target.value)
                  }
                  required
                  disabled={carregandoOpcoes || !!erro}
                  className={classeCampo}
                >
                  <option value="">
                    {carregandoOpcoes
                      ? 'Carregando formas de pagamento...'
                      : 'Selecione uma forma de pagamento'}
                  </option>

                  {formasPagamento.map((forma) => (
                    <option
                      key={forma.idforma_pagamento}
                      value={forma.idforma_pagamento}
                    >
                      {forma.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Evento */}
              <div>
                <label htmlFor="evento" className={classeLabel}>
                  Evento
                  <span className="ml-1 font-normal text-gray-400">
                    (opcional)
                  </span>
                </label>

                <select
                  id="evento"
                  value={eventoSelecionado}
                  onChange={(event) =>
                    setEventoSelecionado(event.target.value)
                  }
                  disabled={
                    !grupoSelecionado ||
                    carregandoEventos ||
                    !!erroEventos
                  }
                  className={classeCampo}
                >
                  <option value="">
                    {!grupoSelecionado
                      ? 'Selecione um grupo primeiro'
                      : carregandoEventos
                        ? 'Carregando eventos...'
                        : 'Nenhum evento'}
                  </option>

                  {eventos.map((evento) => (
                    <option key={evento.idevento} value={evento.idevento}>
                      {evento.nome}
                    </option>
                  ))}
                </select>

                {erroEventos && (
                  <p className="mt-2 text-sm text-red-600">
                    Não foi possível carregar os eventos: {erroEventos}
                  </p>
                )}
              </div>
            </div>

            {/* Mensagens de erro */}
            {erro && (
              <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Não foi possível carregar as opções: {erro}
              </p>
            )}

            {erroCadastro && (
              <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Não foi possível cadastrar a entrada: {erroCadastro}
              </p>
            )}
          </section>

          {/* Comprovante */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <FileText size={21} className="text-[#29458f]" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Comprovante
                </h2>
                <p className="text-sm text-gray-500">
                  Anexe um documento, se necessário.
                </p>
              </div>
            </div>

            <label
              htmlFor="comprovante"
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-[#29458f] hover:bg-blue-50"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Upload size={23} className="text-[#29458f]" />
              </div>

              <span className="text-sm font-semibold text-gray-800">
                {comprovante
                  ? 'Alterar comprovante'
                  : 'Toque para anexar um comprovante'}
              </span>

              <span className="mt-2 text-xs text-gray-500 sm:text-sm">
                PDF, JPG ou PNG — máximo de 5 MB
              </span>

              <input
                id="comprovante"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleComprovanteChange}
                className="sr-only"
              />
            </label>

            {comprovante && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText
                    size={22}
                    className="shrink-0 text-[#29458f]"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {comprovante.name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {(comprovante.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={removerComprovante}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                  title="Remover comprovante"
                  aria-label="Remover comprovante"
                >
                  <X size={19} />
                </button>
              </div>
            )}

            {erroComprovante && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {erroComprovante}
              </p>
            )}
          </section>

          {/* Botões */}
          <div className="flex flex-col-reverse gap-3 pb-2 sm:flex-row sm:justify-end">
            <Link
              to="/movimentacoes"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={
                carregandoOpcoes ||
                !!erro ||
                salvando ||
                !!erroComprovante
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#29458f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#233d7d] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Save size={18} />
              {salvando ? 'Salvando...' : 'Salvar entrada'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default NovaEntrada;
