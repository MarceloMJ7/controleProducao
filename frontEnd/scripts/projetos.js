import {
    API_BASE_URL,
    verificarAutenticacaoECarregarUsuario,
    setupLogout,
    getBadgeClass,
    exibirSucesso,
    exibirErro,
    confirmarAcao
} from './common.js';

let currentPage = 1;
const ITEMS_PER_PAGE = 10;

document.addEventListener("DOMContentLoaded", function () {
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    const tabelaProjetosCorpo = document.getElementById("projetosTabela");
    if (tabelaProjetosCorpo) {
        const filtroNomeInput = document.getElementById("filtroNome");
        const filtroStatusSelect = document.getElementById("filtroStatus");
        const urlParams = new URLSearchParams(window.location.search);
        const codigoParaFiltrar = urlParams.get('codigo');
        
        if (codigoParaFiltrar && filtroNomeInput) filtroNomeInput.value = codigoParaFiltrar;

        if (filtroNomeInput && filtroStatusSelect) {
            filtroNomeInput.addEventListener("input", () => { currentPage = 1; carregarProjetos(); });
            filtroStatusSelect.addEventListener("change", () => { currentPage = 1; carregarProjetos(); });
        }

        document.getElementById("paginacaoContainer").addEventListener("click", (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                e.preventDefault();
                const btn = e.target.closest('a');
                if (btn.dataset.page) {
                    currentPage = parseInt(btn.dataset.page);
                    carregarProjetos();
                }
            }
        });

        tabelaProjetosCorpo.addEventListener("click", async function (event) {
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
                const confirmou = await confirmarAcao("Excluir Projeto?", "Esta ação não pode ser desfeita.");
                if (confirmou) deletarProjeto(idDoProjeto);
                return;
            }
            if (targetElement.closest(".btn-edit")) {
                event.preventDefault();
                abrirModalDeEdicao(idDoProjeto);
                return;
            }
            
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

        setupModalNaoConformidade();
        setupModalAdicionarProjeto();
        setupModalEditarProjeto();
        carregarProjetos();
    }
});

async function carregarProjetos() {
    const detailsCard = document.getElementById("projectDetailsCard");
    if (detailsCard) detailsCard.classList.add("d-none");
    const token = localStorage.getItem("authToken"); if (!token) return;
    
    const nome = document.getElementById("filtroNome").value;
    const status = document.getElementById("filtroStatus").value;
    const tabela = document.getElementById("projetosTabela");
    
    let url = `${API_BASE_URL}/api/projects?page=${currentPage}&limit=${ITEMS_PER_PAGE}&nome=${encodeURIComponent(nome)}&status=${encodeURIComponent(status)}`;
    tabela.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Carregando...</td></tr>`;

    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) throw new Error("Falha ao buscar projetos.");
        
        const resultado = await response.json();
        const projetos = resultado.data;
        const meta = resultado.meta;

        tabela.innerHTML = "";
        if (projetos.length === 0) {
            tabela.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Nenhum projeto encontrado.</td></tr>`;
            atualizarPaginacao(meta);
            return;
        }

        projetos.forEach((projeto) => {
            const dataCadastro = new Date(projeto.data_cadastro).toLocaleDateString("pt-BR");
            const dataEntrega = new Date(projeto.data_entrega).toLocaleDateString("pt-BR");
            const nomesMontadores = projeto.montadores && projeto.montadores.length > 0 ? projeto.montadores.map(m => m.nome).join(', ') : "N/A";
            const badgeClass = getBadgeClass(projeto.status);
            const ncIcon = projeto.teveNaoConformidade ? '<i class="fas fa-exclamation-circle text-danger ms-1 small" title="Não Conforme"></i>' : '';
            const btnNC = projeto.status === 'Concluído' ? `<a href="#" class="btn btn-sm btn-outline-warning me-2 btn-nao-conformidade"><i class="fas fa-exclamation-triangle"></i></a>` : '';

            tabela.innerHTML += `
                <tr data-id="${projeto.id}" data-montadores-nomes="${nomesMontadores}" data-description="${projeto.descricao || ""}" data-codigo="${projeto.codigo_projeto || ""}" data-teve-nao-conformidade="${projeto.teveNaoConformidade}" data-descricao-nao-conformidade="${projeto.descricaoNaoConformidade || ""}">
                    <td>${projeto.codigo_projeto}</td>
                    <td>${projeto.nome_empresa}</td>
                    <td>${dataCadastro}</td>
                    <td>${dataEntrega}</td>
                    <td class="text-center"><span class="badge rounded-pill ${badgeClass}">${projeto.status}</span>${ncIcon}</td>
                    <td class="text-end">${btnNC}<a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit"><i class="fas fa-edit"></i></a><a href="#" class="btn btn-sm btn-outline-danger btn-delete"><i class="fas fa-trash-alt"></i></a></td>
                </tr>`;
        });

        atualizarPaginacao(meta);

    } catch (error) { 
        tabela.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`; 
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

async function deletarProjeto(id) {
    const token = localStorage.getItem("authToken");
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 204) {
            exibirSucesso("Projeto deletado com sucesso!");
            carregarProjetos();
        } else { throw new Error("Erro ao deletar."); }
    } catch (error) { exibirErro(error.message); }
}

async function abrirModalDeEdicao(id) {
    try {
        const token = localStorage.getItem("authToken");
        const [projRes, montRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (!projRes.ok || !montRes.ok) throw new Error("Erro ao buscar dados.");
        
        const projeto = await projRes.json();
        const montadores = await montRes.json();
        const select = document.getElementById("editMontadorResponsavel");
        select.innerHTML = "";
        const idsAtuais = projeto.montadores ? projeto.montadores.map(m => m.id) : [];
        
        montadores.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id; opt.textContent = m.nome;
            if (idsAtuais.includes(m.id)) opt.selected = true;
            select.appendChild(opt);
        });

        document.getElementById("editProjectId").value = projeto.id;
        document.getElementById("editNomeEmpresa").value = projeto.nome_empresa;
        document.getElementById("editCodigoProjeto").value = projeto.codigo_projeto;
        document.getElementById("editStatus").value = projeto.status;
        document.getElementById("editDescricao").value = projeto.descricao;
        document.getElementById("editDataCadastro").value = new Date(projeto.data_cadastro).toISOString().split("T")[0];
        document.getElementById("editDataEntrega").value = new Date(projeto.data_entrega).toISOString().split("T")[0];
        
        new bootstrap.Modal(document.getElementById("editProjectModal")).show();
    } catch (error) { exibirErro(error.message); }
}

function setupModalAdicionarProjeto() {
    const form = document.getElementById("addProjectForm");
    if (!form) return;
    
    document.getElementById("addProjectModal").addEventListener("show.bs.modal", async () => {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` } });
        if(res.ok) {
            const montadores = await res.json();
            const select = document.getElementById("montadorResponsavel");
            select.innerHTML = '';
            montadores.forEach(m => select.innerHTML += `<option value="${m.id}">${m.nome}</option>`);
            document.getElementById("dataCadastro").value = new Date().toISOString().split("T")[0];
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const montadorIds = Array.from(document.getElementById("montadorResponsavel").selectedOptions).map(o => parseInt(o.value));
        const data = {
            codigo_projeto: document.getElementById("codigoProjeto").value,
            nome_empresa: document.getElementById("nomeEmpresa").value,
            status: document.getElementById("statusInicial").value,
            descricao: document.getElementById("descricao").value,
            data_cadastro: document.getElementById("dataCadastro").value,
            data_entrega: document.getElementById("dataEntrega").value,
            montadorIds: montadorIds
        };
        try {
            const res = await fetch(`${API_BASE_URL}/api/projects`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken")}` },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Erro ao criar projeto.");
            exibirSucesso("Projeto criado!");
            bootstrap.Modal.getInstance(document.getElementById("addProjectModal")).hide();
            form.reset();
            carregarProjetos();
        } catch (e) { exibirErro(e.message); }
    });
}

