// backend/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Importação de TODOS os seus ficheiros de rotas
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const montadorRoutes = require("./routes/montadorRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do CORS (já com a sua URL da Vercel para quando for para produção)
const corsOptions = {
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://controle-producao-pied.vercel.app", // O seu frontend na Vercel
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middlewares essenciais
app.use(cors(corsOptions));
app.use(express.json());

// Definição das rotas principais da API (com os prefixos corretos)
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/montadores", montadorRoutes);

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
