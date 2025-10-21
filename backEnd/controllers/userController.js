// backend/controllers/userController.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

// Lógica para REGISTRAR um novo usuário
exports.register = async (req, res) => {
  const { nome, numero_registro, email, senha } = req.body;
  if (!nome || !numero_registro || !email || !senha) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = await prisma.usuario.create({
      data: { nome, numero_registro, email, senha: senhaHash },
    });
    const { senha: _, ...usuarioSemSenha } = novoUsuario;
    res.status(201).json(usuarioSemSenha);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Email ou Número de Registro já está em uso." });
    }
    res
      .status(500)
      .json({ message: "Ocorreu um erro ao cadastrar o usuário." });
  }
};

// Lógica para FAZER LOGIN
exports.login = async (req, res) => {
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
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Ocorreu um erro ao fazer login." });
  }
};

// Lógica para BUSCAR O PERFIL do usuário logado
exports.getProfile = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId }, // req.usuarioId é fornecido pelo middleware verificarToken
      select: { id: true, nome: true, email: true, numero_registro: true },
    });
    if (!usuario) {
      return res
        .status(404)
        .json({ message: "Usuário do token não encontrado." });
    }
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar perfil do usuário." });
  }
};
