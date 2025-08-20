const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Rota POST para CRIAR um novo montador
router.post('/montadores', verificarToken, async (req, res) => {
    const { nome, numero_registro } = req.body;
    try {
        const novoMontador = await prisma.montador.create({
            data: {
                nome,
                numero_registro
            }
        });
        res.status(201).json(novoMontador);
    } catch (error) {
        res.status(500).json({ message: "Erro aos cadastrar montador." });
    }
});

module.exports = router;