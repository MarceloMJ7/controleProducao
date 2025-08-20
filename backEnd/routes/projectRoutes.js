const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/authMiddleware'); // <-- Importando nosso segurança

const router = express.Router();
const prisma = new PrismaClient();

// =========================================================
//  ROTA PROTEGIDA PARA BUSCAR TODOS OS PROJETOS
// =========================================================
router.get('/projetos', verificarToken, async (req, res) => {
    // Se o código chegou até aqui, significa que o token é válido
    // e o middleware `verificarToken` chamou a função next().

    try {
        const projetos = await prisma.projeto.findMany({
            include: {
                montador: true // Inclui os dados do montador relacionado
            }
        });
        res.status(200).json(projetos);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar projetos." });
    }
});

module.exports = router;