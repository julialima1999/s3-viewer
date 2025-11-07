require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const Papa = require('papaparse');
const path = require('path');

const app = express();
const PORT = 3000;

// View engine e estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Config AWS
let s3;

console.log('🔹 Conectando à AWS...');
AWS.config.update({ region: process.env.AWS_REGION });
s3 = new AWS.S3();


// Rota dinâmica para nome de arquivo
app.get(['/', '/dados/:arquivo'], async (req, res) => {
  try {
    // Captura o nome do arquivo dinamicamente
    const fileKey =
      req.params.arquivo;

    // Validação simples do nome do arquivo (segurança)
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
    let type = 'unknown';

    // Detecta formato automaticamente
    if (text.startsWith('{') || text.startsWith('[')) {
      // Provavelmente JSON
      try {
        content = JSON.parse(text);
        type = 'json';
      } catch {
        type = 'invalid_json';
        content = text;
      }
    } else if (text.includes(';') || text.includes(',') || text.includes('\n')) {
      // Provavelmente CSV
      const parsed = Papa.parse(text, {
        header: true,
        delimiter: text.includes(';') ? ';' : ',',
        skipEmptyLines: true
      });
      content = parsed.data;
      type = 'csv';
    } else {
      // Texto puro
      content = text;
      type = 'text';
    }

    // Renderiza a página EJS com o conteúdo
    res.render('index', { content, type });
  } catch (err) {
    console.error('❌ Erro ao buscar arquivo:', err.message);
    res.status(500).send('Erro ao buscar arquivo: ' + err.message);
  }
});

// Inicializa o servidor
app.listen(PORT, () => console.log(`🚀 Server rodando em http://localhost:${PORT}`));
