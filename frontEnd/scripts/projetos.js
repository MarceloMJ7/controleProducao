/* ============================================= */
/* ARQUIVO: projetos.js                          */
/* (Lógica específica da página de Projetos)     */
/* ============================================= */

// --- 1. Importa o código partilhado ---
import {
    API_BASE_URL,
    verificarAutenticacaoECarregarUsuario,
    setupLogout,
    getBadgeClass
} from './common.js';

// --- 2. Executa o código da página ---
document.addEventListener("DOMContentLoaded", function () {

    // Funções partilhadas que rodam em todas as páginas protegidas
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    // Funções específicas que só rodam nesta página
    const tabelaProjetosCorpo = document.getElementById("projetosTabela");
    if (tabelaProjetosCorpo) {
        // Pega os elementos de filtro
        const filtroNomeInput = document.getElementById("filtroNome");
        const filtroStatusSelect = document.getElementById("filtroStatus");

        // Verifica se veio um código de projeto pela URL (do dashboard)
        const urlParams = new URLSearchParams(window.location.search);
        const codigoParaFiltrar = urlParams.get('codigo');
        if (codigoParaFiltrar && filtroNomeInput) {
            filtroNomeInput.value = codigoParaFiltrar;
        }

        // Adiciona listeners de filtro
        if (filtroNomeInput && filtroStatusSelect) {
            filtroNomeInput.addEventListener("input", () => carregarProjetos());
            filtroStatusSelect.addEventListener("change", () => carregarProjetos());
        }

        // Listener de clique unificado para a tabela
        tabelaProjetosCorpo.addEventListener("click", function (event) {
            const targetElement = event.target;
            const linhaClicada = targetElement.closest("tr");
            if (!linhaClicada || !linhaClicada.dataset.id) return;
            const idDoProjeto = linhaClicada.dataset.id;

            if (targetElement.closest(".btn-nao-conformidade")) {
                event.preventDefault();
                abrirModalNaoConformidade(idDoProjeto);
                return;
            }
            if (targetElement.closest(".btn-delete")) {
                event.preventDefault();
                if (confirm("Você tem certeza que deseja excluir este projeto?")) {
                    deletarProjeto(idDoProjeto);
                }
                return;
            }
            if (targetElement.closest(".btn-edit")) {
                event.preventDefault();
                abrirModalDeEdicao(idDoProjeto);
                return;
            }

            // Clique na linha para ver detalhes
            const detailsCard = document.getElementById("projectDetailsCard");
            if (detailsCard) {
                document.getElementById("projectCodeDetail").innerText = `Detalhes do Projeto: ${linhaClicada.cells[0].textContent}`;
                document.getElementById("projectCompanyDetail").innerText = linhaClicada.cells[1].textContent;
                document.getElementById("projectDescriptionDetail").innerText = linhaClicada.dataset.description || "Sem descrição.";
                document.getElementById("projectAssemblerDetail").innerText = linhaClicada.dataset.montadoresNomes || "Nenhum";
                document.getElementById("projectStatusDetail").innerHTML = linhaClicada.cells[4].innerHTML;
                detailsCard.classList.remove("d-none");
            }
        });

        // Listeners dos Modais
        setupModalNaoConformidade();
        setupModalAdicionarProjeto();
        setupModalEditarProjeto();

        // Carga inicial
        carregarProjetos();
    }
});


// --- 3. Funções Específicas de Projetos ---

/**
 * Carrega e exibe os projetos na tabela.
 */
