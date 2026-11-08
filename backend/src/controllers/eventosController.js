
const pool = require('../config/database');


// Lista eventos ativos dos grupos associados ao tesoureiro
// Permite filtrar os eventos por grupo
async function listarEventos(req, res) {
    try {
        const idusuario = req.usuario.idusuario;
        const { grupo_id } = req.query;

        const parametros = [idusuario];

        let filtroGrupo = '';

        if (grupo_id !== undefined) {
            if (!/^[1-9]\d*$/.test(grupo_id)) {
                return res.status(400).json({
                    mensagem: 'Identificador do grupo inválido.'
                });
            }

            parametros.push(grupo_id);
            filtroGrupo = 'AND e.grupo_id = $2';
        }

        const resultado = await pool.query(
            `SELECT
                e.idevento,
                e.nome,
                e.descricao,
                e.data_inicio,
                e.data_fim,
                e.ativo,
                e.criado_em,
                e.usuario_id,
                e.grupo_id,
                g.nome AS grupo_nome
             FROM evento e
             INNER JOIN grupo g
                ON g.idgrupo = e.grupo_id
             INNER JOIN usuario_grupo ug
                ON ug.grupo_id = e.grupo_id
                AND ug.usuario_id = $1
             WHERE e.ativo = TRUE
               ${filtroGrupo}
             ORDER BY e.data_inicio DESC, e.nome`,
            parametros
        );

        return res.status(200).json({
            eventos: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar eventos:', error);

        return res.status(500).json({
            mensagem: 'Erro ao consultar eventos.'
        });
    }
}


// Consulta um evento específico dos grupos do tesoureiro
async function consultarEvento(req, res) {
    try {
        const { idevento } = req.params;
        const idusuario = req.usuario.idusuario;

        if (!/^[1-9]\d*$/.test(idevento)) {
            return res.status(400).json({
                mensagem: 'Identificador do evento inválido.'
            });
        }

        const resultado = await pool.query(
            `SELECT
                e.idevento,
                e.nome,
                e.descricao,
                e.data_inicio,
                e.data_fim,
                e.ativo,
                e.criado_em,
                e.usuario_id,
                e.grupo_id,
                g.nome AS grupo_nome
             FROM evento e
             INNER JOIN grupo g
                ON g.idgrupo = e.grupo_id
             INNER JOIN usuario_grupo ug
                ON ug.grupo_id = e.grupo_id
                AND ug.usuario_id = $1
             WHERE e.idevento = $2`,
            [idusuario, idevento]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Evento não encontrado ou você não tem acesso a ele.'
            });
        }

        return res.status(200).json({
            evento: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao consultar evento:', error);

        return res.status(500).json({
            mensagem: 'Erro ao consultar evento.'
        });
    }
}

// Cadastra um evento para um grupo associado ao tesoureiro
async function cadastrarEvento(req, res) {
    try {
        const idusuario = req.usuario.idusuario;
        const { nome, descricao, data_inicio, data_fim, grupo_id } = req.body;

        if (!nome || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({
                mensagem: 'Informe o nome do evento.'
            });
        }

        if (!Number.isInteger(Number(grupo_id)) || Number(grupo_id) <= 0) {
            return res.status(400).json({
                mensagem: 'Selecione um grupo válido.'
            });
        }

        if (!data_inicio || !/^\d{4}-\d{2}-\d{2}$/.test(data_inicio)) {
            return res.status(400).json({
                mensagem: 'Informe uma data de início válida.'
            });
        }

        if (data_fim && !/^\d{4}-\d{2}-\d{2}$/.test(data_fim)) {
            return res.status(400).json({
                mensagem: 'Informe uma data de término válida.'
            });
        }

        if (data_fim && data_fim < data_inicio) {
            return res.status(400).json({
                mensagem: 'A data de término não pode ser anterior à data de início.'
            });
        }

        const grupoAssociado = await pool.query(
            `SELECT grupo_id
             FROM usuario_grupo
             WHERE usuario_id = $1
               AND grupo_id = $2`,
            [idusuario, grupo_id]
        );

        if (grupoAssociado.rows.length === 0) {
            return res.status(403).json({
                mensagem: 'Você não tem permissão para cadastrar eventos neste grupo.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO evento (
                nome,
                descricao,
                data_inicio,
                data_fim,
                usuario_id,
                grupo_id
             )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING
                idevento,
                nome,
                descricao,
                data_inicio,
                data_fim,
                ativo,
                criado_em,
                usuario_id,
                grupo_id`,
            [
                nome.trim(),
                descricao?.trim() || null,
                data_inicio,
                data_fim || null,
                idusuario,
                grupo_id
            ]
        );

        return res.status(201).json({
            mensagem: 'Evento cadastrado com sucesso!',
            evento: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar evento:', error);

        return res.status(500).json({
            mensagem: 'Erro ao cadastrar evento.'
        });
    }
}

// Atualiza um evento pertencente a um grupo do tesoureiro
async function atualizarEvento(req, res) {
    try {
        const { idevento } = req.params;
        const idusuario = req.usuario.idusuario;
        const { nome, descricao, data_inicio, data_fim, grupo_id } = req.body;

        if (!/^[1-9]\d*$/.test(idevento)) {
            return res.status(400).json({
                mensagem: 'Identificador do evento inválido.'
            });
        }

        if (!nome || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({
                mensagem: 'Informe o nome do evento.'
            });
        }

        if (descricao !== undefined && descricao !== null && typeof descricao !== 'string') {
            return res.status(400).json({
                mensagem: 'A descrição informada é inválida.'
            });
        }

        const grupoId = Number(grupo_id);

        if (!Number.isInteger(grupoId) || grupoId <= 0) {
            return res.status(400).json({
                mensagem: 'Selecione um grupo válido.'
            });
        }

        if (!data_inicio || !/^\d{4}-\d{2}-\d{2}$/.test(data_inicio)) {
            return res.status(400).json({
                mensagem: 'Informe uma data de início válida.'
            });
        }

        if (data_fim && !/^\d{4}-\d{2}-\d{2}$/.test(data_fim)) {
            return res.status(400).json({
                mensagem: 'Informe uma data de término válida.'
            });
        }

        if (data_fim && data_fim < data_inicio) {
            return res.status(400).json({
                mensagem: 'A data de término não pode ser anterior à data de início.'
            });
        }

        const eventoExistente = await pool.query(
            `SELECT e.idevento
             FROM evento e
             INNER JOIN usuario_grupo ug
                ON ug.grupo_id = e.grupo_id
                AND ug.usuario_id = $1
             WHERE e.idevento = $2
               AND e.ativo = TRUE`,
            [idusuario, idevento]
        );

        if (eventoExistente.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Evento não encontrado ou você não tem acesso a ele.'
            });
        }

        const grupoAssociado = await pool.query(
            `SELECT grupo_id
             FROM usuario_grupo
             WHERE usuario_id = $1
               AND grupo_id = $2`,
            [idusuario, grupoId]
        );

        if (grupoAssociado.rows.length === 0) {
            return res.status(403).json({
                mensagem: 'Você não tem permissão para associar este evento a esse grupo.'
            });
        }

        const resultado = await pool.query(
            `UPDATE evento
             SET
                nome = $1,
                descricao = $2,
                data_inicio = $3,
                data_fim = $4,
                grupo_id = $5
             WHERE idevento = $6
             RETURNING
                idevento,
                nome,
                descricao,
                data_inicio,
                data_fim,
                ativo,
                criado_em,
                usuario_id,
                grupo_id`,
            [
                nome.trim(),
                descricao?.trim() || null,
                data_inicio,
                data_fim || null,
                grupoId,
                idevento
            ]
        );

        const grupo = await pool.query(
            `SELECT nome
             FROM grupo
             WHERE idgrupo = $1`,
            [grupoId]
        );

        return res.status(200).json({
            mensagem: 'Evento atualizado com sucesso!',
            evento: {
                ...resultado.rows[0],
                grupo_nome: grupo.rows[0].nome
            }
        });

    } catch (error) {
        console.error('Erro ao atualizar evento:', error);

        return res.status(500).json({
            mensagem: 'Erro ao atualizar evento.'
        });
    }
}

// Desativa um evento pertencente a um grupo do tesoureiro
async function desativarEvento(req, res) {
    try {
        const { idevento } = req.params;
        const idusuario = req.usuario.idusuario;

        if (!/^[1-9]\d*$/.test(idevento)) {
            return res.status(400).json({
                mensagem: 'Identificador do evento inválido.'
            });
        }

        // Verifica se o evento pertence a um grupo do tesoureiro
        const eventoExistente = await pool.query(
            `SELECT e.idevento, e.ativo
             FROM evento e
             INNER JOIN usuario_grupo ug
                ON ug.grupo_id = e.grupo_id
                AND ug.usuario_id = $1
             WHERE e.idevento = $2`,
            [idusuario, idevento]
        );

        if (eventoExistente.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Evento não encontrado ou você não tem acesso a ele.'
            });
        }

        if (!eventoExistente.rows[0].ativo) {
            return res.status(400).json({
                mensagem: 'Este evento já está desativado.'
            });
        }

        // Desativa o evento sem excluir seu registro do banco
        await pool.query(
            `UPDATE evento
             SET ativo = FALSE
             WHERE idevento = $1`,
            [idevento]
        );

        return res.status(200).json({
            mensagem: 'Evento desativado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao desativar evento:', error);

        return res.status(500).json({
            mensagem: 'Erro ao desativar evento.'
        });
    }
}

module.exports = {
    listarEventos,
    consultarEvento,
    cadastrarEvento,
    atualizarEvento,
    desativarEvento
};
