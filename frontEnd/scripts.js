/* ============================================= */
/* LÓGICA GLOBAL (SEGURANÇA E PERSONALIZAÇÃO)    */
/* ============================================= */
document.addEventListener('DOMContentLoaded', function() {
  const paginasDeAcesso = ['login.html', 'cadastro.html', 'esqueci-senha.html'];
  const paginaAtual = window.location.pathname.split('/').pop();
  if (paginasDeAcesso.includes(paginaAtual) || paginaAtual === "") {
      return;
  }
  carregarDadosUsuario();
});

async function carregarDadosUsuario() {
  const token = localStorage.getItem('authToken');
  if (!token) {
      window.location.href = 'login.html';
      return;
  }
  try {
     const response = await fetch('http://localhost:3001/api/usuarios/perfil', {
     // const response = await fetch('http://localhost:3001/api/usuarios/perfil', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
          const usuario = await response.json();
          const elementoNome = document.getElementById('nomeUsuarioLogado');
          if (elementoNome) elementoNome.textContent = usuario.nome;
      } else {
          localStorage.removeItem('authToken');
          window.location.href = 'login.html';
      }
  } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
  }
}

/* ============================================= */
/* LÓGICA DA TELA DE CADASTRO                    */
/* ============================================= */
const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
  cadastroForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const nome = document.getElementById('nome').value;
      const numero_registro = document.getElementById('numero_registro').value;
      const email = document.getElementById('email').value;
      const senha = document.getElementById('senha').value;
      const confirmarSenha = document.getElementById('confirmarSenha').value;

      if (senha !== confirmarSenha) {
          alert('As senhas não coincidem!');
          return;
      }
      try {
          const response = await fetch('http://localhost:3001/api/usuarios', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nome, numero_registro, email, senha }),
          });
          const data = await response.json();
          if (response.status === 201) {
              alert('Usuário criado com sucesso! Por favor, faça o login.');
              window.location.href = 'login.html';
          } else {
              throw new Error(data.message || 'Erro ao cadastrar usuário.');
          }
      } catch (error) {
          alert(error.message);
      }
  });
}

/* ============================================= */
/* LÓGICA DA TELA DE LOGIN                       */
/* ============================================= */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const numero_registro = document.getElementById('numero_registro').value;
      const senha = document.getElementById('senha').value;
      try {
          const response = await fetch('http://localhost:3001/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ numero_registro, senha }),
          });
          const data = await response.json();
          if (response.ok) {
              localStorage.setItem('authToken', data.token);
              alert('Login realizado com sucesso!');
              window.location.href = 'dashboard.html';
          } else {
              throw new Error(data.message || 'Erro ao fazer login.');
          }
      } catch (error) {
          alert(error.message);
      }
  });
}

