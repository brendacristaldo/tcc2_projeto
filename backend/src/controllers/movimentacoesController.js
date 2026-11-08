
const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

// Normalizar datas retornadas pelo PostgreSQL
function normalizarDataBanco(dataBanco) {
    if (dataBanco instanceof Date) {
        const ano = dataBanco.getFullYear();
        const mes = String(dataBanco.getMonth() + 1).padStart(2, '0');
        const dia = String(dataBanco.getDate()).padStart(2, '0');

        return `${ano}-${mes}-${dia}`;
    }

    return String(dataBanco).slice(0, 10);
}

// Listar movimentações dos grupos associados ao tesoureiro autenticado
async function listarMovimentacoes(req, res) {
    try {
        const usuarioId = req.usuario.idusuario;

        const resultado = await pool.query(
            `SELECT
                m.idmovimentacao,
                m.tipo,
                m.valor,
                m.observacao,
                m.data,
                m.criado_em,
                m.atualizado_em,
                m.grupo_id,
                g.nome AS grupo,
                c.nome AS categoria,
                fp.nome AS forma_pagamento,
                e.idevento,
                e.nome AS evento,
                u.nome AS responsavel,
                CASE
                    WHEN comp.movimentacao_id IS NOT NULL THEN
                        json_build_object(
                            'nome_arquivo', comp.nome_arquivo,
                            'caminho_arquivo', comp.caminho_arquivo,
                            'criado_em', comp.criado_em
                        )
                    ELSE NULL
                END AS comprovante
            FROM movimentacao m
            INNER JOIN grupo g
                ON g.idgrupo = m.grupo_id
            INNER JOIN categoria c
                ON c.idcategoria = m.categoria_id
            INNER JOIN forma_pagamento fp
                ON fp.idforma_pagamento = m.forma_pagamento_id
            INNER JOIN usuario u
                ON u.idusuario = m.usuario_id
            LEFT JOIN evento e
                ON e.idevento = m.evento_id
            LEFT JOIN LATERAL (
                SELECT
                    cp.nome_arquivo,
                    cp.caminho_arquivo,
                    cp.criado_em,
                    cp.movimentacao_id
                FROM comprovante cp
                WHERE cp.movimentacao_id = m.idmovimentacao
                ORDER BY cp.criado_em DESC
                LIMIT 1
            ) comp ON TRUE
            INNER JOIN usuario_grupo ug
                ON ug.grupo_id = m.grupo_id
                AND ug.usuario_id = $1
            ORDER BY m.data DESC, m.idmovimentacao DESC`,
            [usuarioId]
        );

        return res.status(200).json({
            movimentacoes: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar movimentações:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao consultar as movimentações.'
        });
    }
}

// Listar categorias e formas de pagamento para os formulários
async function listarOpcoesCadastro(req, res) {
    try {
        const [categorias, formasPagamento] = await Promise.all([
            pool.query(
                `SELECT idcategoria, nome
                 FROM categoria
                 WHERE ativo = TRUE
                 ORDER BY nome`
            ),
            pool.query(
                `SELECT idforma_pagamento, nome
                 FROM forma_pagamento
                 WHERE ativo = TRUE
                 ORDER BY nome`
            )
        ]);

        return res.status(200).json({
            categorias: categorias.rows,
            formasPagamento: formasPagamento.rows
        });

    } catch (error) {
        console.error('Erro ao consultar opções de cadastro:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao consultar as opções de cadastro.'
        });
    }
}

