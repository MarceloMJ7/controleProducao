// backend/routes/montadorRoutes.js

const express = require('express');
const router = express.Router();

// Importar o segurança e o nosso novo controlador de montadores
const verificarToken = require('../middleware/authMiddleware');
const montadorController = require('../controllers/montadorController');

// As URLs são as mesmas, mas agora elas chamam as funções do controlador
// Note que as URLs aqui são relativas ao prefixo que definimos no server.js (ex: /api/montadores)

// POST /       (Cria um novo montador)
router.post('/', verificarToken, montadorController.createMontador);

// GET /        (Lista todos os montadores)
router.get('/', verificarToken, montadorController.getAllMontadores);

// GET /:id     (Busca um montador específico)
router.get('/:id', verificarToken, montadorController.getMontadorById);

// PUT /:id     (Atualiza um montador específico)
router.put('/:id', verificarToken, montadorController.updateMontador);

// DELETE /:id  (Deleta um montador específico)
router.delete('/:id', verificarToken, montadorController.deleteMontador);

module.exports = router;