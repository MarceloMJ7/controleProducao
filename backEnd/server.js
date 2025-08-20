
//Importando Ferramentas que vamos usar no projeto
require('dotenv').config()
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');

//Iniciando ferramentas
const app = express();
const PORT = 3001;

//Config Plugins middlewares
app.use(cors()); //Plugin de segurança entre o front e o back
app.use(express.json())//Plugin para o servidor entender Json

app.get('/', (req, res) => {
    res.send("Hello, World")
})
app.use('/api', userRoutes);
app.use('/api', projectRoutes)
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})
