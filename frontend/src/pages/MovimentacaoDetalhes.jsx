
import { useCallback, useEffect, useState } from 'react';

import {
  ArrowLeft,
  CalendarDays,
  FileText,
  User,
  Users,
  CreditCard,
  Pencil,
  X,
  Save,
  Eye,
  Download,
} from 'lucide-react';

import { Link, useParams } from 'react-router';

import { jsPDF } from 'jspdf';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function MovimentacaoDetalhes() {
  const { id } = useParams();

  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL;

  const [movimentacao, setMovimentacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');
  const [sucessoEdicao, setSucessoEdicao] = useState('');

  const [categorias, setCategorias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [eventos, setEventos] = useState([]);

  const [acaoComprovante, setAcaoComprovante] = useState('');
  const [erroComprovante, setErroComprovante] = useState('');

  const [gerandoRecibo, setGerandoRecibo] = useState(false);
  const [erroRecibo, setErroRecibo] = useState('');

  const [formulario, setFormulario] = useState({
    valor: '',
    observacao: '',
    data: '',
    grupo_id: '',
    categoria_id: '',
    forma_pagamento_id: '',
    evento_id: '',
  });

  const carregarMovimentacao = useCallback(async () => {
    try {
      setCarregando(true);
      setErro('');

      const resultado = await apiRequest('/api/movimentacoes', {
        token,
      });

      const encontrada = (resultado.movimentacoes || []).find(
        (item) => String(item.idmovimentacao) === String(id)
      );

      setMovimentacao(encontrada || null);
    } catch (error) {
      setErro(
        error.message || 'Não foi possível carregar a movimentação.'
      );
    } finally {
      setCarregando(false);
    }
  }, [id, token]);

  useEffect(() => {
    carregarMovimentacao();
  }, [carregarMovimentacao]);

  // Abrir formulário de edição
  async function abrirEdicao() {
    try {
      setErroEdicao('');
      setSucessoEdicao('');

      const [opcoes, resultadoGrupos] = await Promise.all([
        apiRequest('/api/movimentacoes/opcoes', { token }),
        apiRequest('/api/grupos/meus', { token }),
      ]);

      const listaCategorias = opcoes.categorias || [];
      const listaFormas = opcoes.formasPagamento || [];
      const listaGrupos = [...(resultadoGrupos.grupos || [])];

      // Preservar o grupo original caso esteja inativo.
      const grupoAtualExiste = listaGrupos.some(
        (grupo) =>
          String(grupo.idgrupo) === String(movimentacao.grupo_id)
      );

      if (!grupoAtualExiste) {
        listaGrupos.push({
          idgrupo: movimentacao.grupo_id,
          nome: movimentacao.grupo,
          ativo: false,
        });
      }

      setCategorias(listaCategorias);
      setFormasPagamento(listaFormas);
      setGrupos(listaGrupos);

      const categoriaAtual = listaCategorias.find(
        (item) => item.nome === movimentacao.categoria
      );

      const formaAtual = listaFormas.find(
        (item) => item.nome === movimentacao.forma_pagamento
      );

      setFormulario({
        valor: movimentacao.valor,
        observacao: movimentacao.observacao || '',
        data: String(movimentacao.data).slice(0, 10),
        grupo_id: String(movimentacao.grupo_id),
        categoria_id: categoriaAtual
          ? String(categoriaAtual.idcategoria)
          : '',
        forma_pagamento_id: formaAtual
          ? String(formaAtual.idforma_pagamento)
          : '',
        evento_id: movimentacao.idevento
          ? String(movimentacao.idevento)
          : '',
      });

      setEditando(true);
    } catch (error) {
      setErroEdicao(
        error.message || 'Não foi possível carregar os dados para edição.'
      );
    }
  }

  // Buscar eventos do grupo selecionado
  useEffect(() => {
    async function carregarEventos() {
      if (!editando || !formulario.grupo_id) {
        setEventos([]);
        return;
      }

      try {
        const resultado = await apiRequest(
          `/api/eventos?grupo_id=${formulario.grupo_id}`,
          { token }
        );

        setEventos(resultado.eventos || []);
      } catch (error) {
        setEventos([]);
        setErroEdicao(
          error.message || 'Não foi possível carregar os eventos.'
        );
      }
    }

    carregarEventos();
  }, [editando, formulario.grupo_id, token]);

  // Atualizar campos do formulário
  function atualizarCampo(event) {
    const { name, value } = event.target;

    setFormulario((estadoAnterior) => ({
      ...estadoAnterior,
      [name]: value,
      ...(name === 'grupo_id' ? { evento_id: '' } : {}),
    }));
  }

  // Salvar alterações
  async function salvarEdicao(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErroEdicao('');
      setSucessoEdicao('');

      const dados = {
        valor: Number(formulario.valor),
        observacao: formulario.observacao,
        data: formulario.data,
        grupo_id: Number(formulario.grupo_id),
        categoria_id: Number(formulario.categoria_id),
        forma_pagamento_id: Number(formulario.forma_pagamento_id),
        evento_id: formulario.evento_id
          ? Number(formulario.evento_id)
          : null,
      };

      await apiRequest(`/api/movimentacoes/${id}`, {
        method: 'PUT',
        body: dados,
        token,
      });

      await carregarMovimentacao();

      setEditando(false);
      setSucessoEdicao('Movimentação atualizada com sucesso!');
    } catch (error) {
      setErroEdicao(
        error.message || 'Não foi possível atualizar a movimentação.'
      );
    } finally {
      setSalvando(false);
    }
  }

  // Buscar o arquivo do comprovante com autenticação
  async function obterArquivoComprovante(download = false) {
    const endpoint = `/api/movimentacoes/${id}/comprovante${
      download ? '?download=true' : ''
    }`;

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const erroResposta = await response.json().catch(() => ({}));

      throw new Error(
        erroResposta.mensagem || 'Não foi possível acessar o comprovante.'
      );
    }

    return response.blob();
  }

  // Visualizar comprovante
  async function visualizarComprovante() {
    setErroComprovante('');

    // Abrir a aba imediatamente para evitar bloqueio do navegador.
    const novaJanela = window.open('', '_blank');

    if (!novaJanela) {
      setErroComprovante(
        'O navegador bloqueou a abertura da nova aba. Permita pop-ups para este site e tente novamente.'
      );
      return;
    }

    try {
      setAcaoComprovante('visualizar');

      novaJanela.document.title = 'Carregando comprovante...';

      const arquivo = await obterArquivoComprovante(false);
      const urlArquivo = URL.createObjectURL(arquivo);

      novaJanela.location.href = urlArquivo;

      setTimeout(() => {
        URL.revokeObjectURL(urlArquivo);
      }, 60000);
    } catch (error) {
      novaJanela.close();

      setErroComprovante(
        error.message || 'Não foi possível visualizar o comprovante.'
      );
    } finally {
      setAcaoComprovante('');
    }
  }

  // Baixar comprovante
  async function baixarComprovante() {
    try {
      setAcaoComprovante('baixar');
      setErroComprovante('');

      const arquivo = await obterArquivoComprovante(true);
      const urlArquivo = URL.createObjectURL(arquivo);

      const link = document.createElement('a');

      link.href = urlArquivo;
      link.download =
        movimentacao.comprovante.nome_arquivo || 'comprovante';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(urlArquivo);
      }, 60000);
    } catch (error) {
      setErroComprovante(
        error.message || 'Não foi possível baixar o comprovante.'
      );
    } finally {
      setAcaoComprovante('');
    }
  }

  // Gerar recibo da movimentação em PDF
  function gerarReciboPDF() {
    try {
      setGerandoRecibo(true);
      setErroRecibo('');

      const documento = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const larguraPagina = documento.internal.pageSize.getWidth();
      const alturaPagina = documento.internal.pageSize.getHeight();
      const margem = 20;
      const larguraConteudo = larguraPagina - margem * 2;

      const isEntrada = movimentacao.tipo === 'entrada';

      const formatarValor = (valor) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(Number(valor));

      const dataEmissao = new Date().toLocaleDateString('pt-BR');

      let y = 20;

      // Cabeçalho
      documento.setFont('helvetica', 'bold');
      documento.setFontSize(17);
      documento.setTextColor(41, 69, 143);

      documento.text(
        'GESTAO FINANCEIRA',
        larguraPagina / 2,
        y,
        { align: 'center' }
      );

      y += 9;

      documento.setFontSize(13);
      documento.setTextColor(35, 35, 35);

      documento.text(
        'RECIBO DE MOVIMENTACAO FINANCEIRA',
        larguraPagina / 2,
        y,
        { align: 'center' }
      );

      y += 7;

      documento.setDrawColor(41, 69, 143);
      documento.setLineWidth(0.7);
      documento.line(margem, y, larguraPagina - margem, y);

      y += 12;

      // Identificação
      documento.setFontSize(10);
      documento.setTextColor(100, 100, 100);
      documento.setFont('helvetica', 'normal');

      documento.text(
        `Documento referente a movimentacao nº ${movimentacao.idmovimentacao}`,
        margem,
        y
      );

      y += 10;

      // Tipo e valor da movimentação
      documento.setFillColor(
        isEntrada ? 230 : 254,
        isEntrada ? 247 : 242,
        isEntrada ? 239 : 242
      );

      documento.roundedRect(
        margem,
        y,
        larguraConteudo,
        20,
        2,
        2,
        'F'
      );

      documento.setFont('helvetica', 'bold');
      documento.setFontSize(11);

      documento.setTextColor(
        isEntrada ? 4 : 185,
        isEntrada ? 120 : 28,
        isEntrada ? 87 : 28
      );

      documento.text(
        isEntrada ? 'ENTRADA FINANCEIRA' : 'SAIDA FINANCEIRA',
        margem + 5,
        y + 8
      );

      documento.setFontSize(15);

      documento.text(
        formatarValor(movimentacao.valor),
        larguraPagina - margem - 5,
        y + 14,
        { align: 'right' }
      );

      y += 32;

      // Texto descritivo
      documento.setFont('helvetica', 'normal');
      documento.setFontSize(10);
      documento.setTextColor(55, 55, 55);

      const textoDescricao = isEntrada
        ? 'Registro de entrada financeira no sistema de gestao da igreja.'
        : 'Registro de saida financeira no sistema de gestao da igreja.';

      const linhasDescricao = documento.splitTextToSize(
        textoDescricao,
        larguraConteudo
      );

      documento.text(linhasDescricao, margem, y);

      y += linhasDescricao.length * 6 + 7;

      // Função para adicionar informações ao recibo
      function adicionarCampo(rotulo, valor) {
        const texto = String(valor || '-');

        documento.setFont('helvetica', 'bold');
        documento.setFontSize(9);
        documento.setTextColor(100, 100, 100);

        documento.text(rotulo.toUpperCase(), margem, y);

        y += 5;

        documento.setFont('helvetica', 'normal');
        documento.setFontSize(11);
        documento.setTextColor(35, 35, 35);

        const linhas = documento.splitTextToSize(
          texto,
          larguraConteudo
        );

        // Evitar que um campo seja cortado entre páginas.
        const alturaCampo = linhas.length * 6 + 5;

        if (y + alturaCampo > alturaPagina - 35) {
          documento.addPage();
          y = 25;
        }

        documento.text(linhas, margem, y);

        y += alturaCampo;
      }

      // Dados da movimentação
      documento.setFont('helvetica', 'bold');
      documento.setFontSize(12);
      documento.setTextColor(41, 69, 143);

      documento.text('DADOS DA MOVIMENTACAO', margem, y);

      y += 9;

      adicionarCampo(
        'Data da movimentacao',
        formatarData(movimentacao.data)
      );

      adicionarCampo('Grupo', movimentacao.grupo);
      adicionarCampo('Categoria', movimentacao.categoria);
      adicionarCampo(
        'Forma de pagamento',
        movimentacao.forma_pagamento
      );
      adicionarCampo(
        'Evento',
        movimentacao.evento || 'Nao vinculado'
      );
      adicionarCampo(
        'Responsavel pelo registro',
        movimentacao.responsavel
      );
      adicionarCampo(
        'Observacoes',
        movimentacao.observacao?.trim() ||
          'Nenhuma observacao registrada.'
      );

      // Campo exclusivo para assinatura do tesoureiro.
      if (y + 45 > alturaPagina - 20) {
        documento.addPage();
        y = 35;
      } else {
        y += 8;
      }

      const larguraAssinatura = 110;
      const inicioAssinatura =
        (larguraPagina - larguraAssinatura) / 2;

      documento.setDrawColor(100, 100, 100);
      documento.setLineWidth(0.4);

      documento.line(
        inicioAssinatura,
        y + 15,
        inicioAssinatura + larguraAssinatura,
        y + 15
      );

      documento.setFont('helvetica', 'normal');
      documento.setFontSize(10);
      documento.setTextColor(55, 55, 55);

      documento.text(
        'Assinatura do(a) tesoureiro(a)',
        larguraPagina / 2,
        y + 21,
        { align: 'center' }
      );

      y += 32;

      documento.setFontSize(9);
      documento.setTextColor(100, 100, 100);

      documento.text(
        `Documento emitido em ${dataEmissao}`,
        larguraPagina / 2,
        y,
        { align: 'center' }
      );

      // Rodapé em todas as páginas
      const quantidadePaginas = documento.internal.getNumberOfPages();

      for (let pagina = 1; pagina <= quantidadePaginas; pagina += 1) {
        documento.setPage(pagina);

        documento.setDrawColor(210, 210, 210);
        documento.setLineWidth(0.3);

        documento.line(
          margem,
          alturaPagina - 15,
          larguraPagina - margem,
          alturaPagina - 15
        );

        documento.setFont('helvetica', 'normal');
        documento.setFontSize(8);
        documento.setTextColor(130, 130, 130);

        documento.text(
          `Sistema de Gestao Financeira - Pagina ${pagina} de ${quantidadePaginas}`,
          larguraPagina / 2,
          alturaPagina - 9,
          { align: 'center' }
        );
      }

      // Download do recibo
      documento.save(
        `recibo_movimentacao_${movimentacao.idmovimentacao}.pdf`
      );
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);

      setErroRecibo(
        'Nao foi possivel gerar o recibo em PDF. Tente novamente.'
      );
    } finally {
      setGerandoRecibo(false);
    }
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));
  };

  const formatarData = (data) => {
    if (!data) return '-';

    const dataFormatada = String(data).slice(0, 10);
    const [ano, mes, dia] = dataFormatada.split('-');

    return `${dia}/${mes}/${ano}`;
  };

  if (carregando) {
    return (
      <Layout>
        <div className="p-3 sm:p-5">
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            Carregando movimentação...
          </div>
        </div>
      </Layout>
    );
  }

  if (erro || !movimentacao) {
    return (
      <Layout>
        <div className="p-3 sm:p-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-center sm:p-8">
            <h1 className="text-lg font-semibold text-gray-900">
              {erro
                ? 'Erro ao carregar movimentação'
                : 'Movimentação não encontrada'}
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {erro ||
                'A movimentação solicitada não existe ou você não tem acesso a ela.'}
            </p>

            <Link
              to="/movimentacoes"
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#29458f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#233d7d]"
            >
              <ArrowLeft size={16} />
              Voltar para movimentações
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const isEntrada = movimentacao.tipo === 'entrada';
  const observacao = movimentacao.observacao?.trim() || '-';
  const comprovante = movimentacao.comprovante;

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-6">
        {/* Cabeçalho */}
        <header className="mb-5">
          <Link
            to="/movimentacoes"
            className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#29458f] hover:underline"
          >
            <ArrowLeft size={17} />
            Voltar para movimentações
          </Link>

          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Detalhes da Movimentação
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Visualização das informações da movimentação
          </p>
        </header>

        {/* Identificação */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  isEntrada
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {isEntrada ? 'Entrada' : 'Saída'}
              </span>

              <h2 className="mt-3 text-base font-semibold text-gray-900 sm:text-lg">
                Movimentação #{movimentacao.idmovimentacao}
              </h2>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p
                className={`text-2xl font-bold ${
                  isEntrada ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {formatarMoeda(movimentacao.valor)}
              </p>

              {!editando && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={gerarReciboPDF}
                    disabled={gerandoRecibo}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#29458f] bg-white px-4 py-2.5 text-sm font-medium text-[#29458f] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <Download size={16} />
                    {gerandoRecibo
                      ? 'Gerando recibo...'
                      : 'Gerar recibo PDF'}
                  </button>

                  <button
                    type="button"
                    onClick={abrirEdicao}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#29458f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#233d7d] sm:w-auto"
                  >
                    <Pencil size={16} />
                    Editar movimentação
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mensagens */}
        {sucessoEdicao && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            {sucessoEdicao}
          </div>
        )}

        {erroEdicao && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {erroEdicao}
          </div>
        )}

        {erroRecibo && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {erroRecibo}
          </div>
        )}

        {/* Formulário de edição */}
        {editando ? (
          <form
            onSubmit={salvarEdicao}
            className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                Editar dados da movimentação
              </h2>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Altere as informações necessárias e salve as modificações.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoFormulario label="Valor (R$)">
                <input
                  type="number"
                  name="valor"
                  min="0.01"
                  step="0.01"
                  value={formulario.valor}
                  onChange={atualizarCampo}
                  required
                  className="campo-edicao min-h-11"
                />
              </CampoFormulario>

              <CampoFormulario label="Data">
                <input
                  type="date"
                  name="data"
                  value={formulario.data}
                  onChange={atualizarCampo}
                  required
                  className="campo-edicao min-h-11"
                />
              </CampoFormulario>

              <CampoFormulario label="Grupo">
                <select
                  name="grupo_id"
                  value={formulario.grupo_id}
                  onChange={atualizarCampo}
                  required
                  className="campo-edicao min-h-11"
                >
                  <option value="">Selecione um grupo</option>

                  {grupos.map((grupo) => (
                    <option key={grupo.idgrupo} value={grupo.idgrupo}>
                      {grupo.nome}
                      {grupo.ativo === false ? ' (Inativo)' : ''}
                    </option>
                  ))}
                </select>
              </CampoFormulario>

              <CampoFormulario label="Categoria">
                <select
                  name="categoria_id"
                  value={formulario.categoria_id}
                  onChange={atualizarCampo}
                  required
                  className="campo-edicao min-h-11"
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
              </CampoFormulario>

              <CampoFormulario label="Forma de pagamento">
                <select
                  name="forma_pagamento_id"
                  value={formulario.forma_pagamento_id}
                  onChange={atualizarCampo}
                  required
                  className="campo-edicao min-h-11"
                >
                  <option value="">Selecione uma forma de pagamento</option>

                  {formasPagamento.map((forma) => (
                    <option
                      key={forma.idforma_pagamento}
                      value={forma.idforma_pagamento}
                    >
                      {forma.nome}
                    </option>
                  ))}
                </select>
              </CampoFormulario>

              <CampoFormulario label="Evento (opcional)">
                <select
                  name="evento_id"
                  value={formulario.evento_id}
                  onChange={atualizarCampo}
                  className="campo-edicao min-h-11"
                >
                  <option value="">Nenhum evento</option>

                  {eventos.map((evento) => (
                    <option key={evento.idevento} value={evento.idevento}>
                      {evento.nome}
                    </option>
                  ))}
                </select>
              </CampoFormulario>

              <div className="sm:col-span-2">
                <CampoFormulario label="Observação">
                  <textarea
                    name="observacao"
                    value={formulario.observacao}
                    onChange={atualizarCampo}
                    rows={4}
                    className="campo-edicao min-h-28 resize-y"
                    placeholder="Informe uma observação..."
                  />
                </CampoFormulario>
              </div>
            </div>

            {/* Ações */}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setErroEdicao('');
                }}
                disabled={salvando}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:min-w-32"
              >
                <X size={16} />
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#29458f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#233d7d] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-44"
              >
                <Save size={16} />
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Informações */}
            <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Dados da movimentação */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-center gap-2">
                  <FileText size={18} className="shrink-0 text-[#29458f]" />

                  <h2 className="text-base font-semibold text-gray-900">
                    Dados da Movimentação
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InfoItem
                    label="Data"
                    value={formatarData(movimentacao.data)}
                    icon={<CalendarDays size={15} />}
                  />

                  <InfoItem
                    label="Categoria"
                    value={movimentacao.categoria || '-'}
                  />

                  <InfoItem
                    label="Evento"
                    value={movimentacao.evento || '-'}
                  />

                  <InfoItem
                    label="Grupo"
                    value={movimentacao.grupo || '-'}
                    icon={<Users size={15} />}
                  />

                  <InfoItem
                    label="Forma de pagamento"
                    value={movimentacao.forma_pagamento || '-'}
                    icon={<CreditCard size={15} />}
                  />

                  <InfoItem
                    label="Responsável"
                    value={movimentacao.responsavel || '-'}
                    icon={<User size={15} />}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-gray-900">
                  Observações
                </h2>

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                  {observacao}
                </p>
              </div>
            </section>

            {/* Comprovante */}
            <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Comprovante
              </h2>

              {comprovante ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#29458f]">
                        <FileText size={21} />
                      </div>

                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium text-gray-800">
                          {comprovante.nome_arquivo}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Comprovante anexado à movimentação
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
                      <button
                        type="button"
                        onClick={visualizarComprovante}
                        disabled={acaoComprovante !== ''}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye size={16} />
                        {acaoComprovante === 'visualizar'
                          ? 'Abrindo...'
                          : 'Visualizar'}
                      </button>

                      <button
                        type="button"
                        onClick={baixarComprovante}
                        disabled={acaoComprovante !== ''}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#29458f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#233d7d] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download size={16} />
                        {acaoComprovante === 'baixar'
                          ? 'Baixando...'
                          : 'Baixar'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                  <FileText
                    size={28}
                    className="mx-auto mb-3 text-gray-400"
                  />

                  <p className="text-sm text-gray-500">
                    Nenhum comprovante anexado.
                  </p>
                </div>
              )}

              {erroComprovante && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"
                >
                  {erroComprovante}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

function CampoFormulario({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function InfoItem({ label, value, icon }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {icon}
        <span>{label}</span>
      </div>

      <p className="mt-1.5 break-words text-sm font-medium leading-5 text-gray-800">
        {value}
      </p>
    </div>
  );
}

export default MovimentacaoDetalhes;
