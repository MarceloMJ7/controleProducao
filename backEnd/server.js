// backend/server.js

const express = require("express");
const cors = require("cors");
// 1. IMPORTAR O RATE LIMIT
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Importação de rotas
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const montadorRoutes = require("./routes/montadorRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// --- AJUSTE CRÍTICO PARA VERCEL/RENDER ---
// Isto diz ao Express para confiar no proxy reverso e pegar o IP real do usuário.
// Sem isto, o rateLimit bloqueia o IP do próprio servidor da Vercel.
app.set('trust proxy', 1);

// Configuração do CORS
const corsOptions = {
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://controle-producao-pied.vercel.app", // Sua URL da Vercel
    "https://controleproducao.onrender.com", // Sua URL do Render
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// --- RATE LIMITING (SEGURANÇA) ---

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, 
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    message: "Muitas requisições deste IP (limite de segurança), tente novamente mais tarde.",
  },
});

// Aplica o limitador a todas as rotas que começam com /api/
app.use("/api/", limiter);

// Uso das Rotas
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/montadores", montadorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("API do SGP está a funcionar com segurança!");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});