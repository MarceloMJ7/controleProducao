// backend/routes/projectRoutes.js

const express = require('express');
const router = express.Router();

// 1. Importar o nosso "segurança" e o nosso novo "livro de receitas"
const verificarToken = require('../middleware/authMiddleware');
const projectController = require('../controllers/projectController');

// 2. Definir as rotas, agora muito mais limpas
// Cada rota chama o segurança e depois a função correspondente do controlador

// Rota para listar todos os projetos (com filtros)
router.get('/projetos', verificarToken, projectController.getAllProjects);

// Rota para criar um novo projeto
router.post('/projetos', verificarToken, projectController.createProject);

// Rota para buscar um projeto específico por ID
router.get('/projetos/:id', verificarToken, projectController.getProjectById);

// Rota para atualizar um projeto
router.put('/projetos/:id', verificarToken, projectController.updateProject);

// Rota para deletar um projeto
router.delete('/projetos/:id', verificarToken, projectController.deleteProject);

module.exports = router;