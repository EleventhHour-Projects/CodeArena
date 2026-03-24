// src/index.ts
import express, { type Application, type Request, type Response } from 'express';
import internalRoutes from './routes/internalRoutes.js';

const app: Application = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/internal', internalRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to Express & TypeScript Server');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
