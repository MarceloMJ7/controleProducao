const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificarToken = require('../middleware/authMiddleware'); // <-- ESSA É A LINHA QUE FALTAVA!

const router = express.Router();
const prisma = new PrismaClient();

// Rota POST para CADASTRAR um usuário
router.post('/usuarios', async (req, res) => {
    const { nome, numero_registro, email, senha } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const novoUsuario = await prisma.usuario.create({
            data: { nome, numero_registro, email, senha: senhaHash },
        });
        res.status(201).json(novoUsuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ocorreu um erro ao cadastrar o usuário." });
    }
});

// Rota POST para FAZER LOGIN
router.post('/login', async (req, res) => {
    const { numero_registro, senha } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { numero_registro },
        });
        if (!usuario) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ message: "Senha inválida." });
        }
        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ocorreu um erro ao fazer login." });
    }
});

// ROTA GET para buscar o perfil do usuário logado
router.get('/usuarios/perfil', verificarToken, async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuarioId },
            select: {
                id: true,
                nome: true,
                email: true,
                numero_registro: true
            }
        });
        if (!usuario) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        res.status(200).json(usuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar perfil do usuário." });
    }
});

module.exports = router;