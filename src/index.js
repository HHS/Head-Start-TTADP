import express from 'express'

const app = express();

app.get('/', function(req, res) {
    res.send('Hello from ttadp');
});

// start server
app.listen(process.env.PORT || 3000, () => {
    // TODO: add a logging message
});