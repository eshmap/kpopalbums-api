import express from 'express';
import contactsRouter from './routes/albums.js';

const port = process.env.PORT || 3000;
const app = express();

// Middleware

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes

app.use('/api/albums', contactsRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});