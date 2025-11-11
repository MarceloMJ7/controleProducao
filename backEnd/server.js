// backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. IMPORTAÇÃO DE TODAS AS ROTAS
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const montadorRoutes = require('./routes/montadorRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do CORS
const corsOptions = {
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://controle-producao-pied.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middlewares essenciais
app.use(cors(corsOptions));
app.use(express.json());

// 2. USO DAS ROTAS COM OS PREFIXOS CORRETOS
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/montadores', montadorRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.send('API do SGP está a funcionar!');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});