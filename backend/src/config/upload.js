
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Diretório de armazenamento dos comprovantes
const diretorioComprovantes = path.join(
    __dirname,
    '../../uploads/comprovantes'
);

// Cria a pasta automaticamente, caso não exista
fs.mkdirSync(diretorioComprovantes, { recursive: true });

// Configuração do armazenamento
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, diretorioComprovantes);
    },

    filename: (req, file, callback) => {
        const extensao = path.extname(file.originalname).toLowerCase();
        const nomeUnico = `${crypto.randomUUID()}${extensao}`;

        callback(null, nomeUnico);
    }
});

// Tipos de arquivo permitidos
const tiposPermitidos = [
    'application/pdf',
    'image/jpeg',
    'image/png'
];

// Validação do arquivo
function validarArquivo(req, file, callback) {
    if (!tiposPermitidos.includes(file.mimetype)) {
        return callback(
            new Error('Formato inválido. Envie um arquivo PDF, JPG ou PNG.')
        );
    }

    callback(null, true);
}

// Configuração final do Multer
const upload = multer({
    storage,
    fileFilter: validarArquivo,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;
