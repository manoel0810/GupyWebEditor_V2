// server.js (VERSÃO CORRIGIDA E SEGURA)

// 1. Importações (sem mudanças)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

// 2. Configuração do App
const app = express();
const PORT = 3000;
const DATA_FILE = process.env.CONFIG_FILE_PATH;

if (!DATA_FILE) {
    console.error("ERRO CRÍTICO: A variável de ambiente CONFIG_FILE_PATH não foi definida.");
    process.exit(1);
}
console.log(`📝 Usando o arquivo de configuração em: ${DATA_FILE}`);


// 3. Middlewares (sem mudanças)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 }
}));

// Middleware para proteger rotas (sem mudanças na função, mas o uso muda)
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ message: 'Acesso não autorizado' });
        }
        res.redirect('/login.html');
    }
};

// --- MUDANÇA CRÍTICA AQUI ---
// Servir arquivos estáticos da pasta 'public'. A pasta 'views' NÃO é pública.
app.use(express.static(path.join(__dirname, 'public')));


// 4. Rotas de Autenticação (sem mudanças)
app.post('/login', async (req, res) => {
    // ... (código do login continua o mesmo)
    const { username, password } = req.body;
    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD_HASH) {
        return res.status(500).json({ message: 'Erro de configuração do servidor.' });
    }
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
    // ... (código do logout continua o mesmo)
    req.session.destroy(err => {
        if (err) { return res.status(500).json({ message: 'Não foi possível fazer logout.' }); }
        res.status(200).json({ message: 'Logout bem-sucedido' });
    });
});


// 5. Rotas da API (Protegidas, sem mudanças)
app.get('/api/data', requireAuth, async (req, res) => {
    // ... (código da API continua o mesmo)
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao ler o arquivo de configuração.' });
    }
});

app.post('/api/data', requireAuth, async (req, res) => {
    // ... (código da API continua o mesmo)
    try {
        if (!req.body || !Array.isArray(req.body.groups)) {
            return res.status(400).json({ message: 'Formato de dados inválido.' });
        }
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 4), 'utf-8');
        res.json({ message: 'Dados salvos com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar o arquivo de configuração.' });
    }
});


// --- MUDANÇA CRÍTICA AQUI ---
// Rotas protegidas para servir a página principal a partir da pasta 'views'
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/index.html', requireAuth, (req, res) => {
     res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// 6. Iniciar Servidor (sem mudanças)
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});