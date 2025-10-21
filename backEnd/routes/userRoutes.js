// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();

// Garanta que os seus ficheiros de controller e middleware estão nos caminhos corretos
const userController = require("../controllers/userController");
const verificarToken = require("../middleware/authMiddleware");

// Rota para CADASTRAR um novo usuário
// URL final: POST /api/users/register
router.post("/register", userController.register);

// Rota para FAZER LOGIN
// URL final: POST /api/users/login
router.post("/login", userController.login);

// Rota para BUSCAR O PERFIL do usuário logado
// URL final: GET /api/users/perfil
router.get("/perfil", verificarToken, userController.getProfile);

module.exports = router;