/* ============================================= */
/* LÓGICA DA TELA DE PROJETOS (CRUD COMPLETO)    */
/* ============================================= */
const tabelaProjetosCorpo = document.getElementById('projetosTabela');
if (tabelaProjetosCorpo) {
  
  // ----- PARTE 1: O "SUPERVISOR" DE CLIQUES INTELIGENTE -----
  tabelaProjetosCorpo.addEventListener('click', function(event) {
      const targetElement = event.target;
      const linhaClicada = targetElement.closest('tr');
      if (!linhaClicada) return;

      const idDoProjeto = linhaClicada.dataset.id;
      
      if (targetElement.closest('.btn-delete')) {
          event.preventDefault();
          if (confirm('Você tem certeza que deseja excluir este projeto?')) {
              deletarProjeto(idDoProjeto);
          }
      } else if (targetElement.closest('.btn-edit')) {
          event.preventDefault();
          abrirModalDeEdicao(idDoProjeto);
      } else if (linhaClicada.dataset.description) {
          const detailsCard = document.getElementById('projectDetailsCard');
          document.getElementById('projectCodeDetail').innerText = `Detalhes do Projeto: ${linhaClicada.cells[0].textContent}`;
          document.getElementById('projectCompanyDetail').innerText = linhaClicada.cells[1].textContent;
          document.getElementById('projectDescriptionDetail').innerText = linhaClicada.dataset.description;
          document.getElementById('projectAssemblerDetail').innerText = linhaClicada.dataset.montador;
          document.getElementById('projectStatusDetail').innerHTML = linhaClicada.cells[4].innerHTML;
          detailsCard.classList.remove('d-none');
      }
  });

  // ----- PARTE 2: FUNÇÕES PRINCIPAIS (Carregar, Deletar, Abrir Modal) -----
  async function carregarProjetos() {
      document.getElementById('projectDetailsCard').classList.add('d-none');
      const token = localStorage.getItem('authToken');
      try {
          const response = await fetch('http://localhost:3001/api/projetos', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Falha ao buscar projetos.');
          const projetos = await response.json();
          tabelaProjetosCorpo.innerHTML = '';
          if (projetos.length === 0) {
              tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Nenhum projeto cadastrado ainda.</td></tr>`;
              return;
          }
          projetos.forEach(projeto => {
              const dataCadastro = new Date(projeto.data_cadastro).toLocaleDateString('pt-BR');
              const dataEntrega = projeto.data_entrega ? new Date(projeto.data_entrega).toLocaleDateString('pt-BR') : 'N/A';
              const novaLinhaHTML = `
                  <tr data-id="${projeto.id}" data-montador="${projeto.montador.nome}" data-description="${projeto.descricao || 'Sem descrição.'}">
                      <td>${projeto.codigo_projeto}</td>
                      <td>${projeto.nome_empresa}</td>
                      <td>${dataCadastro}</td>
                      <td>${dataEntrega}</td>
                      <td class="text-center"><span class="badge rounded-pill border border-primary text-primary">${projeto.status}</span></td>
                      <td class="text-end">
                          <a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit"><i class="fas fa-edit"></i></a>
                          <a href="#" class="btn btn-sm btn-outline-danger btn-delete"><i class="fas fa-trash-alt"></i></a>
                      </td>
                  </tr>`;
              tabelaProjetosCorpo.innerHTML += novaLinhaHTML;
          });
      } catch (error) {
          tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
      }
  }

  async function deletarProjeto(id) {
      const token = localStorage.getItem('authToken');
      try {
          const response = await fetch(`http://localhost:3001/api/projetos/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.status === 204) {
              alert('Projeto deletado com sucesso!');
              carregarProjetos();
          } else {
              const erro = await response.json();
              throw new Error(erro.message || 'Erro ao deletar projeto.');
          }
      } catch (error) {
          alert(error.message);
      }
  }

  async function abrirModalDeEdicao(id) {
      try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`http://localhost:3001/api/projetos/${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Falha ao buscar dados do projeto.');
          const projeto = await response.json();
          const montadoresResponse = await fetch('http://localhost:3001/api/montadores', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!montadoresResponse.ok) throw new Error('Falha ao buscar montadores.');
          const montadores = await montadoresResponse.json();
          const montadorSelect = document.getElementById('editMontadorResponsavel');
          montadorSelect.innerHTML = '';
          montadores.forEach(montador => {
              const option = `<option value="${montador.id}">${montador.nome}</option>`;
              montadorSelect.innerHTML += option;
          });
          document.getElementById('editProjectId').value = projeto.id;
          document.getElementById('editNomeEmpresa').value = projeto.nome_empresa;
          document.getElementById('editCodigoProjeto').value = projeto.codigo_projeto;
          document.getElementById('editMontadorResponsavel').value = projeto.montadorId;
          document.getElementById('editStatus').value = projeto.status;
          document.getElementById('editDescricao').value = projeto.descricao;
          document.getElementById('editDataCadastro').value = new Date(projeto.data_cadastro).toISOString().split('T')[0];
          if (projeto.data_entrega) {
              document.getElementById('editDataEntrega').value = new Date(projeto.data_entrega).toISOString().split('T')[0];
          } else {
              document.getElementById('editDataEntrega').value = '';
          }
          const modal = new bootstrap.Modal(document.getElementById('editProjectModal'));
          modal.show();
      } catch (error) {
          alert(error.message);
      }
  }

  // ----- PARTE 3: Lógica dos Formulários dos Modais -----
  const addProjectModal = document.getElementById('addProjectModal');
  const addProjectForm = document.getElementById('addProjectForm');
  
  if (addProjectModal) {
      addProjectModal.addEventListener('show.bs.modal', async () => {
          try {
              const token = localStorage.getItem('authToken');
              const response = await fetch('http://localhost:3001/api/montadores', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) throw new Error('Falha ao buscar montadores.');
              const montadores = await response.json();
              
              const montadorSelect = document.getElementById('montadorResponsavel');
              montadorSelect.innerHTML = '<option value="">Selecione...</option>';
              montadores.forEach(montador => {
                  const option = `<option value="${montador.id}">${montador.nome}</option>`;
                  montadorSelect.innerHTML += option;
              });

              const campoDataCadastro = document.getElementById('dataCadastro');
              const hoje = new Date();
              campoDataCadastro.value = hoje.toISOString().split('T')[0];
          } catch (error) {
              alert(error.message);
          }
      });
  }

  if (addProjectForm) {
      addProjectForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          const dadosDoProjeto = {
              codigo_projeto: document.getElementById('codigoProjeto').value,
              nome_empresa: document.getElementById('nomeEmpresa').value,
              status: document.getElementById('statusInicial').value,
              descricao: document.getElementById('descricao').value,
              data_cadastro: document.getElementById('dataCadastro').value,
              data_entrega: document.getElementById('dataEntrega').value,
              montadorId: document.getElementById('montadorResponsavel').value,
          };
          try {
              const token = localStorage.getItem('authToken');
              const response = await fetch('http://localhost:3001/api/projetos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(dadosDoProjeto)
              });
              if (!response.ok) {
                  const erro = await response.json();
                  throw new Error(erro.message || 'Erro ao criar projeto.');
              }
              alert('Projeto criado com sucesso!');
              carregarProjetos();
              const modalInstance = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
              modalInstance.hide();
              addProjectForm.reset();
          } catch (error) {
              alert(error.message);
          }
      });
  }

  const editProjectForm = document.getElementById('editProjectForm');
  if(editProjectForm) {
      // CORREÇÃO: A lógica que faltava foi adicionada aqui
      editProjectForm.addEventListener('submit', async function(event) {
          event.preventDefault();
          const id = document.getElementById('editProjectId').value;
          const dadosAtualizados = {
              nome_empresa: document.getElementById('editNomeEmpresa').value,
              codigo_projeto: document.getElementById('editCodigoProjeto').value,
              montadorId: parseInt(document.getElementById('editMontadorResponsavel').value),
              status: document.getElementById('editStatus').value,
              descricao: document.getElementById('editDescricao').value,
              data_cadastro: document.getElementById('editDataCadastro').value,
              data_entrega: document.getElementById('editDataEntrega').value || null,
          };
          try {
              const token = localStorage.getItem('authToken');
              const response = await fetch(`http://localhost:3001/api/projetos/${id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(dadosAtualizados)
              });
              if (!response.ok) {
                  const erro = await response.json();
                  throw new Error(erro.message || 'Erro ao atualizar projeto.');
              }
              alert('Projeto atualizado com sucesso!');
              carregarProjetos();
              const modalInstance = bootstrap.Modal.getInstance(document.getElementById('editProjectModal'));
              modalInstance.hide();
          } catch (error) {
              alert(error.message);
          }
      });
  }
  
  // ----- PARTE 4: O pontapé inicial -----
  carregarProjetos();
}