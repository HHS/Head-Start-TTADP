import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello from ttadp');
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('src/frontend/build'));
}

module.exports = app;
