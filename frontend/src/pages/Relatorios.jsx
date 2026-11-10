
import { useEffect, useMemo, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const formatarData = (data) => {
  if (!data) return '';

  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

const obterIdEvento = (movimentacao) =>
  movimentacao.idevento ?? movimentacao.evento_id ?? null;

function Relatorios() {
  const token = localStorage.getItem('token');

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [eventos, setEventos] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [grupo, setGrupo] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [evento, setEvento] = useState('');

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErro('');

        const [
          resultadoMovimentacoes,
          resultadoOpcoes,
          resultadoGrupos,
          resultadoEventos,
        ] = await Promise.all([
          apiRequest('/api/movimentacoes', { token }),
          apiRequest('/api/movimentacoes/opcoes', { token }),
          apiRequest('/api/grupos/meus', { token }),
          apiRequest('/api/eventos', { token }),
        ]);

        setMovimentacoes(resultadoMovimentacoes.movimentacoes || []);
        setFormasPagamento(resultadoOpcoes.formasPagamento || []);
        setGrupos(resultadoGrupos.grupos || []);
        setEventos(resultadoEventos.eventos || []);
      } catch (error) {
        setErro(
          error.message || 'Não foi possível carregar os dados dos relatórios.'
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, [token]);

  // Reunir eventos ativos e eventos presentes no histórico
  const eventosDisponiveis = useMemo(() => {
    const eventosMap = new Map();

    eventos.forEach((item) => {
      eventosMap.set(String(item.idevento), {
        idevento: item.idevento,
        nome: item.nome,
      });
    });

    movimentacoes.forEach((movimentacao) => {
      const idEvento = obterIdEvento(movimentacao);

      if (idEvento !== null && idEvento !== undefined) {
        const chave = String(idEvento);

        if (!eventosMap.has(chave)) {
          eventosMap.set(chave, {
            idevento: idEvento,
            nome: movimentacao.evento || `Evento ${idEvento}`,
          });
        }
      }
    });

    return Array.from(eventosMap.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR')
    );
  }, [eventos, movimentacoes]);

  // Filtrar movimentações automaticamente
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter((movimentacao) => {
      const dataMovimentacao = String(movimentacao.data).slice(0, 10);

      const correspondeDataInicio =
        !dataInicio || dataMovimentacao >= dataInicio;

      const correspondeDataFim =
        !dataFim || dataMovimentacao <= dataFim;

      const correspondeGrupo =
        !grupo || String(movimentacao.grupo_id) === String(grupo);

      const correspondeFormaPagamento =
        !formaPagamento ||
        movimentacao.forma_pagamento === formaPagamento;

      const idEventoMovimentacao = obterIdEvento(movimentacao);

      const correspondeEvento =
        !evento ||
        (evento === 'sem-evento'
          ? idEventoMovimentacao === null ||
            idEventoMovimentacao === undefined
          : String(idEventoMovimentacao) === String(evento));

      return (
        correspondeDataInicio &&
        correspondeDataFim &&
        correspondeGrupo &&
        correspondeFormaPagamento &&
        correspondeEvento
      );
    });
  }, [
    movimentacoes,
    dataInicio,
    dataFim,
    grupo,
    formaPagamento,
    evento,
  ]);

  // Calcular resumo geral
  const resumo = useMemo(() => {
    const entradas = movimentacoesFiltradas
      .filter((movimentacao) => movimentacao.tipo === 'entrada')
      .reduce(
        (total, movimentacao) => total + Number(movimentacao.valor || 0),
        0
      );

    const saidas = movimentacoesFiltradas
      .filter((movimentacao) => movimentacao.tipo === 'saida')
      .reduce(
        (total, movimentacao) => total + Number(movimentacao.valor || 0),
        0
      );

    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  }, [movimentacoesFiltradas]);

  // Agrupar movimentações por forma de pagamento
  const resumoPorFormaPagamento = useMemo(() => {
    return formasPagamento
      .map((forma) => {
        const movimentacoesDaForma = movimentacoesFiltradas.filter(
          (movimentacao) =>
            movimentacao.forma_pagamento === forma.nome
        );

        const entradas = movimentacoesDaForma
          .filter((movimentacao) => movimentacao.tipo === 'entrada')
          .reduce(
            (total, movimentacao) => total + Number(movimentacao.valor || 0),
            0
          );

        const saidas = movimentacoesDaForma
          .filter((movimentacao) => movimentacao.tipo === 'saida')
          .reduce(
            (total, movimentacao) => total + Number(movimentacao.valor || 0),
            0
          );

        return {
          forma: forma.nome,
          entradas,
          saidas,
          saldo: entradas - saidas,
          quantidade: movimentacoesDaForma.length,
        };
      })
      .filter((item) => item.quantidade > 0);
  }, [movimentacoesFiltradas, formasPagamento]);

  // Agrupar movimentações por categoria
  const resumoPorCategoria = useMemo(() => {
    const categorias = {};

    movimentacoesFiltradas.forEach((movimentacao) => {
      const nomeCategoria = movimentacao.categoria || 'Sem categoria';

      if (!categorias[nomeCategoria]) {
        categorias[nomeCategoria] = {
          categoria: nomeCategoria,
          entradas: 0,
          saidas: 0,
        };
      }

      if (movimentacao.tipo === 'entrada') {
        categorias[nomeCategoria].entradas += Number(
          movimentacao.valor || 0
        );
      } else if (movimentacao.tipo === 'saida') {
        categorias[nomeCategoria].saidas += Number(
          movimentacao.valor || 0
        );
      }
    });

    return Object.values(categorias);
  }, [movimentacoesFiltradas]);

  // Obter informações dos filtros selecionados
  const obterFiltrosRelatorio = () => {
    const grupoSelecionado = grupos.find(
      (item) => String(item.idgrupo) === String(grupo)
    );

    const eventoSelecionado = eventosDisponiveis.find(
      (item) => String(item.idevento) === String(evento)
    );

    const nomeEvento =
      evento === 'sem-evento'
        ? 'Movimentações sem evento'
        : eventoSelecionado
          ? eventoSelecionado.nome
          : 'Todos os eventos';

    const periodo =
      dataInicio || dataFim
        ? `${dataInicio ? formatarData(dataInicio) : 'Sem data inicial'} até ${
            dataFim ? formatarData(dataFim) : 'Sem data final'
          }`
        : 'Todo o período';

    return {
      grupo: grupoSelecionado
        ? grupoSelecionado.nome
        : 'Todos os grupos',
      evento: nomeEvento,
      periodo,
      formaPagamento: formaPagamento || 'Todas as formas',
    };
  };

  // Exportar relatório para Excel
  const exportarExcel = () => {
    const filtros = obterFiltrosRelatorio();

    const linhasResumo = [];

    linhasResumo.push(['RELATÓRIO FINANCEIRO']);
    linhasResumo.push([
      'Data de geração',
      new Date().toLocaleString('pt-BR'),
    ]);
    linhasResumo.push(['Período', filtros.periodo]);
    linhasResumo.push(['Grupo', filtros.grupo]);
    linhasResumo.push(['Forma de pagamento', filtros.formaPagamento]);
    linhasResumo.push(['Evento', filtros.evento]);

    linhasResumo.push([]);
    linhasResumo.push(['RESUMO FINANCEIRO']);
    linhasResumo.push(['Indicador', 'Valor']);
    linhasResumo.push(['Total de entradas', resumo.entradas]);
    linhasResumo.push(['Total de saídas', resumo.saidas]);
    linhasResumo.push(['Saldo final', resumo.saldo]);

    linhasResumo.push([]);
    linhasResumo.push(['RESUMO POR FORMA DE PAGAMENTO']);
    linhasResumo.push([
      'Forma de pagamento',
      'Entradas',
      'Saídas',
      'Saldo',
      'Quantidade de movimentações',
    ]);

    resumoPorFormaPagamento.forEach((item) => {
      linhasResumo.push([
        item.forma,
        item.entradas,
        item.saidas,
        item.saldo,
        item.quantidade,
      ]);
    });

    linhasResumo.push([]);
    linhasResumo.push(['RESUMO POR CATEGORIA']);
    linhasResumo.push(['Categoria', 'Entradas', 'Saídas']);

    resumoPorCategoria.forEach((item) => {
      linhasResumo.push([
        item.categoria,
        item.entradas,
        item.saidas,
      ]);
    });

    const planilhaResumo = XLSX.utils.aoa_to_sheet(linhasResumo);

    planilhaResumo['!cols'] = [
      { wch: 34 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
    ];

    [9, 10, 11].forEach((linha) => {
      const celula = planilhaResumo[
        XLSX.utils.encode_cell({ r: linha, c: 1 })
      ];

      if (celula) {
        celula.z = '"R$" #,##0.00';
      }
    });

    const indiceTituloForma = linhasResumo.findIndex(
      (linha) => linha[0] === 'RESUMO POR FORMA DE PAGAMENTO'
    );

    resumoPorFormaPagamento.forEach((item, indice) => {
      const linha = indiceTituloForma + 2 + indice;

      [1, 2, 3].forEach((coluna) => {
        const celula = planilhaResumo[
          XLSX.utils.encode_cell({ r: linha, c: coluna })
        ];

        if (celula) {
          celula.z = '"R$" #,##0.00';
        }
      });
    });

    const indiceTituloCategoria = linhasResumo.findIndex(
      (linha) => linha[0] === 'RESUMO POR CATEGORIA'
    );

    resumoPorCategoria.forEach((item, indice) => {
      const linha = indiceTituloCategoria + 2 + indice;

      [1, 2].forEach((coluna) => {
        const celula = planilhaResumo[
          XLSX.utils.encode_cell({ r: linha, c: coluna })
        ];

        if (celula) {
          celula.z = '"R$" #,##0.00';
        }
      });
    });

    const dadosMovimentacoes = movimentacoesFiltradas.map(
      (movimentacao) => ({
        Data: movimentacao.data
          ? String(movimentacao.data).slice(0, 10)
          : '',
        Tipo:
          movimentacao.tipo === 'entrada'
            ? 'Entrada'
            : movimentacao.tipo === 'saida'
              ? 'Saída'
              : movimentacao.tipo,
        Grupo: movimentacao.grupo || '',
        Evento: movimentacao.evento || 'Sem evento',
        Categoria: movimentacao.categoria || 'Sem categoria',
        'Forma de pagamento': movimentacao.forma_pagamento || '',
        Descrição: movimentacao.observacao || '',
        Responsável: movimentacao.responsavel || '',
        Valor: Number(movimentacao.valor || 0),
      })
    );

    const planilhaMovimentacoes = XLSX.utils.json_to_sheet(
      dadosMovimentacoes
    );

    planilhaMovimentacoes['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 28 },
      { wch: 22 },
      { wch: 22 },
      { wch: 40 },
      { wch: 24 },
      { wch: 18 },
    ];

    for (let linha = 1; linha <= dadosMovimentacoes.length; linha++) {
      const celula = planilhaMovimentacoes[
        XLSX.utils.encode_cell({ r: linha, c: 8 })
      ];

      if (celula) {
        celula.z = '"R$" #,##0.00';
      }
    }

    const arquivoExcel = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      arquivoExcel,
      planilhaResumo,
      'Resumo'
    );

    XLSX.utils.book_append_sheet(
      arquivoExcel,
      planilhaMovimentacoes,
      'Movimentações'
    );

    const dataAtual = new Date().toISOString().slice(0, 10);

    XLSX.writeFile(
      arquivoExcel,
      `relatorio_financeiro_${dataAtual}.xlsx`
    );
  };

  // Exportar relatório para PDF
  const exportarPDF = () => {
    if (movimentacoesFiltradas.length === 0) {
      alert('Não existem movimentações para exportar com os filtros selecionados.');
      return;
    }

    const documento = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const filtros = obterFiltrosRelatorio();

    const margem = 14;
    const larguraPagina = documento.internal.pageSize.getWidth();
    const alturaPagina = documento.internal.pageSize.getHeight();
    const dataGeracao = new Date().toLocaleString('pt-BR');

    // Cabeçalho
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(18);
    documento.setTextColor(41, 69, 143);
    documento.text('RELATÓRIO FINANCEIRO', margem, 15);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.setTextColor(90, 90, 90);
    documento.text(`Data de geração: ${dataGeracao}`, margem, 22);

    // Filtros
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(11);
    documento.setTextColor(40, 40, 40);
    documento.text('Filtros aplicados', margem, 32);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);

    const filtrosPDF = [
      `Período: ${filtros.periodo}`,
      `Grupo: ${filtros.grupo}`,
      `Forma de pagamento: ${filtros.formaPagamento}`,
      `Evento: ${filtros.evento}`,
    ];

    filtrosPDF.forEach((texto, indice) => {
      const coluna = indice % 2;
      const linha = Math.floor(indice / 2);

      documento.text(
        texto,
        margem + coluna * 135,
        39 + linha * 6
      );
    });

    // Resumo financeiro
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(11);
    documento.text('Resumo financeiro', margem, 55);

    autoTable(documento, {
      startY: 59,
      margin: { left: margem, right: margem },
      head: [[
        'Total de entradas',
        'Total de saídas',
        'Saldo final',
      ]],
      body: [[
        formatarMoeda(resumo.entradas),
        formatarMoeda(resumo.saidas),
        formatarMoeda(resumo.saldo),
      ]],
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'center',
      },
      headStyles: {
        fillColor: [41, 69, 143],
        textColor: 255,
        fontStyle: 'bold',
      },
    });

    // Resumo por forma de pagamento
    let posicaoY = documento.lastAutoTable.finalY + 9;

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(11);
    documento.setTextColor(40, 40, 40);
    documento.text('Resumo por forma de pagamento', margem, posicaoY);

    autoTable(documento, {
      startY: posicaoY + 3,
      margin: { left: margem, right: margem },
      head: [[
        'Forma de pagamento',
        'Entradas',
        'Saídas',
        'Saldo',
        'Quantidade',
      ]],
      body: resumoPorFormaPagamento.map((item) => [
        item.forma,
        formatarMoeda(item.entradas),
        formatarMoeda(item.saidas),
        formatarMoeda(item.saldo),
        String(item.quantidade),
      ]),
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [41, 69, 143],
        textColor: 255,
      },
    });

    // Resumo por categoria
    posicaoY = documento.lastAutoTable.finalY + 9;

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(11);
    documento.setTextColor(40, 40, 40);
    documento.text('Resumo por categoria', margem, posicaoY);

    autoTable(documento, {
      startY: posicaoY + 3,
      margin: { left: margem, right: margem },
      head: [['Categoria', 'Entradas', 'Saídas']],
      body: resumoPorCategoria.map((item) => [
        item.categoria,
        formatarMoeda(item.entradas),
        formatarMoeda(item.saidas),
      ]),
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [41, 69, 143],
        textColor: 255,
      },
    });

    // Detalhamento das movimentações
    documento.addPage();

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(14);
    documento.setTextColor(41, 69, 143);
    documento.text('DETALHAMENTO DAS MOVIMENTAÇÕES', margem, 15);

    autoTable(documento, {
      startY: 21,
      margin: {
        left: margem,
        right: margem,
        bottom: 15,
      },
      head: [[
        'Data',
        'Tipo',
        'Grupo',
        'Evento',
        'Categoria',
        'Forma de pagamento',
        'Descrição',
        'Responsável',
        'Valor',
      ]],
      body: movimentacoesFiltradas.map((movimentacao) => [
        formatarData(movimentacao.data),
        movimentacao.tipo === 'entrada'
          ? 'Entrada'
          : movimentacao.tipo === 'saida'
            ? 'Saída'
            : movimentacao.tipo,
        movimentacao.grupo || '',
        movimentacao.evento || 'Sem evento',
        movimentacao.categoria || 'Sem categoria',
        movimentacao.forma_pagamento || '',
        movimentacao.observacao || '',
        movimentacao.responsavel || '',
        formatarMoeda(movimentacao.valor),
      ]),
      theme: 'striped',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [41, 69, 143],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 19 },
        1: { cellWidth: 17 },
        2: { cellWidth: 23 },
        3: { cellWidth: 25 },
        4: { cellWidth: 23 },
        5: { cellWidth: 25 },
        6: { cellWidth: 48 },
        7: { cellWidth: 25 },
        8: { cellWidth: 23 },
      },
    });

    // Verificar se há espaço para as assinaturas na última página.
    // Caso contrário, criar uma página exclusiva para elas.
    const posicaoFinalTabela = documento.lastAutoTable.finalY;
    const alturaNecessariaAssinaturas = 45;

    if (
      posicaoFinalTabela >
      alturaPagina - alturaNecessariaAssinaturas
    ) {
      documento.addPage();
    }

    // Campos de assinatura no final do relatório
    const posicaoLinhaAssinatura = alturaPagina - 30;
    const posicaoTextoAssinatura = alturaPagina - 23;
    const larguraAssinatura = 105;

    const inicioAssinaturaTesoureiro = margem + 12;
    const inicioAssinaturaPastor =
      larguraPagina - margem - 12 - larguraAssinatura;

    documento.setDrawColor(80, 80, 80);
    documento.setLineWidth(0.3);

    // Linha para assinatura do tesoureiro
    documento.line(
      inicioAssinaturaTesoureiro,
      posicaoLinhaAssinatura,
      inicioAssinaturaTesoureiro + larguraAssinatura,
      posicaoLinhaAssinatura
    );

    // Linha para assinatura do pastor
    documento.line(
      inicioAssinaturaPastor,
      posicaoLinhaAssinatura,
      inicioAssinaturaPastor + larguraAssinatura,
      posicaoLinhaAssinatura
    );

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.setTextColor(60, 60, 60);

    documento.text(
      'Assinatura do Tesoureiro',
      inicioAssinaturaTesoureiro + larguraAssinatura / 2,
      posicaoTextoAssinatura,
      { align: 'center' }
    );

    documento.text(
      'Assinatura do Pastor',
      inicioAssinaturaPastor + larguraAssinatura / 2,
      posicaoTextoAssinatura,
      { align: 'center' }
    );

    // Rodapé e numeração de todas as páginas
    const totalPaginas = documento.internal.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      documento.setPage(pagina);

      documento.setFont('helvetica', 'normal');
      documento.setFontSize(8);
      documento.setTextColor(120, 120, 120);

      documento.text(
        `Relatório Financeiro | Gerado em ${dataGeracao}`,
        margem,
        alturaPagina - 8
      );

      documento.text(
        `Página ${pagina} de ${totalPaginas}`,
        larguraPagina - margem,
        alturaPagina - 8,
        { align: 'right' }
      );
    }

    const dataAtual = new Date().toISOString().slice(0, 10);

    documento.save(`relatorio_financeiro_${dataAtual}.pdf`);
  };

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setGrupo('');
    setFormaPagamento('');
    setEvento('');
  };

  if (carregando) {
    return (
      <Layout>
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-6">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Carregando dados dos relatórios...
          </div>
        </div>
      </Layout>
    );
  }

  if (erro) {
    return (
      <Layout>
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
            <h2 className="text-base font-semibold text-red-700">
              Erro ao carregar relatórios
            </h2>

            <p className="mt-2 text-sm text-red-600">{erro}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-6">
        {/* Cabeçalho */}
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              Relatórios
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Consulte e analise as movimentações financeiras.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={exportarPDF}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#29458f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#20386f] sm:w-auto"
            >
              <FileText size={17} />
              Exportar PDF
            </button>

            <button
              type="button"
              onClick={exportarExcel}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              <Download size={17} />
              Exportar Excel
            </button>
          </div>
        </header>

        {/* Filtros */}
        <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={19} className="shrink-0 text-[#29458f]" />

            <h2 className="text-base font-semibold text-gray-900">
              Filtros do relatório
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label
                htmlFor="dataInicio"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Data inicial
              </label>

              <input
                id="dataInicio"
                type="date"
                value={dataInicio}
                max={dataFim || undefined}
                onChange={(event) => setDataInicio(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f]"
              />
            </div>

            <div>
              <label
                htmlFor="dataFim"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Data final
              </label>

              <input
                id="dataFim"
                type="date"
                value={dataFim}
                min={dataInicio || undefined}
                onChange={(event) => setDataFim(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f]"
              />
            </div>

            <div>
              <label
                htmlFor="grupo"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Grupo
              </label>

              <select
                id="grupo"
                value={grupo}
                onChange={(event) => setGrupo(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f]"
              >
                <option value="">Todos os grupos</option>

                {grupos.map((item) => (
                  <option key={item.idgrupo} value={item.idgrupo}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="formaPagamento"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Forma de pagamento
              </label>

              <select
                id="formaPagamento"
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f]"
              >
                <option value="">Todas as formas</option>

                {formasPagamento.map((forma) => (
                  <option
                    key={forma.idforma_pagamento}
                    value={forma.nome}
                  >
                    {forma.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="evento"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Evento
              </label>

              <select
                id="evento"
                value={evento}
                onChange={(event) => setEvento(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f]"
              >
                <option value="">Todos os eventos</option>

                <option value="sem-evento">
                  Movimentações sem evento
                </option>

                {eventosDisponiveis.map((item) => (
                  <option key={item.idevento} value={item.idevento}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
            >
              Limpar filtros
            </button>
          </div>
        </section>

        {/* Resumo geral */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-gray-500">Total de entradas</p>

            <p className="mt-2 break-words text-xl font-semibold text-emerald-600 sm:text-2xl">
              {formatarMoeda(resumo.entradas)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-gray-500">Total de saídas</p>

            <p className="mt-2 break-words text-xl font-semibold text-red-500 sm:text-2xl">
              {formatarMoeda(resumo.saidas)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-gray-500">Saldo</p>

            <p className="mt-2 break-words text-xl font-semibold text-[#29458f] sm:text-2xl">
              {formatarMoeda(resumo.saldo)}
            </p>
          </div>
        </section>

        {/* Relatório por forma de pagamento */}
        <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Relatório por forma de pagamento
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Visualize as entradas e saídas agrupadas pela forma de pagamento utilizada.
            </p>
          </div>

          {resumoPorFormaPagamento.length > 0 ? (
            <>
              <div className="space-y-3 md:hidden">
                {resumoPorFormaPagamento.map((item) => (
                  <article
                    key={item.forma}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <h3 className="break-words text-sm font-semibold text-gray-900">
                      {item.forma}
                    </h3>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Entradas</p>
                        <p className="mt-1 break-words text-sm font-semibold text-emerald-600">
                          {formatarMoeda(item.entradas)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Saídas</p>
                        <p className="mt-1 break-words text-sm font-semibold text-red-500">
                          {formatarMoeda(item.saidas)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500">Saldo</p>
                      <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                        {formatarMoeda(item.saldo)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Forma de pagamento
                      </th>
                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Entradas
                      </th>
                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Saídas
                      </th>
                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Saldo
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {resumoPorFormaPagamento.map((item) => (
                      <tr
                        key={item.forma}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {item.forma}
                        </td>
                        <td className="px-3 py-3 text-emerald-600">
                          {formatarMoeda(item.entradas)}
                        </td>
                        <td className="px-3 py-3 text-red-500">
                          {formatarMoeda(item.saidas)}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {formatarMoeda(item.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <FileText
                size={28}
                className="mx-auto mb-2 text-gray-400"
              />
              <p className="text-sm text-gray-500">
                Nenhuma movimentação encontrada para os filtros selecionados.
              </p>
            </div>
          )}
        </section>

        {/* Resumo por categoria */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Resumo por categoria
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Distribuição das movimentações por categoria.
            </p>
          </div>

          {resumoPorCategoria.length > 0 ? (
            <>
              <div className="space-y-3 md:hidden">
                {resumoPorCategoria.map((item) => (
                  <article
                    key={item.categoria}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <h3 className="break-words text-sm font-semibold text-gray-900">
                      {item.categoria}
                    </h3>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Entradas</p>
                        <p className="mt-1 break-words text-sm font-semibold text-emerald-600">
                          {formatarMoeda(item.entradas)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Saídas</p>
                        <p className="mt-1 break-words text-sm font-semibold text-red-500">
                          {formatarMoeda(item.saidas)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Categoria
                      </th>
                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Entradas
                      </th>
                      <th className="px-3 py-3 font-semibold text-gray-700">
                        Saídas
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {resumoPorCategoria.map((item) => (
                      <tr
                        key={item.categoria}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {item.categoria}
                        </td>
                        <td className="px-3 py-3 text-emerald-600">
                          {formatarMoeda(item.entradas)}
                        </td>
                        <td className="px-3 py-3 text-red-500">
                          {formatarMoeda(item.saidas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                Nenhuma movimentação encontrada.
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default Relatorios;
