// backend/controllers/montadorController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CRIAR MONTADOR ---
// (Sem alterações, já deve estar assim)
exports.createMontador = async (req, res) => {
    const { nome, numero_registro } = req.body;
    if (!nome || !numero_registro) {
        return res.status(400).json({ message: "Nome e Número de Registro são obrigatórios." });
    }
    try {
        const novoMontador = await prisma.montador.create({
            data: { nome, numero_registro }
        });
        res.status(201).json(novoMontador);
    } catch (error) {
        if (error.code === 'P2002') { // Erro de campo único duplicado
            return res.status(409).json({ message: "Número de registro já cadastrado." });
        }
        console.error("Erro ao criar montador:", error);
        res.status(500).json({ message: "Erro interno ao criar montador." });
    }
};

// --- ATUALIZAR MONTADOR ---
// (Sem alterações, já deve estar assim)
exports.updateMontador = async (req, res) => {
    const { id } = req.params;
    const { nome, numero_registro } = req.body;
    if (!nome || !numero_registro) {
        return res.status(400).json({ message: "Nome e Número de Registro são obrigatórios." });
    }
    try {
        const montadorAtualizado = await prisma.montador.update({
            where: { id: parseInt(id) },
            data: { nome, numero_registro }
        });
        res.status(200).json(montadorAtualizado);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: "Número de registro já cadastrado." });
        }
        console.error("Erro ao atualizar montador:", error);
        res.status(500).json({ message: "Erro interno ao atualizar montador." });
    }
};

// --- DELETAR MONTADOR ---
// (Sem alterações, já deve estar assim)
exports.deleteMontador = async (req, res) => {
    const { id } = req.params;
    try {
        // O Prisma (com a relação N-M) irá automaticamente remover
        // as ligações na tabela de junção antes de deletar o montador.
        await prisma.montador.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send(); // Sucesso, sem conteúdo
    } catch (error) {
        console.error("Erro ao deletar montador:", error);
        res.status(500).json({ message: "Erro interno ao deletar montador." });
    }
};

// --- BUSCAR MONTADOR POR ID (COM ESTATÍSTICAS) ---
// (Atualizado para incluir estatísticas, caso use no futuro)
exports.getMontadorById = async (req, res) => {
    const { id } = req.params;
    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    ultimoDiaMes.setHours(23, 59, 59, 999);

    try {
        const montador = await prisma.montador.findUnique({
            where: { id: parseInt(id) }
        });

        if (!montador) {
            return res.status(404).json({ message: "Montador não encontrado." });
        }

        // Calcula estatísticas para este montador
        const projetosAtivos = await prisma.projeto.count({
            where: {
                montadores: { some: { id: montador.id } }, // Filtra projetos que TÊM este montador
                status: 'Em Montagem'
            }
        });

        const concluidosNoMes = await prisma.projeto.count({
            where: {
                montadores: { some: { id: montador.id } },
                status: 'Concluído',
                updatedAt: { // Usamos updatedAt como proxy para data de conclusão
                    gte: primeiroDiaMes,
                    lte: ultimoDiaMes
                }
            }
        });

        // Retorna o montador com as estatísticas
        res.status(200).json({ ...montador, projetosAtivos, concluidosNoMes });

    } catch (error) {
        console.error("Erro ao buscar montador por ID:", error);
        res.status(500).json({ message: "Erro interno ao buscar montador." });
    }
};

// --- LISTAR TODOS OS MONTADORES (COM ESTATÍSTICAS CORRIGIDAS) ---
// (Esta é a mudança principal)
exports.getAllMontadores = async (req, res) => {
    const { nome } = req.query; // Para o filtro de nome que está no front-end

    // Define o intervalo do mês atual para a contagem
    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    ultimoDiaMes.setHours(23, 59, 59, 999); // Ajusta para o fim do dia

    try {
        // 1. Prepara o filtro de busca (se houver)
        const where = {};
        if (nome) {
            where.nome = {
                contains: nome,
                mode: 'insensitive' // Ignora maiúsculas/minúsculas
            };
        }

        // 2. Busca a lista principal de montadores
        const montadores = await prisma.montador.findMany({
            where: where,
            orderBy: { nome: 'asc' }
        });

        // 3. Para cada montador, busca suas estatísticas (N-M)
        // Usamos Promise.all para fazer as buscas de estatísticas em paralelo
        const montadoresComStats = await Promise.all(
            montadores.map(async (montador) => {
                
                // Contagem de projetos ativos (Em Montagem)
                const projetosAtivos = await prisma.projeto.count({
                    where: {
                        montadores: { some: { id: montador.id } }, // Filtra projetos que TÊM este montador na lista
                        status: 'Em Montagem'
                    }
                });

                // Contagem de projetos concluídos neste mês
                const concluidosNoMes = await prisma.projeto.count({
                    where: {
                        montadores: { some: { id: montador.id } }, // Filtra projetos que TÊM este montador
                        status: 'Concluído',
                        updatedAt: { // Usamos updatedAt como proxy para data de conclusão
                            gte: primeiroDiaMes,
                            lte: ultimoDiaMes
                        }
                    }
                });

                // Retorna o objeto do montador com as novas estatísticas
                return {
                    ...montador,
                    projetosAtivos: projetosAtivos,
                    concluidosNoMes: concluidosNoMes
                };
            })
        );

        // 4. Retorna a lista completa com estatísticas
        res.status(200).json(montadoresComStats);

    } catch (error) {
        console.error("Erro ao listar montadores:", error);
        res.status(500).json({ message: "Erro interno ao buscar montadores." });
    }
};