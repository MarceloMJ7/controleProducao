import {
    API_BASE_URL,
    verificarAutenticacaoECarregarUsuario,
    setupLogout,
    exibirSucesso,
    exibirErro,
    confirmarAcao
} from './common.js';

let currentPage = 1;
const ITEMS_PER_PAGE = 10;

document.addEventListener("DOMContentLoaded", function () {
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    const tabelaMontadoresCorpo = document.getElementById("montadoresTabela");
    const filtroNomeMontador = document.getElementById("filtroNomeMontador");

    if (tabelaMontadoresCorpo) {
        carregarMontadores();
        
        if (filtroNomeMontador) {
            filtroNomeMontador.addEventListener('input', () => { currentPage = 1; carregarMontadores(); });
        }

        document.getElementById("paginacaoContainer").addEventListener("click", (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                e.preventDefault();
                const btn = e.target.closest('a');
                if (btn.dataset.page) {
                    currentPage = parseInt(btn.dataset.page);
                    carregarMontadores();
                }
            }
        });

        tabelaMontadoresCorpo.addEventListener('click', async function (event) {
            const targetElement = event.target;
            const deleteButton = targetElement.closest('.btn-delete-montador');
            if (deleteButton) {
                event.preventDefault();
                const linhaDoMontador = targetElement.closest('tr');
                const montadorId = linhaDoMontador.dataset.id;
                const montadorNome = linhaDoMontador.cells[1].textContent;
                
                const confirmou = await confirmarAcao(`Excluir ${montadorNome}?`, "Essa ação não pode ser desfeita.");
                if (confirmou) deletarMontador(montadorId);
                return;
            }
            const editButton = targetElement.closest('.btn-edit-montador');
            if (editButton) {
                event.preventDefault();
                const linhaDoMontador = targetElement.closest('tr');
                const montadorId = linhaDoMontador.dataset.id;
                abrirModalEdicaoMontador(montadorId);
            }
        });

        setupModalAdicionarMontador();
        setupModalEditarMontador();
    }
});

async function carregarMontadores() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const nome = document.getElementById("filtroNomeMontador").value;
    const tabela = document.getElementById("montadoresTabela");
    
    let url = `${API_BASE_URL}/api/montadores?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
    if (nome) url += `&nome=${encodeURIComponent(nome)}`;
    
    tabela.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Carregando...</td></tr>`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
        if (!res.ok) throw new Error("Falha ao buscar montadores.");
        
        const resultado = await res.json();
        const montadores = resultado.data;
        const meta = resultado.meta;

        tabela.innerHTML = "";
        if (montadores.length === 0) {
            tabela.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Nenhum montador encontrado.</td></tr>`;
            atualizarPaginacao(meta);
            return;
        }
        montadores.forEach((montador) => {
            const linhaHTML = `
                <tr data-id="${montador.id}">
                    <td>${montador.numero_registro}</td>
                    <td>${montador.nome}</td>
                    <td class="text-center fw-bold">${montador.concluidosNoMes}</td>
                    <td class="text-center"><span class="badge ${montador.projetosAtivos > 0 ? "text-bg-primary" : "text-bg-secondary"} rounded-pill">${montador.projetosAtivos}</span></td>
                    <td class="text-end">
                        <a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit-montador" title="Editar"><i class="fas fa-edit"></i></a>
                        <a href="#" class="btn btn-sm btn-outline-danger btn-delete-montador" title="Excluir"><i class="fas fa-trash-alt"></i></a>
                    </td>
                </tr>`;
            tabela.innerHTML += linhaHTML;
        });

        atualizarPaginacao(meta);

    } catch (error) {
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

function atualizarPaginacao(meta) {
    const info = document.getElementById("paginacaoInfo");
    const container = document.getElementById("paginacaoContainer");
    
    if (!info || !container) return;

    info.textContent = `Página ${meta.page} de ${meta.totalPages} (Total: ${meta.total})`;
    container.innerHTML = '';

    const prevDisabled = meta.page === 1 ? 'disabled' : '';
    container.innerHTML += `<li class="page-item ${prevDisabled}"><a class="page-link bg-dark border-secondary text-white" href="#" data-page="${meta.page - 1}">&laquo;</a></li>`;

    const nextDisabled = meta.page === meta.totalPages || meta.totalPages === 0 ? 'disabled' : '';
    container.innerHTML += `<li class="page-item ${nextDisabled}"><a class="page-link bg-dark border-secondary text-white" href="#" data-page="${meta.page + 1}">&raquo;</a></li>`;
}

async function deletarMontador(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } });
        if (res.status === 204) {
            exibirSucesso('Montador excluído com sucesso!');
            carregarMontadores();
        } else {
            const erro = await res.json();
            throw new Error(erro.message || 'Erro ao excluir montador.');
        }
    } catch (error) {
        exibirErro(error.message);
    }
}

async function abrirModalEdicaoMontador(id) {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) throw new Error('Falha ao buscar dados do montador.');
        const montador = await response.json();
        document.getElementById('editMontadorId').value = montador.id;
        document.getElementById('editNomeMontador').value = montador.nome;
        document.getElementById('editNumRegistroMontador').value = montador.numero_registro;
        new bootstrap.Modal(document.getElementById('editMontadorModal')).show();
    } catch (error) {
        exibirErro(error.message);
    }
}

function setupModalAdicionarMontador() {
    const addMontadorForm = document.getElementById("addMontadorForm");
    const addMontadorModalEl = document.getElementById("addMontadorModal");
    if (addMontadorForm && addMontadorModalEl) {
        addMontadorForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const nome = document.getElementById("addNomeMontador").value;
            const numero_registro = document.getElementById("addNumRegistroMontador").value;
            const token = localStorage.getItem("authToken");
            try {
                const response = await fetch(`${API_BASE_URL}/api/montadores`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ nome: nome, numero_registro: numero_registro }),
                });
                if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao adicionar montador."); }
                exibirSucesso("Montador adicionado com sucesso!");
                const modalInstance = bootstrap.Modal.getInstance(addMontadorModalEl);
                modalInstance.hide();
                addMontadorForm.reset();
                carregarMontadores();
            } catch (error) { exibirErro(error.message); }
        });
    }
}

function setupModalEditarMontador() {
    const editMontadorForm = document.getElementById('editMontadorForm');
    const editMontadorModalEl = document.getElementById('editMontadorModal');
    if (editMontadorForm && editMontadorModalEl) {
        editMontadorForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const id = document.getElementById('editMontadorId').value;
            const nome = document.getElementById('editNomeMontador').value;
            const numero_registro = document.getElementById('editNumRegistroMontador').value;
            const token = localStorage.getItem('authToken');
            try {
                const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ nome, numero_registro }),
                });
                if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || 'Erro ao atualizar montador.'); }
                exibirSucesso('Montador atualizado com sucesso!');
                bootstrap.Modal.getInstance(editMontadorModalEl).hide();
                carregarMontadores();
            } catch (error) { exibirErro(error.message); }
        });
    }
}