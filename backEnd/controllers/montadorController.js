// backend/controllers/montadorController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lógica para CRIAR um novo montador
exports.createMontador = async (req, res) => {
    const { nome, numero_registro } = req.body;
    try {
        const novoMontador = await prisma.montador.create({
            data: { nome, numero_registro }
        });
        res.status(201).json(novoMontador);
    } catch (error) {
        // Código 'P2002' é para violação de campo único
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Número de registro já existe.' });
        }
        res.status(500).json({ message: "Erro ao cadastrar montador." });
    }
};

// Lógica para LISTAR todos os montadores
exports.getAllMontadores = async (req, res) => {
    try {
        const listaMontadores = await prisma.montador.findMany();
        res.status(200).json(listaMontadores);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Erro Interno" });
    }
};

// Lógica para BUSCAR UM montador por ID
exports.getMontadorById = async (req, res) => {
    const { id } = req.params;
    try {
        const buscarMontador = await prisma.montador.findUnique({
            where: { id: parseInt(id) },
        });
        if (!buscarMontador) {
            return res.status(404).json({ message: "Montador não encontrado" });
        }
        res.status(200).json(buscarMontador);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
};

// Lógica para ATUALIZAR um montador
exports.updateMontador = async (req, res) => {
    const { id } = req.params;
    const dadosAtt = req.body;
    try {
        const montadorExistente = await prisma.montador.findUnique({
            where: { id: parseInt(id) }
        });
        if (!montadorExistente) {
            return res.status(404).json({ message: "Montador não encontrado" });
        }
        const montadorAtt = await prisma.montador.update({
            where: { id: parseInt(id) },
            data: dadosAtt,
        });
        res.status(200).json(montadorAtt);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
};

// Lógica para DELETAR um montador
exports.deleteMontador = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.montador.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Erro ao deletar montador" });
    }
};