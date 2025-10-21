// backend/routes/montadorRoutes.js
const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/authMiddleware");
const montadorController = require("../controllers/montadorController");

// --- ROTAS NA ORDEM CORRETA ---

// POST /api/montadores -> Criar um novo montador
router.post("/", verificarToken, montadorController.createMontador);

// GET /api/montadores -> Listar TODOS os montadores
router.get("/", verificarToken, montadorController.getAllMontadores);

// GET /api/montadores/:id -> Buscar UM montador específico
router.get("/:id", verificarToken, montadorController.getMontadorById);

// PUT /api/montadores/:id -> Atualizar um montador específico
router.put("/:id", verificarToken, montadorController.updateMontador);

// DELETE /api/montadores/:id -> Deletar um montador específico
router.delete("/:id", verificarToken, montadorController.deleteMontador);

module.exports = router;
