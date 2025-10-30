// backend/routes/projectRoutes.js
const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/authMiddleware");
const projectController = require("../controllers/projectController");

// --- ROTAS SIMPLIFICADAS E CORRIGIDAS ---

// Rota para listar todos os projetos (GET /api/projects)
router.get("/", verificarToken, projectController.getAllProjects);

// Rota para criar um novo projeto (POST /api/projects)
router.post("/", verificarToken, projectController.createProject);

// Rota para buscar um projeto específico por ID (GET /api/projects/123)
router.get("/:id", verificarToken, projectController.getProjectById);

// Rota para atualizar um projeto (PUT /api/projects/123)
router.put("/:id", verificarToken, projectController.updateProject);

// --- NOVA ROTA PARA NÃO CONFORMIDADE ---
router.put('/:id/naoconformidade', verificarToken, projectController.marcarNaoConformidade);

// Rota para deletar um projeto (DELETE /api/projects/123)
router.delete("/:id", verificarToken, projectController.deleteProject);

module.exports = router;