function setupModalEditarProjeto() {
    const form = document.getElementById("editProjectForm");
    if(!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editProjectId").value;
        const montadorIds = Array.from(document.getElementById("editMontadorResponsavel").selectedOptions).map(o => parseInt(o.value));
        const data = {
            nome_empresa: document.getElementById("editNomeEmpresa").value,
            codigo_projeto: document.getElementById("editCodigoProjeto").value,
            status: document.getElementById("editStatus").value,
            descricao: document.getElementById("editDescricao").value,
            data_cadastro: document.getElementById("editDataCadastro").value,
            data_entrega: document.getElementById("editDataEntrega").value,
            montadorIds: montadorIds
        };
        try {
            const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
                method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken")}` },
                body: JSON.stringify(data)
            });
            if(!res.ok) throw new Error("Erro ao atualizar.");
            exibirSucesso("Projeto atualizado!");
            bootstrap.Modal.getInstance(document.getElementById("editProjectModal")).hide();
            carregarProjetos();
        } catch(e) { exibirErro(e.message); }
    });
}

function setupModalNaoConformidade() {
    const modal = document.getElementById('naoConformidadeModal');
    if(modal) {
        const check = document.getElementById('naoConformidadeCheckbox');
        check.addEventListener('change', function() {
            document.getElementById('naoConformidadeDescricaoDiv').style.display = this.checked ? 'block' : 'none';
            if(!this.checked) document.getElementById('naoConformidadeDescricao').value = '';
        });
        document.getElementById('naoConformidadeForm').addEventListener('submit', salvarNaoConformidade);
    }
}

function abrirModalNaoConformidade(id) {
    const tr = document.querySelector(`#projetosTabela tr[data-id='${id}']`);
    if(!tr) return;
    document.getElementById('naoConformidadeProjectId').value = id;
    document.getElementById('naoConformidadeProjectCode').textContent = tr.dataset.codigo;
    const teveNC = tr.dataset.teveNaoConformidade === 'true';
    document.getElementById('naoConformidadeCheckbox').checked = teveNC;
    document.getElementById('naoConformidadeDescricao').value = tr.dataset.descricaoNaoConformidade;
    document.getElementById('naoConformidadeDescricaoDiv').style.display = teveNC ? 'block' : 'none';
    new bootstrap.Modal(document.getElementById('naoConformidadeModal')).show();
}

async function salvarNaoConformidade(e) {
    e.preventDefault();
    const id = document.getElementById('naoConformidadeProjectId').value;
    const teve = document.getElementById('naoConformidadeCheckbox').checked;
    const desc = document.getElementById('naoConformidadeDescricao').value;
    try {
        const res = await fetch(`${API_BASE_URL}/api/projects/${id}/naoconformidade`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("authToken")}` },
            body: JSON.stringify({ teveNaoConformidade: teve, descricaoNaoConformidade: teve ? desc : null })
        });
        if(!res.ok) throw new Error("Erro ao salvar.");
        exibirSucesso("Status atualizado!");
        bootstrap.Modal.getInstance(document.getElementById('naoConformidadeModal')).hide();
        carregarProjetos();
    } catch(err) { exibirErro(err.message); }
}