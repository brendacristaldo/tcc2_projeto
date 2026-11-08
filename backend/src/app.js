
const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const gruposRoutes = require('./routes/gruposRoutes');
const eventosRoutes = require('./routes/eventosRoutes');
const movimentacoesRoutes = require('./routes/movimentacoesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');


const app = express();

app.use(cors());
app.use(express.json());

// Rotas da aplicação
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/dashboard/pastor', dashboardRoutes);
app.use('/api/auditoria', auditoriaRoutes);

module.exports = app;
