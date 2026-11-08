
const pool = require('../config/database');

// Lista todos os grupos, ativos e inativos
async function listarGrupos(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT idgrupo, nome, ativo
             FROM grupo
             ORDER BY nome`
        );

        return res.status(200).json({
            grupos: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar grupos:', error);

        return res.status(500).json({
            mensagem: 'Erro ao consultar grupos.'
        });
    }
}

// Cadastra um novo grupo
async function cadastrarGrupo(req, res) {
    try {
        const { nome } = req.body;

        if (!nome || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({
                mensagem: 'Informe o nome do grupo.'
            });
        }

        const nomeNormalizado = nome.trim();

        // Verifica se já existe um grupo com o mesmo nome
        const grupoExistente = await pool.query(
            `SELECT idgrupo
             FROM grupo
             WHERE LOWER(nome) = LOWER($1)
             LIMIT 1`,
            [nomeNormalizado]
        );

        if (grupoExistente.rows.length > 0) {
            return res.status(409).json({
                mensagem: 'Já existe um grupo cadastrado com este nome.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO grupo (nome, ativo)
             VALUES ($1, TRUE)
             RETURNING idgrupo, nome, ativo, criado_em`,
            [nomeNormalizado]
        );

        return res.status(201).json({
            mensagem: 'Grupo cadastrado com sucesso!',
            grupo: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar grupo:', error);

        return res.status(500).json({
            mensagem: 'Erro ao cadastrar grupo.'
        });
    }
}

// Atualiza o nome de um grupo
async function atualizarGrupo(req, res) {
    try {
        const { idgrupo } = req.params;
        const { nome } = req.body;

        // Valida o identificador
        if (!/^[1-9]\d*$/.test(idgrupo)) {
            return res.status(400).json({
                mensagem: 'Identificador do grupo inválido.'
            });
        }

        // Valida o nome
        if (!nome || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({
                mensagem: 'Informe o nome do grupo.'
            });
        }

        const nomeNormalizado = nome.trim();

        // Verifica se o grupo existe
        const grupoExistente = await pool.query(
            `SELECT idgrupo
             FROM grupo
             WHERE idgrupo = $1`,
            [idgrupo]
        );

        if (grupoExistente.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Grupo não encontrado.'
            });
        }

        // Verifica se outro grupo já utiliza esse nome
        const nomeDuplicado = await pool.query(
            `SELECT idgrupo
             FROM grupo
             WHERE LOWER(nome) = LOWER($1)
               AND idgrupo <> $2
             LIMIT 1`,
            [nomeNormalizado, idgrupo]
        );

        if (nomeDuplicado.rows.length > 0) {
            return res.status(409).json({
                mensagem: 'Já existe outro grupo cadastrado com este nome.'
            });
        }

        // Atualiza o grupo
        const resultado = await pool.query(
            `UPDATE grupo
             SET nome = $1
             WHERE idgrupo = $2
             RETURNING idgrupo, nome, ativo`,
            [nomeNormalizado, idgrupo]
        );

        return res.status(200).json({
            mensagem: 'Grupo atualizado com sucesso!',
            grupo: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar grupo:', error);

        return res.status(500).json({
            mensagem: 'Erro ao atualizar grupo.'
        });
    }
}

// Ativa ou desativa um grupo
async function alterarStatusGrupo(req, res) {
    try {
        const { idgrupo } = req.params;
        const { ativo } = req.body;

        // Valida o identificador
        if (!/^[1-9]\d*$/.test(idgrupo)) {
            return res.status(400).json({
                mensagem: 'Identificador do grupo inválido.'
            });
        }

        // O campo ativo deve ser obrigatoriamente booleano
        if (typeof ativo !== 'boolean') {
            return res.status(400).json({
                mensagem: 'Informe um status válido para o grupo.'
            });
        }

        // Verifica se o grupo existe
        const grupoExistente = await pool.query(
            `SELECT idgrupo
             FROM grupo
             WHERE idgrupo = $1`,
            [idgrupo]
        );

        if (grupoExistente.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Grupo não encontrado.'
            });
        }

        // Atualiza o status sem excluir dados relacionados
        const resultado = await pool.query(
            `UPDATE grupo
             SET ativo = $1
             WHERE idgrupo = $2
             RETURNING idgrupo, nome, ativo`,
            [ativo, idgrupo]
        );

        return res.status(200).json({
            mensagem: ativo
                ? 'Grupo ativado com sucesso!'
                : 'Grupo desativado com sucesso!',
            grupo: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao alterar status do grupo:', error);

        return res.status(500).json({
            mensagem: 'Erro ao alterar o status do grupo.'
        });
    }
}

// Lista os grupos associados ao usuário autenticado
// Somente grupos ativos ficam disponíveis para novos lançamentos
async function listarMeusGrupos(req, res) {
    try {
        const idusuario = req.usuario.idusuario;

        const resultado = await pool.query(
            `SELECT
                g.idgrupo,
                g.nome
             FROM usuario_grupo ug
             INNER JOIN grupo g
                 ON g.idgrupo = ug.grupo_id
             WHERE ug.usuario_id = $1
               AND g.ativo = TRUE
             ORDER BY g.nome`,
            [idusuario]
        );

        return res.status(200).json({
            grupos: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar grupos do usuário:', error);

        return res.status(500).json({
            mensagem: 'Erro ao consultar seus grupos.'
        });
    }
}

module.exports = {
    listarGrupos,
    cadastrarGrupo,
    atualizarGrupo,
    alterarStatusGrupo,
    listarMeusGrupos
};
