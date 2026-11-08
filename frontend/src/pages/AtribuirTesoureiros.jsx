
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Search,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { Link } from 'react-router';

import Layout from '../components/Layout';
import { apiRequest } from '../services/api';

function AtribuirTesoureiros() {
  const [grupos, setGrupos] = useState([]);
  const [tesoureiros, setTesoureiros] = useState([]);

  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [busca, setBusca] = useState('');

  const [tesoureirosSelecionados, setTesoureirosSelecionados] = useState([]);
  const [atribuicoesExistentes, setAtribuicoesExistentes] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [carregandoAtribuicoes, setCarregandoAtribuicoes] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  // Carrega grupos e tesoureiros
  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErro('');

        const token = localStorage.getItem('token');

        const [respostaGrupos, respostaTesoureiros] =
          await Promise.all([
            apiRequest('/api/grupos', { token }),
            apiRequest('/api/usuarios/tesoureiros', { token })
          ]);

        const listaGrupos = respostaGrupos.grupos || [];
        const listaTesoureiros =
          respostaTesoureiros.usuarios ||
          respostaTesoureiros.tesoureiros ||
          [];

        setGrupos(listaGrupos);
        setTesoureiros(
          listaTesoureiros.filter((usuario) => usuario.ativo)
        );

        if (listaGrupos.length > 0) {
          setGrupoSelecionado(String(listaGrupos[0].idgrupo));
        }
      } catch (error) {
        setErro(error.message);
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  // Consulta os grupos já atribuídos a cada tesoureiro
  useEffect(() => {
    if (!grupoSelecionado || tesoureiros.length === 0) {
      setAtribuicoesExistentes([]);
      setTesoureirosSelecionados([]);
      return;
    }

    let ativo = true;

    async function carregarAtribuicoes() {
      try {
        setCarregandoAtribuicoes(true);
        setErro('');
        setMensagem('');

        const token = localStorage.getItem('token');

        const resultados = await Promise.all(
          tesoureiros.map(async (tesoureiro) => {
            const resposta = await apiRequest(
              `/api/usuarios/${tesoureiro.idusuario}/grupos`,
              { token }
            );

            const gruposDoTesoureiro = resposta.grupos || [];

            const possuiGrupo = gruposDoTesoureiro.some(
              (grupo) =>
                Number(grupo.idgrupo ?? grupo.grupo_id) ===
                Number(grupoSelecionado)
            );

            return possuiGrupo ? tesoureiro.idusuario : null;
          })
        );

        if (!ativo) return;

        const idsAtribuidos = resultados.filter(
          (id) => id !== null
        );

        setAtribuicoesExistentes(idsAtribuidos);
        setTesoureirosSelecionados(idsAtribuidos);
      } catch (error) {
        if (ativo) {
          setErro(error.message);
        }
      } finally {
        if (ativo) {
          setCarregandoAtribuicoes(false);
        }
      }
    }

    carregarAtribuicoes();

    return () => {
      ativo = false;
    };
  }, [grupoSelecionado, tesoureiros]);

  // Alterna a seleção de um tesoureiro
  const alternarTesoureiro = (idusuario) => {
    setMensagem('');

    // Uma associação existente não pode ser removida nesta versão
    if (atribuicoesExistentes.includes(idusuario)) {
      setMensagem(
        'Este tesoureiro já está associado ao grupo. A remoção ainda não está disponível.'
      );
      return;
    }

    setTesoureirosSelecionados((listaAtual) => {
      if (listaAtual.includes(idusuario)) {
        return listaAtual.filter((id) => id !== idusuario);
      }

      return [...listaAtual, idusuario];
    });
  };

  // Filtra os tesoureiros
  const tesoureirosFiltrados = tesoureiros.filter((tesoureiro) => {
    const termo = busca.toLowerCase().trim();

    return (
      tesoureiro.nome.toLowerCase().includes(termo) ||
      tesoureiro.email.toLowerCase().includes(termo)
    );
  });

  // Quantidade de tesoureiros selecionados
  const quantidadeSelecionada = tesoureirosSelecionados.length;

  // Quantidade de novas atribuições pendentes
  const novasAtribuicoes = tesoureirosSelecionados.filter(
    (id) => !atribuicoesExistentes.includes(id)
  );

  // Salva as novas atribuições
  const salvarAtribuicoes = async () => {
    if (!grupoSelecionado) {
      setErro('Selecione um grupo.');
      return;
    }

    if (novasAtribuicoes.length === 0) {
      setMensagem('Não existem novas atribuições para salvar.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      setMensagem('');

      const token = localStorage.getItem('token');
      let quantidadeSalva = 0;

      // Salva uma associação por vez
      for (const idusuario of novasAtribuicoes) {
        await apiRequest(
          `/api/usuarios/${idusuario}/grupos`,
          {
            method: 'POST',
            token,
            body: {
              grupo_id: Number(grupoSelecionado)
            }
          }
        );

        quantidadeSalva++;
      }

      setMensagem(
        quantidadeSalva === 1
          ? 'Atribuição salva com sucesso!'
          : `${quantidadeSalva} atribuições salvas com sucesso!`
      );

      // Atualiza a lista de associações consultando o backend
      const resultados = await Promise.all(
        tesoureiros.map(async (tesoureiro) => {
          const resposta = await apiRequest(
            `/api/usuarios/${tesoureiro.idusuario}/grupos`,
            { token }
          );

          const gruposDoTesoureiro = resposta.grupos || [];

          const possuiGrupo = gruposDoTesoureiro.some(
            (grupo) =>
              Number(grupo.idgrupo ?? grupo.grupo_id) ===
              Number(grupoSelecionado)
          );

          return possuiGrupo ? tesoureiro.idusuario : null;
        })
      );

      const idsAtribuidos = resultados.filter(
        (id) => id !== null
      );

      setAtribuicoesExistentes(idsAtribuidos);
      setTesoureirosSelecionados(idsAtribuidos);

    } catch (error) {
      setErro(
        `Não foi possível concluir todas as atribuições: ${error.message}`
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4">

        {/* Cabeçalho */}
        <header className="mb-4">
          <Link
            to="/pastor/grupos"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={14} />
            Voltar para grupos
          </Link>

          <div>
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl lg:text-2xl">
              Atribuir Tesoureiros
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Defina quais usuários serão responsáveis pela tesouraria de
              cada grupo.
            </p>
          </div>
        </header>

        {/* Mensagens */}
        {mensagem && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {erro}
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">

          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-[#29458f]" />

            <h2 className="text-sm font-semibold text-gray-900">
              Grupo
            </h2>
          </div>

          {/* Seleção do grupo */}
          <div className="mb-5">
            <label
              htmlFor="grupo"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              Selecione o grupo
            </label>

            <select
              id="grupo"
              value={grupoSelecionado}
              onChange={(event) =>
                setGrupoSelecionado(event.target.value)
              }
              disabled={carregando || grupos.length === 0}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700 outline-none focus:border-[#29458f] disabled:bg-gray-100 sm:max-w-md"
            >
              {grupos.length === 0 && (
                <option value="">
                  Nenhum grupo disponível
                </option>
              )}

              {grupos.map((grupo) => (
                <option
                  key={grupo.idgrupo}
                  value={String(grupo.idgrupo)}
                >
                  {grupo.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Cabeçalho da lista */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Tesoureiros do grupo
              </h3>

              <p className="mt-1 text-[11px] text-gray-500">
                {quantidadeSelecionada} usuário(s) selecionado(s)
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar usuário..."
                className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-xs outline-none focus:border-[#29458f]"
              />
            </div>
          </div>

          {/* Lista de tesoureiros */}
          <div className="space-y-2">

            {carregando && (
              <p className="py-8 text-center text-xs text-gray-500">
                Carregando grupos e tesoureiros...
              </p>
            )}

            {!carregando && carregandoAtribuicoes && (
              <p className="py-8 text-center text-xs text-gray-500">
                Consultando atribuições existentes...
              </p>
            )}

            {!carregando &&
              !carregandoAtribuicoes &&
              tesoureirosFiltrados.map((tesoureiro) => {
                const selecionado =
                  tesoureirosSelecionados.includes(
                    tesoureiro.idusuario
                  );

                const jaAtribuido =
                  atribuicoesExistentes.includes(
                    tesoureiro.idusuario
                  );

                return (
                  <button
                    key={tesoureiro.idusuario}
                    type="button"
                    onClick={() =>
                      alternarTesoureiro(tesoureiro.idusuario)
                    }
                    className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition ${
                      selecionado
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {tesoureiro.nome.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-800">
                          {tesoureiro.nome}
                        </p>

                        <p className="truncate text-[10px] text-gray-500">
                          {tesoureiro.email}
                        </p>

                        {jaAtribuido && (
                          <p className="mt-1 text-[10px] text-blue-700">
                            Já associado a este grupo
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        selecionado
                          ? 'border-[#29458f] bg-[#29458f] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selecionado && <Check size={13} />}
                    </div>
                  </button>
                );
              })}

            {!carregando &&
              !carregandoAtribuicoes &&
              tesoureirosFiltrados.length === 0 && (
                <div className="py-8 text-center">
                  <UserPlus
                    size={24}
                    className="mx-auto mb-2 text-gray-400"
                  />

                  <p className="text-sm text-gray-500">
                    {busca
                      ? 'Nenhum usuário encontrado.'
                      : 'Nenhum tesoureiro ativo cadastrado.'}
                  </p>
                </div>
              )}
          </div>

          {/* Botões */}
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">

            <Link
              to="/pastor/grupos"
              className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 px-4 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="button"
              onClick={salvarAtribuicoes}
              disabled={
                carregando ||
                carregandoAtribuicoes ||
                salvando ||
                novasAtribuicoes.length === 0
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#29458f] px-4 text-xs font-medium text-white hover:bg-[#233d7d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={14} />
              {salvando ? 'Salvando...' : 'Salvar atribuições'}
            </button>
          </div>

          <p className="mt-3 text-[10px] text-gray-400">
            As atribuições existentes são preservadas. A remoção de
            associações será implementada em uma próxima etapa.
          </p>
        </section>
      </div>
    </Layout>
  );
}

export default AtribuirTesoureiros;
