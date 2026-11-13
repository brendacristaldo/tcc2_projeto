
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Estados da janela modal
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Estados da desativação
  const [eventoDesativando, setEventoDesativando] = useState(null);
  const [desativando, setDesativando] = useState(false);
  const [erroDesativacao, setErroDesativacao] = useState('');

  // Dados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState('');

  const dataInicioRef = useRef(null);
const dataFimRef = useRef(null);

const abrirCalendario = (referencia) => {
  const campo = referencia.current;

  if (!campo || campo.disabled) return;

  if (typeof campo.showPicker === 'function') {
    campo.showPicker();
  } else {
    campo.focus();
  }
};

  async function carregarEventos() {
    try {
      setCarregando(true);
      setErro('');

      const token = localStorage.getItem('token');

      const resposta = await apiRequest('/api/eventos', {
        token,
      });

      setEventos(resposta.eventos || []);
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar os eventos.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  function limparFormulario() {
    setEventoEditando(null);
    setNome('');
    setDescricao('');
    setDataInicio('');
    setDataFim('');
    setGrupoSelecionado('');
    setErroModal('');
  }

  async function abrirModal() {
    limparFormulario();
    setMensagemSucesso('');
    setModalAberto(true);

    try {
      setCarregandoGrupos(true);

      const token = localStorage.getItem('token');

      const resposta = await apiRequest('/api/grupos/meus', {
        token,
      });

      const gruposCarregados = resposta.grupos || [];

      setGrupos(gruposCarregados);

      if (gruposCarregados.length > 0) {
        setGrupoSelecionado(String(gruposCarregados[0].idgrupo));
      }
    } catch (error) {
      setErroModal(
        error.message || 'Não foi possível carregar seus grupos.'
      );
    } finally {
      setCarregandoGrupos(false);
    }
  }

  async function abrirModalEdicao(idevento) {
    limparFormulario();
    setMensagemSucesso('');
    setModalAberto(true);

    try {
      setCarregandoGrupos(true);

      const token = localStorage.getItem('token');

      const [respostaEvento, respostaGrupos] = await Promise.all([
        apiRequest(`/api/eventos/${idevento}`, {
          token,
        }),
        apiRequest('/api/grupos/meus', {
          token,
        }),
      ]);

      const evento = respostaEvento.evento;
      const gruposCarregados = respostaGrupos.grupos || [];

      setEventoEditando(evento.idevento);
      setNome(evento.nome || '');
      setDescricao(evento.descricao || '');
      setDataInicio(String(evento.data_inicio).slice(0, 10));
      setDataFim(
        evento.data_fim
          ? String(evento.data_fim).slice(0, 10)
          : ''
      );
      setGrupoSelecionado(String(evento.grupo_id));
      setGrupos(gruposCarregados);
    } catch (error) {
      setErroModal(
        error.message || 'Não foi possível carregar os dados do evento.'
      );
    } finally {
      setCarregandoGrupos(false);
    }
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setErroModal('');
    setEventoEditando(null);
  }

  async function salvarEvento(e) {
    e.preventDefault();

    setErroModal('');

    if (!nome.trim()) {
      setErroModal('Informe o nome do evento.');
      return;
    }

    if (!dataInicio) {
      setErroModal('Informe a data de início.');
      return;
    }

    if (dataFim && dataFim < dataInicio) {
      setErroModal(
        'A data de término não pode ser anterior à data de início.'
      );
      return;
    }

    if (!grupoSelecionado) {
      setErroModal('Selecione o grupo responsável.');
      return;
    }

    try {
      setSalvando(true);

      const token = localStorage.getItem('token');

      const dadosEvento = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        grupo_id: Number(grupoSelecionado),
      };

      if (eventoEditando) {
        await apiRequest(`/api/eventos/${eventoEditando}`, {
          method: 'PUT',
          token,
          body: dadosEvento,
        });

        setMensagemSucesso('Evento atualizado com sucesso!');
      } else {
        await apiRequest('/api/eventos', {
          method: 'POST',
          token,
          body: dadosEvento,
        });

        setMensagemSucesso('Evento cadastrado com sucesso!');
      }

      setModalAberto(false);
      setEventoEditando(null);

      await carregarEventos();
    } catch (error) {
      setErroModal(
        error.message || 'Não foi possível salvar o evento.'
      );
    } finally {
      setSalvando(false);
    }
  }

  function confirmarDesativacao(evento) {
    setMensagemSucesso('');
    setErroDesativacao('');
    setEventoDesativando(evento);
  }

  function cancelarDesativacao() {
    if (desativando) return;

    setEventoDesativando(null);
    setErroDesativacao('');
  }

  async function desativarEvento() {
    if (!eventoDesativando) return;

    try {
      setDesativando(true);
      setErroDesativacao('');

      const token = localStorage.getItem('token');

      await apiRequest(`/api/eventos/${eventoDesativando.idevento}`, {
        method: 'DELETE',
        token,
      });

      setEventoDesativando(null);
      setMensagemSucesso('Evento desativado com sucesso!');

      await carregarEventos();
    } catch (error) {
      setErroDesativacao(
        error.message || 'Não foi possível desativar o evento.'
      );
    } finally {
      setDesativando(false);
    }
  }

  function formatarData(data) {
    if (!data) return null;

    const dataFormatada = String(data).slice(0, 10);
    const [ano, mes, dia] = dataFormatada.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  function obterStatus(evento) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicio = new Date(
      `${String(evento.data_inicio).slice(0, 10)}T00:00:00`
    );

    const fim = evento.data_fim
      ? new Date(`${String(evento.data_fim).slice(0, 10)}T00:00:00`)
      : inicio;

    if (hoje < inicio) return 'Planejado';
    if (hoje > fim) return 'Concluído';

    return 'Em andamento';
  }

  function classeStatus(status) {
    if (status === 'Em andamento') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'Concluído') {
      return 'bg-gray-100 text-black';
    }

    return 'bg-blue-100 text-blue-700';
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-6">
        <header className="mb-5">
          <div className="mb-4">
            <Link
              to="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold text-[#29458f] transition hover:bg-blue-50"
            >
              <ArrowLeft size={19} />
              Voltar ao Dashboard
            </Link>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black sm:text-3xl">
                Eventos
              </h1>

              <p className="mt-1 text-base text-black">
                Gerencie os eventos e atividades da igreja.
              </p>
            </div>

            <button
              type="button"
              onClick={abrirModal}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#29458f] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#233d7d] sm:w-auto"
            >
              <Plus size={19} />
              Novo evento
            </button>
          </div>
        </header>

        {mensagemSucesso && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700"
          >
            {mensagemSucesso}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={21} className="shrink-0 text-[#29458f]" />

            <h2 className="text-xl font-semibold text-black">
              Eventos cadastrados ({eventos.length})
            </h2>
          </div>

          {carregando ? (
            <p className="py-12 text-center text-base text-black">
              Carregando eventos...
            </p>
          ) : erro ? (
            <div className="py-10 text-center">
              <p className="text-base text-red-600">{erro}</p>

              <button
                type="button"
                onClick={carregarEventos}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#29458f] px-4 py-2.5 text-base font-semibold text-white hover:bg-[#233d7d]"
              >
                Tentar novamente
              </button>
            </div>
          ) : eventos.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays
                size={34}
                className="mx-auto mb-3 text-black"
              />

              <p className="text-base font-semibold text-black">
                Nenhum evento cadastrado.
              </p>

              <p className="mt-1 text-base text-black">
                Utilize o botão acima para cadastrar um evento.
              </p>
            </div>
          ) : (
            <>
              {/* Cards para celular */}
              <div className="space-y-3 md:hidden">
                {eventos.map((evento) => {
                  const status = obterStatus(evento);
                  const dataInicioFormatada = formatarData(evento.data_inicio);
                  const dataFimFormatada = formatarData(evento.data_fim);

                  return (
                    <article
                      key={evento.idevento}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-semibold text-black">
                            {evento.nome}
                          </h3>

                          <p className="mt-1 text-sm text-black">
                            {evento.grupo_nome}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${classeStatus(status)}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-sm text-black">
                        <CalendarDays
                          size={17}
                          className="shrink-0 text-black"
                        />

                        <span>
                          {dataFimFormatada &&
                          dataInicioFormatada !== dataFimFormatada
                            ? `${dataInicioFormatada} até ${dataFimFormatada}`
                            : dataInicioFormatada}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                        <button
                          type="button"
                          onClick={() => abrirModalEdicao(evento.idevento)}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-base font-semibold text-black transition hover:bg-gray-50"
                        >
                          <Pencil size={18} />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmarDesativacao(evento)}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-base font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                          Desativar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Tabela para telas maiores */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-base">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-3 font-semibold text-black">
                        Evento
                      </th>

                      <th className="px-3 py-3 font-semibold text-black">
                        Período
                      </th>

                      <th className="px-3 py-3 font-semibold text-black">
                        Grupo
                      </th>

                      <th className="px-3 py-3 font-semibold text-black">
                        Status
                      </th>

                      <th className="px-3 py-3 text-center font-semibold text-black">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {eventos.map((evento) => {
                      const status = obterStatus(evento);
                      const dataInicioFormatada = formatarData(evento.data_inicio);
                      const dataFimFormatada = formatarData(evento.data_fim);

                      return (
                        <tr
                          key={evento.idevento}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                        >
                          <td className="max-w-xs break-words px-3 py-4 font-medium text-black">
                            {evento.nome}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-black">
                            {dataFimFormatada &&
                            dataInicioFormatada !== dataFimFormatada
                              ? `${dataInicioFormatada} - ${dataFimFormatada}`
                              : dataInicioFormatada}
                          </td>

                          <td className="px-3 py-4 text-black">
                            {evento.grupo_nome}
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${classeStatus(status)}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="px-3 py-4">
                            <div className="flex justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => abrirModalEdicao(evento.idevento)}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-black transition hover:bg-gray-100"
                                aria-label="Editar evento"
                                title="Editar evento"
                              >
                                <Pencil size={19} />
                              </button>

                              <button
                                type="button"
                                onClick={() => confirmarDesativacao(evento)}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-black transition hover:bg-red-50 hover:text-red-600"
                                aria-label="Desativar evento"
                                title="Desativar evento"
                              >
                                <Trash2 size={19} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Modal de cadastro e edição */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fecharModal();
          }}
        >
          <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl sm:max-h-[calc(100dvh-2.5rem)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-200 bg-white p-4 sm:p-5">
              <div>
                <h2 className="text-xl font-semibold text-black sm:text-2xl">
                  {eventoEditando ? 'Editar evento' : 'Novo evento'}
                </h2>

                <p className="mt-1 text-base text-black">
                  {eventoEditando
                    ? 'Altere as informações do evento.'
                    : 'Preencha as informações para cadastrar um evento.'}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-black transition hover:bg-gray-100 disabled:opacity-50"
                aria-label="Fechar modal"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={salvarEvento}>
              <div className="space-y-4 p-4 sm:p-5">
                {erroModal && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-base leading-6 text-red-600"
                  >
                    {erroModal}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="nomeEvento"
                    className="mb-2 block text-base font-semibold text-black"
                  >
                    Nome do evento *
                  </label>

                  <input
                    id="nomeEvento"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={100}
                    required
                    disabled={salvando}
                    placeholder="Ex.: Culto especial"
                    className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base text-black outline-none transition placeholder:text-black focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="descricaoEvento"
                    className="mb-2 block text-base font-semibold text-black"
                  >
                    Descrição
                  </label>

                  <textarea
                    id="descricaoEvento"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    maxLength={255}
                    rows={3}
                    disabled={salvando}
                    placeholder="Descreva brevemente o evento..."
                    className="min-h-28 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-base text-black outline-none transition placeholder:text-black focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] disabled:bg-gray-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div>
    <label
      htmlFor="dataInicio"
      className="mb-2 block text-base font-semibold text-black"
    >
      Data de início *
    </label>

    <div className="relative">
      <input
        ref={dataInicioRef}
        id="dataInicio"
        type="date"
        value={dataInicio}
        onChange={(e) => setDataInicio(e.target.value)}
        required
        disabled={salvando}
        className="h-12 w-full rounded-lg border border-gray-300 px-2 pr-12 text-base text-black outline-none transition focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] disabled:bg-gray-100"
      />

      <button
        type="button"
        onClick={() => abrirCalendario(dataInicioRef)}
        disabled={salvando}
        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#29458f] transition hover:bg-blue-50 disabled:opacity-50"
        aria-label="Abrir calendário da data de início"
      >
        <CalendarDays size={21} />
      </button>
    </div>
  </div>

  <div>
    <label
      htmlFor="dataFim"
      className="mb-2 block text-base font-semibold text-black"
    >
      Data de término
    </label>

    <div className="relative">
      <input
        ref={dataFimRef}
        id="dataFim"
        type="date"
        value={dataFim}
        min={dataInicio || undefined}
        onChange={(e) => setDataFim(e.target.value)}
        disabled={salvando}
        className="h-12 w-full rounded-lg border border-gray-300 px-2 pr-12 text-base text-black outline-none transition focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] disabled:bg-gray-100"
      />

      <button
        type="button"
        onClick={() => abrirCalendario(dataFimRef)}
        disabled={salvando}
        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#29458f] transition hover:bg-blue-50 disabled:opacity-50"
        aria-label="Abrir calendário da data de término"
      >
        <CalendarDays size={21} />
      </button>
    </div>
  </div>
</div>

                <div>
                  <label
                    htmlFor="grupoEvento"
                    className="mb-2 block text-base font-semibold text-black"
                  >
                    Grupo responsável *
                  </label>

                  {carregandoGrupos ? (
                    <p className="py-3 text-base text-black">
                      Carregando grupos...
                    </p>
                  ) : grupos.length === 0 ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-base text-amber-700">
                      Nenhum grupo associado ao seu usuário.
                    </p>
                  ) : (
                    <select
                      id="grupoEvento"
                      value={grupoSelecionado}
                      onChange={(e) => setGrupoSelecionado(e.target.value)}
                      required
                      disabled={salvando}
                      className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-black outline-none transition focus:border-[#29458f] focus:ring-1 focus:ring-[#29458f] disabled:bg-gray-100"
                    >
                      <option value="">Selecione um grupo</option>

                      {grupos.map((grupo) => (
                        <option
                          key={grupo.idgrupo}
                          value={grupo.idgrupo}
                        >
                          {grupo.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <p className="text-sm text-black">
                  * Campos obrigatórios.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 p-4 sm:flex-row sm:justify-end sm:p-5">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="min-h-11 rounded-lg border border-gray-300 px-4 text-base font-semibold text-black transition hover:bg-gray-50 disabled:opacity-50 sm:min-w-28"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando || carregandoGrupos || grupos.length === 0}
                  className="min-h-11 rounded-lg bg-[#29458f] px-4 text-base font-semibold text-white transition hover:bg-[#233d7d] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-40"
                >
                  {salvando
                    ? eventoEditando
                      ? 'Salvando...'
                      : 'Cadastrando...'
                    : eventoEditando
                      ? 'Salvar alterações'
                      : 'Cadastrar evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de desativação */}
      {eventoDesativando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-5">
          <div className="my-auto w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-black sm:text-2xl">
                  Desativar evento
                </h2>

                <button
                  type="button"
                  onClick={cancelarDesativacao}
                  disabled={desativando}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-black transition hover:bg-gray-100 disabled:opacity-50"
                  aria-label="Fechar confirmação"
                >
                  <X size={22} />
                </button>
              </div>

              <p className="mt-3 text-base leading-6 text-black">
                Tem certeza de que deseja desativar o evento{' '}
                <strong>{eventoDesativando.nome}</strong>?
              </p>

              <p className="mt-2 text-base leading-6 text-black">
                O evento deixará de aparecer na listagem, mas seus dados e
                vínculos com movimentações financeiras serão preservados.
              </p>
            </div>

            {erroDesativacao && (
              <div
                role="alert"
                className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-base text-red-600 sm:mx-5"
              >
                {erroDesativacao}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:p-5">
              <button
                type="button"
                onClick={cancelarDesativacao}
                disabled={desativando}
                className="min-h-11 rounded-lg border border-gray-300 px-4 text-base font-semibold text-black transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={desativarEvento}
                disabled={desativando}
                className="min-h-11 rounded-lg bg-red-600 px-4 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {desativando ? 'Desativando...' : 'Confirmar desativação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Eventos;
