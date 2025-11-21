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

// Configuração do CORS
const corsOptions = {
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://controle-producao-pied.vercel.app", // Sua URL da Vercel
    "https://controleproducao.onrender.com", // Sua URL do Render (às vezes necessária para self-calls)
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// --- RATE LIMITING (SEGURANÇA) ---
// Define que um mesmo IP só pode fazer 100 requisições a cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita os headers `X-RateLimit-*`
  message: {
    message: "Muitas requisições deste IP, tente novamente mais tarde.",
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
