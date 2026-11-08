
const pool = require('../config/database');
const bcrypt = require('bcrypt');

// Valida o identificador do usuário
function validarIdUsuario(id) {
    return /^[1-9]\d*$/.test(String(id));
}

// Cadastra um novo tesoureiro
async function cadastrarTesoureiro(req, res) {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: 'Preencha todos os campos obrigatórios.'
            });
        }

        if (typeof nome !== 'string' ||
            typeof email !== 'string' ||
            typeof senha !== 'string') {
            return res.status(400).json({
                mensagem: 'Informe dados válidos.'
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({
                mensagem: 'A senha deve possuir pelo menos 6 caracteres.'
            });
        }

        const nomeNormalizado = nome.trim();
        const emailNormalizado = email.trim().toLowerCase();

        if (!nomeNormalizado || !emailNormalizado) {
            return res.status(400).json({
                mensagem: 'Nome e e-mail são obrigatórios.'
            });
        }

        const usuarioExistente = await pool.query(
            `SELECT idusuario
             FROM usuario
             WHERE LOWER(email) = $1`,
            [emailNormalizado]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(409).json({
                mensagem: 'Já existe um usuário cadastrado com este e-mail.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await pool.query(
            `INSERT INTO usuario (
                nome,
                email,
                senha_hash,
                tipo_perfil,
                ativo
            )
            VALUES ($1, $2, $3, 'tesoureiro', TRUE)
            RETURNING idusuario, nome, email, tipo_perfil, ativo`,
            [nomeNormalizado, emailNormalizado, senhaHash]
        );

        return res.status(201).json({
            mensagem: 'Tesoureiro cadastrado com sucesso!',
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar tesoureiro:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                mensagem: 'Já existe um usuário cadastrado com este e-mail.'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro interno ao cadastrar tesoureiro.'
        });
    }
}

// Lista os tesoureiros cadastrados
async function listarTesoureiros(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT idusuario, nome, email, ativo
             FROM usuario
             WHERE tipo_perfil = 'tesoureiro'
             ORDER BY nome`
        );

        return res.status(200).json({
            usuarios: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar tesoureiros:', error);

        return res.status(500).json({
            mensagem: 'Erro ao consultar tesoureiros.'
        });
    }
}

// Consulta os dados de um tesoureiro
async function buscarTesoureiro(req, res) {
    try {
        const { idusuario } = req.params;

        if (!validarIdUsuario(idusuario)) {
            return res.status(400).json({
                mensagem: 'Identificador de usuário inválido.'
            });
        }

        const resultado = await pool.query(
            `SELECT idusuario, nome, email, ativo, criado_em
             FROM usuario
             WHERE idusuario = $1
               AND tipo_perfil = 'tesoureiro'`,
            [idusuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Tesoureiro não encontrado.'
            });
        }

        return res.status(200).json({
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao consultar tesoureiro:', error);

        return res.status(500).json({
            mensagem: 'Erro ao consultar tesoureiro.'
        });
    }
}

// Edita nome e e-mail de um tesoureiro
async function atualizarTesoureiro(req, res) {
    try {
        const { idusuario } = req.params;
        const { nome, email } = req.body;

        if (!validarIdUsuario(idusuario)) {
            return res.status(400).json({
                mensagem: 'Identificador de usuário inválido.'
            });
        }

        if (
            typeof nome !== 'string' ||
            typeof email !== 'string' ||
            !nome.trim() ||
            !email.trim()
        ) {
            return res.status(400).json({
                mensagem: 'Informe um nome e um e-mail válidos.'
            });
        }

        const nomeNormalizado = nome.trim();
        const emailNormalizado = email.trim().toLowerCase();

        const usuario = await pool.query(
            `SELECT idusuario
             FROM usuario
             WHERE idusuario = $1
               AND tipo_perfil = 'tesoureiro'`,
            [idusuario]
        );

        if (usuario.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Tesoureiro não encontrado.'
            });
        }

        const emailExistente = await pool.query(
            `SELECT idusuario
             FROM usuario
             WHERE LOWER(email) = $1
               AND idusuario <> $2`,
            [emailNormalizado, idusuario]
        );

        if (emailExistente.rows.length > 0) {
            return res.status(409).json({
                mensagem: 'Este e-mail já está sendo utilizado por outro usuário.'
            });
        }

        const resultado = await pool.query(
            `UPDATE usuario
             SET nome = $1,
                 email = $2
             WHERE idusuario = $3
               AND tipo_perfil = 'tesoureiro'
             RETURNING idusuario, nome, email, ativo`,
            [nomeNormalizado, emailNormalizado, idusuario]
        );

        return res.status(200).json({
            mensagem: 'Dados do tesoureiro atualizados com sucesso!',
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar tesoureiro:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                mensagem: 'Este e-mail já está sendo utilizado por outro usuário.'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro ao atualizar tesoureiro.'
        });
    }
}

// Altera a senha de um tesoureiro
async function atualizarSenhaTesoureiro(req, res) {
    try {
        const { idusuario } = req.params;
        const { senha } = req.body;

        if (!validarIdUsuario(idusuario)) {
            return res.status(400).json({
                mensagem: 'Identificador de usuário inválido.'
            });
        }

        if (typeof senha !== 'string' || senha.length < 6) {
            return res.status(400).json({
                mensagem: 'A nova senha deve possuir pelo menos 6 caracteres.'
            });
        }

        const usuario = await pool.query(
            `SELECT idusuario
             FROM usuario
             WHERE idusuario = $1
               AND tipo_perfil = 'tesoureiro'`,
            [idusuario]
        );

        if (usuario.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Tesoureiro não encontrado.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            `UPDATE usuario
             SET senha_hash = $1
             WHERE idusuario = $2
               AND tipo_perfil = 'tesoureiro'`,
            [senhaHash, idusuario]
        );

        return res.status(200).json({
            mensagem: 'Senha do tesoureiro alterada com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao alterar senha do tesoureiro:', error);

        return res.status(500).json({
            mensagem: 'Erro ao alterar senha do tesoureiro.'
        });
    }
}

// Ativa ou desativa um tesoureiro
async function alterarStatusTesoureiro(req, res) {
    try {
        const { idusuario } = req.params;
        const { ativo } = req.body;

        if (!validarIdUsuario(idusuario)) {
            return res.status(400).json({
                mensagem: 'Identificador de usuário inválido.'
            });
        }

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({
                mensagem: 'Informe um status válido.'
            });
        }

        // Impede que o pastor desative a própria conta
        if (
            !ativo &&
            String(req.usuario.idusuario) === String(idusuario)
        ) {
            return res.status(400).json({
                mensagem: 'Você não pode desativar sua própria conta.'
            });
        }

        const resultado = await pool.query(
            `UPDATE usuario
             SET ativo = $1
             WHERE idusuario = $2
               AND tipo_perfil = 'tesoureiro'
             RETURNING idusuario, nome, email, ativo`,
            [ativo, idusuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Tesoureiro não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: ativo
                ? 'Tesoureiro ativado com sucesso!'
                : 'Tesoureiro desativado com sucesso!',
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao alterar status do tesoureiro:', error);

        return res.status(500).json({
            mensagem: 'Erro ao alterar status do tesoureiro.'
        });
    }
}

// Atribui um tesoureiro a um grupo
async function atribuirGrupo(req, res) {
    try {
        const idusuario = Number(req.params.idusuario);
        const { grupo_id } = req.body;
        const idgrupo = Number(grupo_id);

        if (
            !Number.isInteger(idusuario) ||
            idusuario <= 0 ||
            !Number.isInteger(idgrupo) ||
            idgrupo <= 0
        ) {
            return res.status(400).json({
                mensagem: 'Informe identificadores válidos para usuário e grupo.'
            });
        }

        const usuario = await pool.query(
            `SELECT idusuario, nome
             FROM usuario
             WHERE idusuario = $1
               AND tipo_perfil = 'tesoureiro'
               AND ativo = TRUE`,
            [idusuario]
        );

        if (usuario.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Tesoureiro não encontrado ou inativo.'
            });
        }

        const grupo = await pool.query(
            `SELECT idgrupo, nome
             FROM grupo
             WHERE idgrupo = $1 AND ativo = TRUE`,
            [idgrupo]
        );

        if (grupo.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Grupo não encontrado ou inativo.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO usuario_grupo (usuario_id, grupo_id)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id, grupo_id) DO NOTHING
             RETURNING usuario_id, grupo_id`,
            [idusuario, idgrupo]
        );

        if (resultado.rows.length === 0) {
            return res.status(409).json({
                mensagem: 'Este tesoureiro já está atribuído a este grupo.'
            });
        }

        return res.status(201).json({
            mensagem: 'Tesoureiro atribuído ao grupo com sucesso!',
            atribuicao: {
                usuario_id: idusuario,
                grupo_id: idgrupo,
                tesoureiro: usuario.rows[0].nome,
                grupo: grupo.rows[0].nome
            }
        });

    } catch (error) {
        console.error('Erro ao atribuir tesoureiro:', error);

        return res.status(500).json({
            mensagem: 'Erro ao atribuir tesoureiro ao grupo.'
        });
    }
}

// Lista os grupos de um tesoureiro
async function listarGruposDoTesoureiro(req, res) {
    try {
        const idusuario = Number(req.params.idusuario);

        if (!Number.isInteger(idusuario) || idusuario <= 0) {
            return res.status(400).json({
                mensagem: 'Identificador de usuário inválido.'
            });
        }

        const resultado = await pool.query(
            `SELECT g.idgrupo, g.nome, g.ativo
             FROM usuario_grupo ug
             INNER JOIN grupo g ON g.idgrupo = ug.grupo_id
             WHERE ug.usuario_id = $1
             ORDER BY g.nome`,
            [idusuario]
        );

        return res.status(200).json({
            grupos: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao consultar grupos do tesoureiro:', error);

        return res.status(500).json({
            mensagem: 'Erro ao consultar grupos do tesoureiro.'
        });
    }
}

module.exports = {
    cadastrarTesoureiro,
    listarTesoureiros,
    buscarTesoureiro,
    atualizarTesoureiro,
    atualizarSenhaTesoureiro,
    alterarStatusTesoureiro,
    atribuirGrupo,
    listarGruposDoTesoureiro
};
