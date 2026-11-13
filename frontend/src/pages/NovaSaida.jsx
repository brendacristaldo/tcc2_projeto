
import { useEffect, useRef, useState } from 'react';

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

function NovaSaida() {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [eventos, setEventos] = useState([]);

  const [valor, setValor] = useState('');
  const [observacao, setObservacao] = useState('');

  const [data, setData] = useState(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  });

  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] =
    useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState('');

  const [comprovante, setComprovante] = useState(null);
  const [erroComprovante, setErroComprovante] = useState('');

  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState('');
  const [erroEventos, setErroEventos] = useState('');

  const token = localStorage.getItem('token');

  const dataInputRef = useRef(null);

const abrirCalendario = () => {
  const campo = dataInputRef.current;

  if (!campo) return;

  if (typeof campo.showPicker === 'function') {
    campo.showPicker();
  } else {
    campo.focus();
  }
};

  // Carregar categorias, formas de pagamento e grupos
  useEffect(() => {
    async function carregarOpcoes() {
      try {
        setCarregandoOpcoes(true);
        setErro('');

        const [opcoes, meusGrupos] = await Promise.all([
          apiRequest('/api/movimentacoes/opcoes', { token }),
          apiRequest('/api/grupos/meus', { token }),
        ]);

        setCategorias(opcoes.categorias || []);
        setFormasPagamento(opcoes.formasPagamento || []);
        setGrupos(meusGrupos.grupos || []);
      } catch (error) {
        setErro(
          error.message ||
            'Não foi possível carregar os dados do formulário.'
        );
      } finally {
        setCarregandoOpcoes(false);
      }
    }

    carregarOpcoes();
  }, []);

  // Carregar eventos do grupo selecionado
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

        const resultado = await apiRequest(
          `/api/eventos?grupo_id=${grupoSelecionado}`,
          { token }
        );

        if (ativo) {
          setEventos(resultado.eventos || []);
        }
      } catch (error) {
        if (ativo) {
          setEventos([]);
          setErroEventos(
            error.message || 'Não foi possível carregar os eventos.'
          );
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

  // Alterar grupo e limpar o evento selecionado
  function handleGrupoChange(event) {
    setGrupoSelecionado(event.target.value);
    setEventoSelecionado('');
    setEventos([]);
  }

  // Selecionar e validar comprovante
  function handleComprovanteChange(event) {
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

    const tamanhoMaximo = 5 * 1024 * 1024;

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErroComprovante(
        'Formato inválido. Selecione um arquivo PDF, JPG ou PNG.'
      );
      setComprovante(null);
      event.target.value = '';
      return;
    }

    if (arquivo.size > tamanhoMaximo) {
      setErroComprovante('O arquivo ultrapassa o limite de 5 MB.');
      setComprovante(null);
      event.target.value = '';
      return;
    }

    setComprovante(arquivo);
  }

  // Remover comprovante selecionado
  function removerComprovante() {
    setComprovante(null);
    setErroComprovante('');

    const campoArquivo = document.getElementById('comprovante');

    if (campoArquivo) {
      campoArquivo.value = '';
    }
  }

  // Cadastrar saída
  async function handleSubmit(event) {
    event.preventDefault();

    if (erroComprovante) {
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      const dados = new FormData();

      dados.append('valor', Number(valor));
      dados.append('observacao', observacao.trim());
      dados.append('data', data);
      dados.append('grupo_id', Number(grupoSelecionado));
      dados.append('categoria_id', Number(categoriaSelecionada));
      dados.append(
        'forma_pagamento_id',
        Number(formaPagamentoSelecionada)
      );

      if (eventoSelecionado) {
        dados.append('evento_id', Number(eventoSelecionado));
      }

      if (comprovante) {
        dados.append('comprovante', comprovante);
      }

      await apiRequest('/api/movimentacoes/saidas', {
        method: 'POST',
        body: dados,
        token,
      });

      navigate('/movimentacoes');
    } catch (error) {
      setErro(error.message || 'Não foi possível cadastrar a saída.');
    } finally {
      setSalvando(false);
    }
  }

  // Classe padrão dos campos com altura mínima de 44px
  const classeCampo =
    'min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-black outline-none transition focus:border-[#29458f] focus:ring-2 focus:ring-[#29458f]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70';

  const classeLabel = 'mb-2 block text-base font-semibold text-black';

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl p-3 sm:p-5 lg:p-6">

        {/* Cabeçalho */}
        <header className="mb-5 sm:mb-6">
          <Link
            to="/dashboard"
            className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-base font-semibold text-[#29458f] transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#29458f] focus:ring-offset-2"
          >
            <ArrowLeft size={20} />
            Voltar ao Dashboard
          </Link>

          <h1 className="text-2xl font-bold text-black sm:text-3xl">
            Nova Saída
          </h1>

          <p className="mt-2 text-base text-black sm:text-lg">
            Cadastre uma nova saída financeira.
          </p>
        </header>

        {/* Erro geral */}
        {erro && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-base text-red-700"
          >
            {erro}
          </div>
        )}

        {carregandoOpcoes ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-base text-black shadow-sm">
            Carregando informações do formulário...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

            {/* Dados da saída */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <DollarSign size={23} className="text-[#29458f]" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-black sm:text-xl">
                    Dados da Saída
                  </h2>

                  <p className="text-base text-black">
                    Preencha as informações da movimentação.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">

                {/* Observação */}
                <div className="sm:col-span-2">
                  <label htmlFor="observacao" className={classeLabel}>
                    Observação
                    <span className="ml-1 font-normal text-black">
                      (opcional)
                    </span>
                  </label>

                  <input
                    id="observacao"
                    type="text"
                    value={observacao}
                    onChange={(event) => setObservacao(event.target.value)}
                    placeholder="Ex.: Pagamento de aluguel de ônibus"
                    className={classeCampo}
                  />
                </div>

                {/* Valor */}
                <div>
                  <label htmlFor="valor" className={classeLabel}>
                    Valor
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-black">
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
    <button
      type="button"
      onClick={abrirCalendario}
      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-black"
      aria-label="Abrir calendário"
      title="Abrir calendário"
    >
      <CalendarDays size={20} />
    </button>

    <input
      ref={dataInputRef}
      id="data"
      type="date"
      value={data}
      onChange={(event) => setData(event.target.value)}
      onClick={abrirCalendario}
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
                    className={classeCampo}
                  >
                    <option value="">Selecione um grupo</option>

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
                    className={classeCampo}
                  >
                    <option value="">Selecione uma categoria</option>

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
                    className={classeCampo}
                  >
                    <option value="">
                      Selecione uma forma de pagamento
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
                    <span className="ml-1 font-normal text-black">
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
                    <p className="mt-2 text-base text-red-600" role="alert">
                      Não foi possível carregar os eventos: {erroEventos}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Comprovante */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <FileText size={23} className="text-[#29458f]" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-black sm:text-xl">
                    Comprovante
                  </h2>

                  <p className="text-base text-black">
                    Anexe um documento, se necessário.
                  </p>
                </div>
              </div>

              <label
                htmlFor="comprovante"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-[#29458f] hover:bg-blue-50 focus-within:ring-2 focus-within:ring-[#29458f] focus-within:ring-offset-2"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Upload size={25} className="text-[#29458f]" />
                </div>

                <span className="text-base font-semibold text-black">
                  {comprovante
                    ? 'Alterar comprovante'
                    : 'Toque para anexar um comprovante'}
                </span>

                <span className="mt-2 text-sm text-black sm:text-base">
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

              {erroComprovante && (
                <p
                  className="mt-3 rounded-lg bg-red-50 p-3 text-base text-red-700"
                  role="alert"
                >
                  {erroComprovante}
                </p>
              )}

              {comprovante && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText
                      size={24}
                      className="shrink-0 text-[#29458f]"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-black">
                        {comprovante.name}
                      </p>

                      <p className="mt-1 text-sm text-black">
                        {(comprovante.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removerComprovante}
                    className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-black transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Remover comprovante"
                    title="Remover comprovante"
                  >
                    <X size={21} />
                  </button>
                </div>
              )}
            </section>

            {/* Botões */}
            <div className="flex flex-col-reverse gap-3 pb-2 sm:flex-row sm:justify-end">
              <Link
                to="/movimentacoes"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-base font-semibold text-black transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#29458f] focus:ring-offset-2 sm:w-auto"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={salvando || !!erroComprovante}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#29458f] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#233d7d] focus:outline-none focus:ring-2 focus:ring-[#29458f] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Save size={20} />
                {salvando ? 'Salvando...' : 'Salvar saída'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}

export default NovaSaida;
