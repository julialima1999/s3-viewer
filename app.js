require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const app = express();
const PORT = 3000;

// View engine
app.set('view engine', 'ejs');

// Static files
app.use(express.static('public'));

// AWS S3
AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3(); // SDK usará automaticamente a Role da EC2


app.get('/', async (req, res) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: process.env.S3_KEY
  };

  try {
    const data = await s3.getObject(params).promise();
    const content = data.Body.toString('utf-8');
    let parsed;

    try {
      parsed = JSON.parse(content); // tenta transformar em JSON
    } catch (e) {
      parsed = content; // se não for JSON, mostra como texto
    }

    res.render('index', { content: parsed });
  } catch (err) {
    res.status(500).send(`Erro ao buscar arquivo do S3: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