// Cadastrar uma nova entrada financeira com comprovante opcional
async function cadastrarEntrada(req, res) {
    const conexao = await pool.connect();

    let caminhoArquivo = null;

    try {
        const usuarioId = req.usuario.idusuario;

        const {
            valor,
            observacao,
            data,
            grupo_id,
            categoria_id,
            forma_pagamento_id,
            evento_id
        } = req.body;

        const valorNumerico = Number(valor);

        if (
            valor === undefined ||
            valor === null ||
            valor === '' ||
            !Number.isFinite(valorNumerico) ||
            valorNumerico <= 0
        ) {
            return res.status(400).json({
                mensagem: 'Informe um valor válido para a entrada.'
            });
        }

        if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return res.status(400).json({
                mensagem: 'Informe uma data válida.'
            });
        }

        const dataVerificada = new Date(`${data}T00:00:00Z`);

        if (
            Number.isNaN(dataVerificada.getTime()) ||
            dataVerificada.toISOString().slice(0, 10) !== data
        ) {
            return res.status(400).json({
                mensagem: 'A data informada não existe.'
            });
        }

        if (
            observacao !== undefined &&
            observacao !== null &&
            typeof observacao !== 'string'
        ) {
            return res.status(400).json({
                mensagem: 'A observação informada é inválida.'
            });
        }

        const grupoId = Number(grupo_id);
        const categoriaId = Number(categoria_id);
        const formaPagamentoId = Number(forma_pagamento_id);

        if (
            !Number.isInteger(grupoId) || grupoId <= 0 ||
            !Number.isInteger(categoriaId) || categoriaId <= 0 ||
            !Number.isInteger(formaPagamentoId) || formaPagamentoId <= 0
        ) {
            return res.status(400).json({
                mensagem: 'Selecione um grupo, uma categoria e uma forma de pagamento válidos.'
            });
        }

        const grupoAssociado = await conexao.query(
            `SELECT grupo_id
             FROM usuario_grupo
             WHERE usuario_id = $1
               AND grupo_id = $2`,
            [usuarioId, grupoId]
        );

        if (grupoAssociado.rows.length === 0) {
            return res.status(403).json({
                mensagem: 'Você não tem permissão para registrar movimentações neste grupo.'
            });
        }

        const grupo = await conexao.query(
            `SELECT idgrupo
             FROM grupo
             WHERE idgrupo = $1
               AND ativo = TRUE`,
            [grupoId]
        );

        if (grupo.rows.length === 0) {
            return res.status(400).json({
                mensagem: 'Não é possível registrar movimentações em um grupo inativo.'
            });
        }

        const categoria = await conexao.query(
            `SELECT idcategoria
             FROM categoria
             WHERE idcategoria = $1
               AND ativo = TRUE`,
            [categoriaId]
        );

        if (categoria.rows.length === 0) {
            return res.status(400).json({
                mensagem: 'A categoria selecionada não existe ou está inativa.'
            });
        }

        const formaPagamento = await conexao.query(
            `SELECT idforma_pagamento
             FROM forma_pagamento
             WHERE idforma_pagamento = $1
               AND ativo = TRUE`,
            [formaPagamentoId]
        );

        if (formaPagamento.rows.length === 0) {
            return res.status(400).json({
                mensagem: 'A forma de pagamento selecionada não existe ou está inativa.'
            });
        }

        let eventoId = null;

        if (
            evento_id !== undefined &&
            evento_id !== null &&
            evento_id !== ''
        ) {
            eventoId = Number(evento_id);

            if (!Number.isInteger(eventoId) || eventoId <= 0) {
                return res.status(400).json({
                    mensagem: 'O evento selecionado é inválido.'
                });
            }

            const evento = await conexao.query(
                `SELECT idevento
                 FROM evento
                 WHERE idevento = $1
                   AND grupo_id = $2
                   AND ativo = TRUE`,
                [eventoId, grupoId]
            );

            if (evento.rows.length === 0) {
                return res.status(400).json({
                    mensagem: 'O evento não existe, está inativo ou não pertence ao grupo selecionado.'
                });
            }
        }

        await conexao.query('BEGIN');

        const resultado = await conexao.query(
            `INSERT INTO movimentacao (
                tipo,
                valor,
                observacao,
                data,
                usuario_id,
                grupo_id,
                categoria_id,
                forma_pagamento_id,
                evento_id
            )
            VALUES (
                'entrada',
                $1, $2, $3, $4, $5, $6, $7, $8
            )
            RETURNING *`,
            [
                valorNumerico,
                observacao?.trim() || null,
                data,
                usuarioId,
                grupoId,
                categoriaId,
                formaPagamentoId,
                eventoId
            ]
        );

        const movimentacao = resultado.rows[0];

        if (req.file) {
            caminhoArquivo = `uploads/comprovantes/${req.file.filename}`;

            await conexao.query(
                `INSERT INTO comprovante (
                    nome_arquivo,
                    caminho_arquivo,
                    criado_em,
                    movimentacao_id
                )
                VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
                [
                    req.file.originalname,
                    caminhoArquivo,
                    movimentacao.idmovimentacao
                ]
            );
        }

        await conexao.query('COMMIT');

        return res.status(201).json({
            mensagem: 'Entrada cadastrada com sucesso!',
            movimentacao,
            comprovante: req.file
                ? {
                    nome_arquivo: req.file.originalname,
                    caminho_arquivo: caminhoArquivo
                }
                : null
        });

    } catch (error) {
        await conexao.query('ROLLBACK');

        if (req.file) {
            const caminhoCompleto = path.join(
                __dirname,
                '../../uploads/comprovantes',
                req.file.filename
            );

            try {
                if (fs.existsSync(caminhoCompleto)) {
                    fs.unlinkSync(caminhoCompleto);
                }
            } catch (erroArquivo) {
                console.error('Erro ao remover arquivo:', erroArquivo);
            }
        }

        console.error('Erro ao cadastrar entrada:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao cadastrar a entrada.'
        });

    } finally {
        conexao.release();
    }
}

// Cadastrar uma nova saída financeira com comprovante opcional
async function cadastrarSaida(req, res) {
    let conexao;
    let transacaoIniciada = false;

    async function removerArquivoEnviado() {
        if (!req.file) return;

        const caminhoCompleto = path.join(
            __dirname,
            '../../uploads/comprovantes',
            req.file.filename
        );

        try {
            await fs.promises.unlink(caminhoCompleto);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Erro ao remover comprovante:', error);
            }
        }
    }

    async function responderErro(status, mensagem) {
        await removerArquivoEnviado();

        return res.status(status).json({ mensagem });
    }

    try {
        conexao = await pool.connect();

        const usuarioId = req.usuario.idusuario;

        const {
            valor,
            observacao,
            data,
            grupo_id,
            categoria_id,
            forma_pagamento_id,
            evento_id
        } = req.body;

        const valorNumerico = Number(valor);

        if (
            valor === undefined ||
            valor === null ||
            valor === '' ||
            !Number.isFinite(valorNumerico) ||
            valorNumerico <= 0
        ) {
            return await responderErro(
                400,
                'Informe um valor válido para a saída.'
            );
        }

        if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return await responderErro(
                400,
                'Informe uma data válida.'
            );
        }

        const dataVerificada = new Date(`${data}T00:00:00Z`);

        if (
            Number.isNaN(dataVerificada.getTime()) ||
            dataVerificada.toISOString().slice(0, 10) !== data
        ) {
            return await responderErro(
                400,
                'A data informada não existe.'
            );
        }

        if (
            observacao !== undefined &&
            observacao !== null &&
            typeof observacao !== 'string'
        ) {
            return await responderErro(
                400,
                'A observação informada é inválida.'
            );
        }

        const grupoId = Number(grupo_id);
        const categoriaId = Number(categoria_id);
        const formaPagamentoId = Number(forma_pagamento_id);

        if (
            !Number.isInteger(grupoId) || grupoId <= 0 ||
            !Number.isInteger(categoriaId) || categoriaId <= 0 ||
            !Number.isInteger(formaPagamentoId) || formaPagamentoId <= 0
        ) {
            return await responderErro(
                400,
                'Selecione um grupo, uma categoria e uma forma de pagamento válidos.'
            );
        }

        const grupoAssociado = await conexao.query(
            `SELECT grupo_id
             FROM usuario_grupo
             WHERE usuario_id = $1
               AND grupo_id = $2`,
            [usuarioId, grupoId]
        );

        if (grupoAssociado.rows.length === 0) {
            return await responderErro(
                403,
                'Você não tem permissão para registrar movimentações neste grupo.'
            );
        }

        const grupo = await conexao.query(
            `SELECT idgrupo
             FROM grupo
             WHERE idgrupo = $1
               AND ativo = TRUE`,
            [grupoId]
        );

        if (grupo.rows.length === 0) {
            return await responderErro(
                400,
                'Não é possível registrar movimentações em um grupo inativo.'
            );
        }

        const categoria = await conexao.query(
            `SELECT idcategoria
             FROM categoria
             WHERE idcategoria = $1
               AND ativo = TRUE`,
            [categoriaId]
        );

        if (categoria.rows.length === 0) {
            return await responderErro(
                400,
                'A categoria selecionada não existe ou está inativa.'
            );
        }

        const formaPagamento = await conexao.query(
            `SELECT idforma_pagamento
             FROM forma_pagamento
             WHERE idforma_pagamento = $1
               AND ativo = TRUE`,
            [formaPagamentoId]
        );

        if (formaPagamento.rows.length === 0) {
            return await responderErro(
                400,
                'A forma de pagamento selecionada não existe ou está inativa.'
            );
        }

        let eventoId = null;

        if (
            evento_id !== undefined &&
            evento_id !== null &&
            evento_id !== ''
        ) {
            eventoId = Number(evento_id);

            if (!Number.isInteger(eventoId) || eventoId <= 0) {
                return await responderErro(
                    400,
                    'O evento selecionado é inválido.'
                );
            }

            const evento = await conexao.query(
                `SELECT idevento
                 FROM evento
                 WHERE idevento = $1
                   AND grupo_id = $2
                   AND ativo = TRUE`,
                [eventoId, grupoId]
            );

            if (evento.rows.length === 0) {
                return await responderErro(
                    400,
                    'O evento não existe, está inativo ou não pertence ao grupo selecionado.'
                );
            }
        }

        await conexao.query('BEGIN');
        transacaoIniciada = true;

        const resultado = await conexao.query(
            `INSERT INTO movimentacao (
                tipo,
                valor,
                observacao,
                data,
                usuario_id,
                grupo_id,
                categoria_id,
                forma_pagamento_id,
                evento_id
            )
            VALUES (
                'saida',
                $1, $2, $3, $4, $5, $6, $7, $8
            )
            RETURNING *`,
            [
                valorNumerico,
                observacao?.trim() || null,
                data,
                usuarioId,
                grupoId,
                categoriaId,
                formaPagamentoId,
                eventoId
            ]
        );

        const movimentacao = resultado.rows[0];

        let caminhoArquivo = null;

        if (req.file) {
            caminhoArquivo = `uploads/comprovantes/${req.file.filename}`;

            await conexao.query(
                `INSERT INTO comprovante (
                    nome_arquivo,
                    caminho_arquivo,
                    criado_em,
                    movimentacao_id
                )
                VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
                [
                    req.file.originalname,
                    caminhoArquivo,
                    movimentacao.idmovimentacao
                ]
            );
        }

        await conexao.query('COMMIT');
        transacaoIniciada = false;

        return res.status(201).json({
            mensagem: 'Saída cadastrada com sucesso!',
            movimentacao,
            comprovante: req.file
                ? {
                    nome_arquivo: req.file.originalname,
                    caminho_arquivo: caminhoArquivo
                }
                : null
        });

    } catch (error) {
        if (conexao && transacaoIniciada) {
            try {
                await conexao.query('ROLLBACK');
            } catch (erroRollback) {
                console.error('Erro ao desfazer transação:', erroRollback);
            }
        }

        await removerArquivoEnviado();

        console.error('Erro ao cadastrar saída:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao cadastrar a saída.'
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
}

// Atualizar uma movimentação financeira com registro de auditoria
async function atualizarMovimentacao(req, res) {
    let conexao;
    let transacaoIniciada = false;

    async function responderErro(status, mensagem) {
        if (conexao && transacaoIniciada) {
            await conexao.query('ROLLBACK');
            transacaoIniciada = false;
        }

        return res.status(status).json({ mensagem });
    }

    try {
        const usuarioId = req.usuario.idusuario;
        const movimentacaoId = req.params.id;

        if (!/^[1-9]\d*$/.test(movimentacaoId)) {
            return res.status(400).json({
                mensagem: 'Identificador da movimentação inválido.'
            });
        }

        const {
            valor,
            observacao,
            data,
            grupo_id,
            categoria_id,
            forma_pagamento_id,
            evento_id
        } = req.body;

        const valorNumerico = Number(valor);

        if (
            valor === undefined ||
            valor === null ||
            valor === '' ||
            !Number.isFinite(valorNumerico) ||
            valorNumerico <= 0
        ) {
            return res.status(400).json({
                mensagem: 'Informe um valor válido para a movimentação.'
            });
        }

        if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return res.status(400).json({
                mensagem: 'Informe uma data válida.'
            });
        }

        const dataVerificada = new Date(`${data}T00:00:00Z`);

        if (
            Number.isNaN(dataVerificada.getTime()) ||
            dataVerificada.toISOString().slice(0, 10) !== data
        ) {
            return res.status(400).json({
                mensagem: 'A data informada não existe.'
            });
        }

        if (
            observacao !== undefined &&
            observacao !== null &&
            typeof observacao !== 'string'
        ) {
            return res.status(400).json({
                mensagem: 'A observação informada é inválida.'
            });
        }

        const grupoId = Number(grupo_id);
        const categoriaId = Number(categoria_id);
        const formaPagamentoId = Number(forma_pagamento_id);

        if (
            !Number.isInteger(grupoId) || grupoId <= 0 ||
            !Number.isInteger(categoriaId) || categoriaId <= 0 ||
            !Number.isInteger(formaPagamentoId) || formaPagamentoId <= 0
        ) {
            return res.status(400).json({
                mensagem: 'Selecione um grupo, uma categoria e uma forma de pagamento válidos.'
            });
        }

        let eventoId = null;

        if (
            evento_id !== undefined &&
            evento_id !== null &&
            evento_id !== ''
        ) {
            eventoId = Number(evento_id);

            if (!Number.isInteger(eventoId) || eventoId <= 0) {
                return res.status(400).json({
                    mensagem: 'O evento selecionado é inválido.'
                });
            }
        }

        conexao = await pool.connect();

        await conexao.query('BEGIN');
        transacaoIniciada = true;

        const movimentacaoExistente = await conexao.query(
            `SELECT m.*
             FROM movimentacao m
             INNER JOIN usuario_grupo ug
                ON ug.grupo_id = m.grupo_id
                AND ug.usuario_id = $1
             WHERE m.idmovimentacao = $2
             FOR UPDATE OF m`,
            [usuarioId, movimentacaoId]
        );

        if (movimentacaoExistente.rows.length === 0) {
            return await responderErro(
                404,
                'Movimentação não encontrada ou sem permissão de acesso.'
            );
        }

        const movimentacaoAnterior = movimentacaoExistente.rows[0];

        const grupoAssociado = await conexao.query(
            `SELECT grupo_id
             FROM usuario_grupo
             WHERE usuario_id = $1
               AND grupo_id = $2`,
            [usuarioId, grupoId]
        );

        if (grupoAssociado.rows.length === 0) {
            return await responderErro(
                403,
                'Você não tem permissão para editar movimentações neste grupo.'
            );
        }

        const grupoAtualId = Number(movimentacaoAnterior.grupo_id);

        if (grupoId !== grupoAtualId) {
            const grupoDestino = await conexao.query(
                `SELECT idgrupo
                 FROM grupo
                 WHERE idgrupo = $1
                   AND ativo = TRUE`,
                [grupoId]
            );

            if (grupoDestino.rows.length === 0) {
                return await responderErro(
                    400,
                    'Não é possível transferir uma movimentação para um grupo inativo.'
                );
            }
        }

        const categoria = await conexao.query(
            `SELECT idcategoria
             FROM categoria
             WHERE idcategoria = $1
               AND ativo = TRUE`,
            [categoriaId]
        );

        if (categoria.rows.length === 0) {
            return await responderErro(
                400,
                'A categoria selecionada não existe ou está inativa.'
            );
        }

        const formaPagamento = await conexao.query(
            `SELECT idforma_pagamento
             FROM forma_pagamento
             WHERE idforma_pagamento = $1
               AND ativo = TRUE`,
            [formaPagamentoId]
        );

        if (formaPagamento.rows.length === 0) {
            return await responderErro(
                400,
                'A forma de pagamento selecionada não existe ou está inativa.'
            );
        }

        if (eventoId !== null) {
            const evento = await conexao.query(
                `SELECT idevento
                 FROM evento
                 WHERE idevento = $1
                   AND grupo_id = $2
                   AND ativo = TRUE`,
                [eventoId, grupoId]
            );

            if (evento.rows.length === 0) {
                return await responderErro(
                    400,
                    'O evento não existe, está inativo ou não pertence ao grupo selecionado.'
                );
            }
        }

        const observacaoNova = observacao?.trim() || null;

        // Compara somente os campos definidos como auditáveis.
        // A observação não participa dessa comparação.
        const houveAlteracaoAuditavel =
            Number(movimentacaoAnterior.valor) !== valorNumerico ||
            normalizarDataBanco(movimentacaoAnterior.data) !== data ||
            Number(movimentacaoAnterior.grupo_id) !== grupoId ||
            Number(movimentacaoAnterior.categoria_id) !== categoriaId ||
            Number(movimentacaoAnterior.forma_pagamento_id) !== formaPagamentoId ||
            (
                movimentacaoAnterior.evento_id === null
                    ? null
                    : Number(movimentacaoAnterior.evento_id)
            ) !== eventoId;

        const resultado = await conexao.query(
            `UPDATE movimentacao
             SET
                valor = $1,
                observacao = $2,
                data = $3,
                grupo_id = $4,
                categoria_id = $5,
                forma_pagamento_id = $6,
                evento_id = $7,
                atualizado_em = CURRENT_TIMESTAMP
             WHERE idmovimentacao = $8
             RETURNING *`,
            [
                valorNumerico,
                observacaoNova,
                data,
                grupoId,
                categoriaId,
                formaPagamentoId,
                eventoId,
                movimentacaoId
            ]
        );

        const movimentacaoAtualizada = resultado.rows[0];

        if (houveAlteracaoAuditavel) {
            const usuario = await conexao.query(
                `SELECT nome
                 FROM usuario
                 WHERE idusuario = $1`,
                [usuarioId]
            );

            if (usuario.rows.length === 0) {
                throw new Error(
                    'Não foi possível identificar o usuário responsável pela alteração.'
                );
            }

            const dadosAnteriores = {
                idmovimentacao: movimentacaoAnterior.idmovimentacao,
                tipo: movimentacaoAnterior.tipo,
                valor: movimentacaoAnterior.valor,
                observacao: movimentacaoAnterior.observacao,
                data: normalizarDataBanco(movimentacaoAnterior.data),
                usuario_id: movimentacaoAnterior.usuario_id,
                grupo_id: movimentacaoAnterior.grupo_id,
                categoria_id: movimentacaoAnterior.categoria_id,
                forma_pagamento_id: movimentacaoAnterior.forma_pagamento_id,
                evento_id: movimentacaoAnterior.evento_id,
                criado_em: movimentacaoAnterior.criado_em,
                atualizado_em: movimentacaoAnterior.atualizado_em
            };

            const dadosNovos = {
                idmovimentacao: movimentacaoAtualizada.idmovimentacao,
                tipo: movimentacaoAtualizada.tipo,
                valor: movimentacaoAtualizada.valor,
                observacao: movimentacaoAtualizada.observacao,
                data: normalizarDataBanco(movimentacaoAtualizada.data),
                usuario_id: movimentacaoAtualizada.usuario_id,
                grupo_id: movimentacaoAtualizada.grupo_id,
                categoria_id: movimentacaoAtualizada.categoria_id,
                forma_pagamento_id: movimentacaoAtualizada.forma_pagamento_id,
                evento_id: movimentacaoAtualizada.evento_id,
                criado_em: movimentacaoAtualizada.criado_em,
                atualizado_em: movimentacaoAtualizada.atualizado_em
            };

            await conexao.query(
                `INSERT INTO auditoria (
                    movimentacao_id,
                    usuario_id,
                    usuario_nome,
                    operacao,
                    dados_anteriores,
                    dados_novos
                )
                VALUES ($1, $2, $3, 'edicao', $4, $5)`,
                [
                    movimentacaoId,
                    usuarioId,
                    usuario.rows[0].nome,
                    JSON.stringify(dadosAnteriores),
                    JSON.stringify(dadosNovos)
                ]
            );
        }

        await conexao.query('COMMIT');
        transacaoIniciada = false;

        return res.status(200).json({
            mensagem: 'Movimentação atualizada com sucesso!',
            movimentacao: movimentacaoAtualizada,
            auditoriaRegistrada: houveAlteracaoAuditavel
        });

    } catch (error) {
        if (conexao && transacaoIniciada) {
            try {
                await conexao.query('ROLLBACK');
                transacaoIniciada = false;
            } catch (erroRollback) {
                console.error('Erro ao desfazer transação:', erroRollback);
            }
        }

        console.error('Erro ao atualizar movimentação:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao atualizar a movimentação.'
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
}

// Excluir definitivamente uma movimentação financeira

// Excluir definitivamente uma movimentação financeira com registro de auditoria
async function excluirMovimentacao(req, res) {
    let conexao;
    let transacaoIniciada = false;

    try {
        const usuarioId = req.usuario.idusuario;
        const movimentacaoId = req.params.id;

        if (!/^[1-9]\d*$/.test(movimentacaoId)) {
            return res.status(400).json({
                mensagem: 'Identificador da movimentação inválido.'
            });
        }

        conexao = await pool.connect();

        await conexao.query('BEGIN');
        transacaoIniciada = true;

        // Busca a movimentação e verifica a permissão do tesoureiro.
        // O bloqueio impede alterações simultâneas durante a exclusão.
        const movimentacaoExistente = await conexao.query(
            `SELECT m.*
             FROM movimentacao m
             INNER JOIN usuario_grupo ug
                ON ug.grupo_id = m.grupo_id
                AND ug.usuario_id = $1
             WHERE m.idmovimentacao = $2
             FOR UPDATE OF m`,
            [usuarioId, movimentacaoId]
        );

        if (movimentacaoExistente.rows.length === 0) {
            await conexao.query('ROLLBACK');
            transacaoIniciada = false;

            return res.status(404).json({
                mensagem: 'Movimentação não encontrada ou sem permissão de acesso.'
            });
        }

        const movimentacaoAnterior = movimentacaoExistente.rows[0];

        // Identifica o usuário responsável pela exclusão
        const usuario = await conexao.query(
            `SELECT nome
             FROM usuario
             WHERE idusuario = $1`,
            [usuarioId]
        );

        if (usuario.rows.length === 0) {
            throw new Error(
                'Não foi possível identificar o usuário responsável pela exclusão.'
            );
        }

        // Preserva todos os dados da movimentação antes da exclusão
        const dadosAnteriores = {
            idmovimentacao: movimentacaoAnterior.idmovimentacao,
            tipo: movimentacaoAnterior.tipo,
            valor: movimentacaoAnterior.valor,
            observacao: movimentacaoAnterior.observacao,
            data: normalizarDataBanco(movimentacaoAnterior.data),
            usuario_id: movimentacaoAnterior.usuario_id,
            grupo_id: movimentacaoAnterior.grupo_id,
            categoria_id: movimentacaoAnterior.categoria_id,
            forma_pagamento_id: movimentacaoAnterior.forma_pagamento_id,
            evento_id: movimentacaoAnterior.evento_id,
            criado_em: movimentacaoAnterior.criado_em,
            atualizado_em: movimentacaoAnterior.atualizado_em
        };

        // Registra a exclusão na tabela de auditoria
        await conexao.query(
            `INSERT INTO auditoria (
                movimentacao_id,
                usuario_id,
                usuario_nome,
                operacao,
                dados_anteriores,
                dados_novos
            )
            VALUES ($1, $2, $3, 'exclusao', $4, NULL)`,
            [
                movimentacaoId,
                usuarioId,
                usuario.rows[0].nome,
                JSON.stringify(dadosAnteriores)
            ]
        );

        // Exclui a movimentação somente após preservar seu histórico
        const resultadoExclusao = await conexao.query(
            `DELETE FROM movimentacao
             WHERE idmovimentacao = $1
               AND EXISTS (
                   SELECT 1
                   FROM usuario_grupo ug
                   WHERE ug.usuario_id = $2
                     AND ug.grupo_id = movimentacao.grupo_id
               )
             RETURNING idmovimentacao`,
            [movimentacaoId, usuarioId]
        );

        if (resultadoExclusao.rows.length === 0) {
            throw new Error(
                'Não foi possível excluir a movimentação.'
            );
        }

        // Confirma a auditoria e a exclusão juntas
        await conexao.query('COMMIT');
        transacaoIniciada = false;

        return res.status(200).json({
            mensagem: 'Movimentação excluída definitivamente com sucesso!',
            auditoriaRegistrada: true
        });

    } catch (error) {
        if (conexao && transacaoIniciada) {
            try {
                await conexao.query('ROLLBACK');
                transacaoIniciada = false;
            } catch (erroRollback) {
                console.error('Erro ao desfazer transação:', erroRollback);
            }
        }

        console.error('Erro ao excluir movimentação:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao excluir a movimentação.'
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
}

// Visualizar ou baixar comprovante de uma movimentação
async function acessarComprovante(req, res) {
    try {
        const usuarioId = req.usuario.idusuario;
        const movimentacaoId = req.params.id;

        if (!/^[1-9]\d*$/.test(movimentacaoId)) {
            return res.status(400).json({
                mensagem: 'Identificador da movimentação inválido.'
            });
        }

        const resultado = await pool.query(
            `SELECT
                cp.nome_arquivo,
                cp.caminho_arquivo
             FROM comprovante cp
             INNER JOIN movimentacao m
                ON m.idmovimentacao = cp.movimentacao_id
             INNER JOIN usuario_grupo ug
                ON ug.grupo_id = m.grupo_id
                AND ug.usuario_id = $2
             WHERE m.idmovimentacao = $1
             ORDER BY cp.criado_em DESC
             LIMIT 1`,
            [movimentacaoId, usuarioId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Comprovante não encontrado ou sem permissão de acesso.'
            });
        }

        const comprovante = resultado.rows[0];

        const diretorioComprovantes = path.resolve(
            __dirname,
            '../../uploads/comprovantes'
        );

        const caminhoCompleto = path.resolve(
            __dirname,
            '../../',
            comprovante.caminho_arquivo
        );

        const caminhoRelativo = path.relative(
            diretorioComprovantes,
            caminhoCompleto
        );

        if (
            caminhoRelativo === '..' ||
            caminhoRelativo.startsWith(`..${path.sep}`) ||
            path.isAbsolute(caminhoRelativo)
        ) {
            return res.status(403).json({
                mensagem: 'Acesso ao arquivo não permitido.'
            });
        }

        if (!fs.existsSync(caminhoCompleto)) {
            return res.status(404).json({
                mensagem: 'O arquivo do comprovante não foi encontrado.'
            });
        }

        if (!fs.statSync(caminhoCompleto).isFile()) {
            return res.status(404).json({
                mensagem: 'O arquivo do comprovante não foi encontrado.'
            });
        }

        const baixar = req.query.download === 'true';
        const disposicao = baixar ? 'attachment' : 'inline';

        const nomeArquivo = encodeURIComponent(
            comprovante.nome_arquivo
        );

        return res.sendFile(caminhoCompleto, {
            headers: {
                'Content-Disposition':
                    `${disposicao}; filename*=UTF-8''${nomeArquivo}`
            }
        }, (error) => {
            if (error) {
                console.error('Erro ao enviar comprovante:', error);

                if (!res.headersSent) {
                    return res.status(500).json({
                        mensagem: 'Erro ao disponibilizar o comprovante.'
                    });
                }
            }
        });

    } catch (error) {
        console.error('Erro ao acessar comprovante:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao acessar o comprovante.'
        });
    }
}

module.exports = {
    listarMovimentacoes,
    listarOpcoesCadastro,
    cadastrarEntrada,
    cadastrarSaida,
    atualizarMovimentacao,
    excluirMovimentacao,
    acessarComprovante
};
