import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/products.js';
import authRoutes from './routes/auth.js'; // 1. Importa las rutas de autenticación

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/inventory', productRoutes);
app.use('/api/auth', authRoutes); // 2. Monta las rutas de autenticación

// Ruta de prueba básica
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '1.0.0' });
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.log('❌ Error de conexión:', err));

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

export default app;