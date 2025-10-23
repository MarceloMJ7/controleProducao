// backend/routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

// Define a rota GET /stats que será protegida pelo token e chamará a função getStats
// URL final será: GET /api/dashboard/stats
router.get('/stats', verificarToken, dashboardController.getStats);

router.get('/atencao', verificarToken, dashboardController.getProjetosAtencao); 

router.get('/atualizacoes', verificarToken, dashboardController.getUltimasAtualizacoes); 

router.get('/prazos', verificarToken, dashboardController.getPrazosProximos);


module.exports = router;