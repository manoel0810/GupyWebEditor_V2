// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('login.html')) {
        handleLoginPage();
    } else {
        handleEditorPage();
    }
});

// --- LÓGICA DA PÁGINA DE LOGIN ---
function handleLoginPage() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                window.location.href = '/index.html'; // Redireciona para o editor
            } else {
                const result = await response.json();
                errorMessage.textContent = result.message || 'Falha no login.';
            }
        } catch (error) {
            errorMessage.textContent = 'Erro de conexão com o servidor.';
        }
    });
}

// --- LÓGICA DA PÁGINA DE EDIÇÃO ---
function handleEditorPage() {
    const groupsList = document.getElementById('groups-list');
    const groupTemplate = document.getElementById('group-template');
    const addGroupBtn = document.getElementById('add-group-btn');
    const saveBtn = document.getElementById('save-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Carregar dados iniciais
    const loadData = async () => {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) {
                // Se a sessão expirou ou o acesso é indevido, o middleware redirecionará
                if (response.status === 401) window.location.href = '/login.html';
                return;
            }
            const data = await response.json();
            renderGroups(data.groups);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Não foi possível carregar os dados de configuração.');
        }
    };

    // Renderizar os grupos na tela
    const renderGroups = (groups) => {
        groupsList.innerHTML = '';
        groups.forEach(group => {
            const card = createGroupCard(group);
            groupsList.appendChild(card);
        });
    };

    // Criar um card de grupo a partir do template
    const createGroupCard = (group = {}) => {
        const card = groupTemplate.content.cloneNode(true).querySelector('.group-card');
        
        card.querySelector('.group-key').value = group.key || '';
        card.querySelector('.group-emails').value = (group.emails || []).join(', ');
        card.querySelector('.group-id').value = group.groupId || '';
        card.querySelector('.group-remote').checked = group.remoteOnly || false;
        card.querySelector('.group-skip').checked = group.skip || false;

        card.querySelector('.delete-group-btn').addEventListener('click', () => card.remove());

        return card;
    };
    
    // Adicionar um novo grupo
    addGroupBtn.addEventListener('click', () => {
        const newCard = createGroupCard();
        groupsList.appendChild(newCard);
    });

    // Salvar todas as alterações
    saveBtn.addEventListener('click', async () => {
        const groups = [];
        const groupCards = document.querySelectorAll('.group-card');

        groupCards.forEach(card => {
            const group = {
                key: card.querySelector('.group-key').value.trim(),
                emails: card.querySelector('.group-emails').value.split(',').map(e => e.trim()).filter(e => e),
                groupId: parseInt(card.querySelector('.group-id').value, 10) || 0,
                remoteOnly: card.querySelector('.group-remote').checked,
                skip: card.querySelector('.group-skip').checked,
            };
            groups.push(group);
        });

        try {
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groups })
            });
            const result = await response.json();
            alert(result.message);
        } catch (error) {
            alert('Erro ao salvar os dados.');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });
    
    // Carregar dados ao iniciar a página
    loadData();
}