/* ============================================= */
/* ARQUIVO: montadores.js                        */
/* (Lógica específica da página de Montadores)   */
/* ============================================= */

// --- 1. Importa o código partilhado ---
import {
    API_BASE_URL,
    verificarAutenticacaoECarregarUsuario,
    setupLogout
} from './common.js';

// --- 2. Executa o código da página ---
document.addEventListener("DOMContentLoaded", function () {

    // Funções partilhadas que rodam em todas as páginas protegidas
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    // Funções específicas que só rodam nesta página
    const tabelaMontadoresCorpo = document.getElementById("montadoresTabela");
    const filtroNomeMontador = document.getElementById("filtroNomeMontador");

    if (tabelaMontadoresCorpo) {
        // Carga inicial
        carregarMontadores();
        
        // Listener do filtro
        if (filtroNomeMontador) {
            filtroNomeMontador.addEventListener('input', () => carregarMontadores());
        }

        // Listener de clique na tabela (para botões de editar/excluir)
        tabelaMontadoresCorpo.addEventListener('click', function (event) {
            const targetElement = event.target;
            const deleteButton = targetElement.closest('.btn-delete-montador');
            if (deleteButton) {
                event.preventDefault();
                const linhaDoMontador = targetElement.closest('tr');
                const montadorId = linhaDoMontador.dataset.id;
                const montadorNome = linhaDoMontador.cells[1].textContent;
                if (confirm(`Você tem certeza que deseja excluir o montador "${montadorNome}"?`)) {
                    deletarMontador(montadorId);
                }
            }
            const editButton = targetElement.closest('.btn-edit-montador');
            if (editButton) {
                event.preventDefault();
                const linhaDoMontador = targetElement.closest('tr');
                const montadorId = linhaDoMontador.dataset.id;
                abrirModalEdicaoMontador(montadorId);
            }
        });

        // Listeners dos Modais
        setupModalAdicionarMontador();
        setupModalEditarMontador();
    }
});


// --- 3. Funções Específicas de Montadores ---

/**
 * Carrega e exibe os montadores na tabela.
 */
async function carregarMontadores() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const filtroNomeMontador = document.getElementById("filtroNomeMontador");
    const tabelaMontadoresCorpo = document.getElementById("montadoresTabela");

    const nome = filtroNomeMontador ? filtroNomeMontador.value : '';
    let url = `${API_BASE_URL}/api/montadores`;
    if (nome) {
        url += `?nome=${encodeURIComponent(nome)}`;
    }
    
    tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">A carregar montadores...</td></tr>`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) { throw new Error("Falha ao buscar a lista de montadores."); }
        const montadores = await response.json();
        tabelaMontadoresCorpo.innerHTML = "";
        if (montadores.length === 0) {
            tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Nenhum montador encontrado.</td></tr>`;
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
            tabelaMontadoresCorpo.innerHTML += linhaHTML;
        });
    } catch (error) {
        tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

/**
 * Deleta um montador.
 */
async function deletarMontador(id) {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.status === 204) {
            alert('Montador excluído com sucesso!');
            carregarMontadores();
        } else {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao excluir montador.');
        }
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Abre o modal de edição de montador com os dados preenchidos.
 */
async function abrirModalEdicaoMontador(id) {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) throw new Error('Falha ao buscar dados do montador.');
        const montador = await response.json();
        
        document.getElementById('editMontadorId').value = montador.id;
        document.getElementById('editNomeMontador').value = montador.nome;
        document.getElementById('editNumRegistroMontador').value = montador.numero_registro;
        
        const editModal = new bootstrap.Modal(document.getElementById('editMontadorModal'));
        editModal.show();
    } catch (error) {
        alert(error.message);
    }
}

// --- 4. Funções de Setup dos Modais ---

/**
 * Configura o listener do modal de "Adicionar Montador".
 */
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
                alert("Montador adicionado com sucesso!");
                const modalInstance = bootstrap.Modal.getInstance(addMontadorModalEl);
                modalInstance.hide();
                addMontadorForm.reset();
                carregarMontadores();
            } catch (error) { alert(error.message); }
        });
    }
}

/**
 * Configura o listener do modal de "Editar Montador".
 */
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
                alert('Montador atualizado com sucesso!');
                bootstrap.Modal.getInstance(editMontadorModalEl).hide();
                carregarMontadores();
            } catch (error) { alert(error.message); }
        });
    }
}