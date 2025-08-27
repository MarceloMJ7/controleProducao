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

//Rota get para consultar lista de todos os montadores
router.get('/montadores', verificarToken, async (req, res) => {
    try {
        const listaMontadores = await prisma.montador.findMany()
        res.status(200).json(listaMontadores)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Erro Interno" });
    }
})
    
//Rota get para consultar montador por ID
router.get('/montadores/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    try {
        const buscarMontador = await prisma.montador.findUnique({
            where: {
                id: parseInt(id)
            },
        })
        if (!buscarMontador) {
            return res.status(404).json({ message: "Montador não encontrado" })
        }
        res.status(200).json(buscarMontador)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
})

//Rota put para atualizar as informações dos montadores
router.put('/montadores/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const dadosAtt = req.body;
    try {
        const montadorExistente = await prisma.montador.findUnique({
            where: { id: parseInt(id) }
        })
        if (!montadorExistente) {
            return res.status(404).json({ message: "Montador não encontrado" })
        }

        const montadorAtt = await prisma.montador.update({
            where: {
                id: parseInt(id),
            },
            data: dadosAtt,
        });
        res.status(200).json(montadorAtt);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
})

router.delete('/montadores/:id', verificarToken, async(req, res) => {
    const {id} = req.params;
    try {
        await prisma.montador.delete({
            where: {
                id: parseInt(id)
            }
        })
        res.status(204).send();
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Erro ao deletar montador"})
    }
})
module.exports = router;