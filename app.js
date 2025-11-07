require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const Papa = require('papaparse');
const path = require('path');

const app = express();
const PORT = 3000;

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Config AWS
console.log('🔹 Conectando à AWS...');
AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3();

// Rota dinâmica para ler arquivo do S3
app.get('/dados/:arquivo', async (req, res) => {
  try {
    const fileKey = req.params.arquivo;

    if (!/^[\w.\-]+$/.test(fileKey)) {
      return res.status(400).send('❌ Nome de arquivo inválido.');
    }

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileKey
    };

    console.log(`📥 Lendo do S3: ${params.Bucket}/${params.Key}`);

    // Lê o arquivo do S3
    const data = await s3.getObject(params).promise();
    const text = data.Body.toString('utf-8').trim();

    let content;
    // Detecta formato automaticamente
    if (text.startsWith('{') || text.startsWith('[')) {
      content = JSON.parse(text);
    } else if (text.includes(';') || text.includes(',') || text.includes('\n')) {
      const parsed = Papa.parse(text, {
        header: true,
        delimiter: text.includes(';') ? ';' : ',',
        skipEmptyLines: true
      });
      content = parsed.data;
    } else {
      content = text;
    }

    // 👉 Envia JSON em vez de renderizar EJS
    res.json(content);
  } catch (err) {
    console.error('❌ Erro ao buscar arquivo:', err.message);
    res.status(500).send('Erro ao buscar arquivo: ' + err.message);
  }
});

// Inicializa o servidor
app.listen(PORT, () => console.log(`🚀 Server rodando em http://localhost:${PORT}`));
