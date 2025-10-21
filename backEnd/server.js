// backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. IMPORTAÇÃO DE TODAS AS ROTAS
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const montadorRoutes = require('./routes/montadorRoutes'); // <--- GARANTA QUE ESTA LINHA EXISTE

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do CORS
const corsOptions = {
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://controle-producao-pied.vercel.app' // A sua URL do Vercel
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
app.use('/api/montadores', montadorRoutes); // <--- GARANTA QUE ESTA LINHA EXISTE E ESTÁ CORRETA

// Rota de "saúde" para testar se o servidor está no ar
app.get('/', (req, res) => {
  res.send('API do SGP está a funcionar!');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});