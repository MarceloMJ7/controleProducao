// backend/routes/reportRoutes.js
const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

// Define a rota POST /api/reports que será protegida e chamará o controller
// Usamos POST porque estamos enviando um corpo (JSON) com os filtros
router.post("/", verificarToken, reportController.generateReport);

module.exports = router;