async function carregarProjetos() {
    const detailsCard = document.getElementById("projectDetailsCard");
    if (detailsCard) detailsCard.classList.add("d-none");
    const token = localStorage.getItem("authToken"); if (!token) return;
    
    const filtroNomeInput = document.getElementById("filtroNome");
    const filtroStatusSelect = document.getElementById("filtroStatus");
    const tabelaProjetosCorpo = document.getElementById("projetosTabela");

    const nome = filtroNomeInput ? filtroNomeInput.value : '';
    const status = filtroStatusSelect ? filtroStatusSelect.value : '';
    
    let url = `${API_BASE_URL}/api/projects`;
    const params = new URLSearchParams();
    if (nome) params.append("nome", nome);
    if (status) params.append("status", status);
    if (params.toString()) url += `?${params.toString()}`;

    tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Carregando projetos...</td></tr>`;
    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) {
            let errorMsg = "Falha ao buscar projetos.";
            try { const erroApi = await response.json(); errorMsg = erroApi.message || errorMsg; } catch (e) { /* Ignora */ }
            throw new Error(errorMsg);
        }
        const projetos = await response.json();
        tabelaProjetosCorpo.innerHTML = "";
        if (projetos.length === 0) {
            tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Nenhum projeto encontrado.</td></tr>`;
            return;
        }

        projetos.forEach((projeto) => {
            const dataCadastro = new Date(projeto.data_cadastro).toLocaleDateString("pt-BR");
            const dataEntrega = projeto.data_entrega ? new Date(projeto.data_entrega).toLocaleDateString("pt-BR") : "N/A";
            const nomesMontadores = projeto.montadores && projeto.montadores.length > 0 ? projeto.montadores.map(m => m.nome).join(', ') : "N/A";
            const badgeClass = getBadgeClass(projeto.status); // Importada de common.js

            const naoConformidadeIcone = projeto.teveNaoConformidade
                ? '<i class="fas fa-exclamation-circle text-danger ms-1 small" title="Este projeto teve não conformidade registrada"></i>'
                : '';
            const botaoNaoConformidade = projeto.status === 'Concluído'
                ? `<a href="#" class="btn btn-sm btn-outline-warning me-2 btn-nao-conformidade" title="Registrar/Ver Não Conformidade"><i class="fas fa-exclamation-triangle"></i></a>`
                : '';

            const novaLinhaHTML = `
                <tr data-id="${projeto.id}"
                    data-montadores-nomes="${nomesMontadores}"
                    data-description="${projeto.descricao || ""}"
                    data-codigo="${projeto.codigo_projeto || ""}"
                    data-teve-nao-conformidade="${projeto.teveNaoConformidade || false}"
                    data-descricao-nao-conformidade="${projeto.descricaoNaoConformidade || ""}" >
                    <td>${projeto.codigo_projeto}</td>
                    <td>${projeto.nome_empresa}</td>
                    <td>${dataCadastro}</td>
                    <td>${dataEntrega}</td>
                    <td class="text-center">
                        <span class="badge rounded-pill ${badgeClass}">${projeto.status}</span>${naoConformidadeIcone}
                    </td>
                    <td class="text-end">
                        ${botaoNaoConformidade}
                        <a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit" title="Editar"><i class="fas fa-edit"></i></a>
                        <a href="#" class="btn btn-sm btn-outline-danger btn-delete" title="Excluir"><i class="fas fa-trash-alt"></i></a>
                    </td>
                </tr>`;
            tabelaProjetosCorpo.innerHTML += novaLinhaHTML;
        });
    } catch (error) {
        tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

/**
 * Deleta um projeto.
 */
async function deletarProjeto(id) {
    const token = localStorage.getItem("authToken");
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 204) {
            alert("Projeto deletado com sucesso!");
            carregarProjetos();
        } else {
            const erro = await response.json();
            throw new Error(erro.message || "Erro ao deletar projeto.");
        }
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Busca dados do projeto e abre o modal de edição.
 */
async function abrirModalDeEdicao(id) {
    try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
        if (!response.ok) throw new Error("Falha ao buscar dados do projeto.");
        const projeto = await response.json();

        const montadoresResponse = await fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
        if (!montadoresResponse.ok) throw new Error("Falha ao buscar montadores.");
        const todosMontadores = await montadoresResponse.json();

        const montadorSelect = document.getElementById("editMontadorResponsavel");
        montadorSelect.innerHTML = "";
        const idsMontadoresAssociados = projeto.montadores ? projeto.montadores.map(m => m.id) : [];
        todosMontadores.forEach((montador) => {
            const option = document.createElement('option');
            option.value = montador.id; option.textContent = montador.nome;
            if (idsMontadoresAssociados.includes(montador.id)) { option.selected = true; }
            montadorSelect.appendChild(option);
        });

        document.getElementById("editProjectId").value = projeto.id;
        document.getElementById("editNomeEmpresa").value = projeto.nome_empresa;
        document.getElementById("editCodigoProjeto").value = projeto.codigo_projeto;
        document.getElementById("editStatus").value = projeto.status;
        document.getElementById("editDescricao").value = projeto.descricao;
        document.getElementById("editDataCadastro").value = new Date(projeto.data_cadastro).toISOString().split("T")[0];
        document.getElementById("editDataEntrega").value = projeto.data_entrega ? new Date(projeto.data_entrega).toISOString().split("T")[0] : "";
        
        const modal = new bootstrap.Modal(document.getElementById("editProjectModal"));
        modal.show();
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Abre e preenche o modal de Não Conformidade.
 */
function abrirModalNaoConformidade(id) {
    const linhaProjeto = document.querySelector(`#projetosTabela tr[data-id='${id}']`);
    if (!linhaProjeto) {
        console.error("Não foi possível encontrar os dados do projeto na tabela para o ID:", id);
        alert("Erro ao carregar dados da não conformidade.");
        return;
    }
    const codigoProjeto = linhaProjeto.dataset.codigo || 'N/A';
    const teveNaoConformidade = linhaProjeto.dataset.teveNaoConformidade === 'true';
    const descricaoNaoConformidade = linhaProjeto.dataset.descricaoNaoConformidade || '';
    
    document.getElementById('naoConformidadeProjectId').value = id;
    document.getElementById('naoConformidadeProjectCode').textContent = codigoProjeto;
    const checkbox = document.getElementById('naoConformidadeCheckbox');
    checkbox.checked = teveNaoConformidade;
    document.getElementById('naoConformidadeDescricao').value = descricaoNaoConformidade;
    document.getElementById('naoConformidadeDescricaoDiv').style.display = teveNaoConformidade ? 'block' : 'none';
    
    const modalElement = document.getElementById('naoConformidadeModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

/**
 * Salva o status de Não Conformidade.
 */
async function salvarNaoConformidade(event) {
    event.preventDefault();
    const id = document.getElementById('naoConformidadeProjectId').value;
    const teveNaoConformidade = document.getElementById('naoConformidadeCheckbox').checked;
    const descricaoNaoConformidade = document.getElementById('naoConformidadeDescricao').value;
    const token = localStorage.getItem("authToken");
    if (!id || !token) { alert("Erro: ID do projeto ou token não encontrado."); return; }
    
    const dados = {
        teveNaoConformidade: teveNaoConformidade,
        descricaoNaoConformidade: teveNaoConformidade ? (descricaoNaoConformidade.trim() || null) : null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}/naoconformidade`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(dados)
        });
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao salvar status de não conformidade.');
        }
        const modalElement = document.getElementById('naoConformidadeModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) { modalInstance.hide(); }
        alert('Status de não conformidade atualizado com sucesso!');
        carregarProjetos(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao salvar não conformidade:", error);
        alert(error.message);
    }
}

// --- 4. Funções de Setup dos Modais ---

/**
 * Configura os listeners do modal de "Adicionar Projeto".
 */
function setupModalAdicionarProjeto() {
    const addProjectForm = document.getElementById("addProjectForm");
    if (addProjectForm) {
        const addProjectModal = document.getElementById("addProjectModal");
        addProjectModal.addEventListener("show.bs.modal", async () => {
            try {
                const token = localStorage.getItem("authToken");
                const response = await fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
                if (!response.ok) throw new Error("Falha ao buscar montadores.");
                const montadores = await response.json();
                const montadorSelect = document.getElementById("montadorResponsavel");
                montadorSelect.innerHTML = '';
                montadores.forEach((montador) => { montadorSelect.innerHTML += `<option value="${montador.id}">${montador.nome}</option>`; });
                document.getElementById("dataCadastro").value = new Date().toISOString().split("T")[0];
            } catch (error) { alert(error.message); }
        });

        addProjectForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const montadorSelect = document.getElementById("montadorResponsavel");
            const montadorIdsSelecionados = Array.from(montadorSelect.selectedOptions).map(option => parseInt(option.value));
            const dadosDoProjeto = {
                codigo_projeto: document.getElementById("codigoProjeto").value,
                nome_empresa: document.getElementById("nomeEmpresa").value,
                status: document.getElementById("statusInicial").value,
                descricao: document.getElementById("descricao").value,
                data_cadastro: document.getElementById("dataCadastro").value,
                data_entrega: document.getElementById("dataEntrega").value, // O backend já valida se é nulo
                montadorIds: montadorIdsSelecionados,
            };
            try {
                const token = localStorage.getItem("authToken");
                const response = await fetch(`${API_BASE_URL}/api/projects`, {
                    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(dadosDoProjeto),
                });
                if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao criar projeto."); }
                alert("Projeto criado com sucesso!");
                carregarProjetos();
                const modalInstance = bootstrap.Modal.getInstance(addProjectModal);
                modalInstance.hide();
                addProjectForm.reset();
            } catch (error) { alert(error.message); }
        });
    }
}

/**
 * Configura os listeners do modal de "Editar Projeto".
 */
function setupModalEditarProjeto() {
    const editProjectForm = document.getElementById("editProjectForm");
    if (editProjectForm) {
        editProjectForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const id = document.getElementById("editProjectId").value;
            const montadorSelect = document.getElementById("editMontadorResponsavel");
            const montadorIdsSelecionados = Array.from(montadorSelect.selectedOptions).map(option => parseInt(option.value));
            const dadosAtualizados = {
                nome_empresa: document.getElementById("editNomeEmpresa").value,
                codigo_projeto: document.getElementById("editCodigoProjeto").value,
                status: document.getElementById("editStatus").value,
                descricao: document.getElementById("editDescricao").value,
                data_cadastro: document.getElementById("editDataCadastro").value,
                data_entrega: document.getElementById("editDataEntrega").value, // O backend já valida
                montadorIds: montadorIdsSelecionados,
            };
            try {
                const token = localStorage.getItem("authToken");
                const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
                    method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(dadosAtualizados),
                });
                if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao atualizar projeto."); }
                alert("Projeto atualizado com sucesso!");
                carregarProjetos();
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById("editProjectModal"));
                modalInstance.hide();
            } catch (error) { alert(error.message); }
        });
    }
}

/**
 * Configura os listeners do modal de "Não Conformidade".
 */
function setupModalNaoConformidade() {
    const naoConformidadeModalEl = document.getElementById('naoConformidadeModal');
    if (naoConformidadeModalEl) {
        const checkbox = document.getElementById('naoConformidadeCheckbox');
        const descricaoDiv = document.getElementById('naoConformidadeDescricaoDiv');
        const form = document.getElementById('naoConformidadeForm');

        checkbox.addEventListener('change', function () {
            descricaoDiv.style.display = this.checked ? 'block' : 'none';
            if (!this.checked) {
                document.getElementById('naoConformidadeDescricao').value = '';
            }
        });
        
        form.addEventListener('submit', salvarNaoConformidade);
    }
}