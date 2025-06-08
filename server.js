// server.js

// 1. Importações
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

// 2. Configuração do App
const app = express();
const PORT = 3000;

// --- NOVO: Carrega o caminho do arquivo a partir das variáveis de ambiente ---
const DATA_FILE = process.env.CONFIG_FILE_PATH;

// Verificação de segurança: Garante que o caminho foi definido no .env
if (!DATA_FILE) {
    console.error("ERRO CRÍTICO: A variável de ambiente CONFIG_FILE_PATH não foi definida.");
    console.error("Por favor, adicione CONFIG_FILE_PATH=caminho/para/seu/config.json ao seu arquivo .env");
    process.exit(1); // Encerra a aplicação se o caminho não estiver configurado
}

console.log(`📝 Usando o arquivo de configuração em: ${DATA_FILE}`);

// 3. Middlewares
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Para parsear formulários HTML

// Configuração da Sessão
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 } // Em produção com HTTPS, use secure: true
}));

// Middleware para proteger rotas
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next(); // Usuário autenticado, continue
    } else {
        // Se for uma requisição de API, retorne 401. Se for uma página, redirecione.
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ message: 'Acesso não autorizado' });
        }
        res.redirect('/login.html');
    }
};

// Servir arquivos estáticos (HTML, CSS, JS do cliente)
app.use(express.static(path.join(__dirname, 'public')));


// 4. Rotas de Autenticação
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const isUserValid = (username === process.env.ADMIN_USER);
    const isPasswordValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

    if (isUserValid && isPasswordValid) {
        req.session.user = { username };
        res.status(200).json({ message: 'Login bem-sucedido' });
    } else {
        res.status(401).json({ message: 'Credenciais inválidas' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Não foi possível fazer logout.' });
        }
        res.status(200).json({ message: 'Logout bem-sucedido' });
    });
});


// 5. Rotas da API (Protegidas)
app.get('/api/data', requireAuth, async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao ler o arquivo de configuração.' });
    }
});

app.post('/api/data', requireAuth, async (req, res) => {
    try {
        // Validação básica do corpo da requisição
        if (!req.body || !Array.isArray(req.body.groups)) {
            return res.status(400).json({ message: 'Formato de dados inválido.' });
        }
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 4), 'utf-8');
        res.json({ message: 'Dados salvos com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar o arquivo de configuração.' });
    }
});

// Rota protegida para a página principal
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', requireAuth, (req, res) => {
     res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// 6. Iniciar Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log('Acesse a página de edição em http://localhost:3000/');
});