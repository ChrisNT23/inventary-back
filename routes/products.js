import express from 'express';
import Inventory from '../models/Inventory.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso no autorizado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token inválido' });
  }
};

// Crear nuevo item de inventario
router.post('/', authenticate, async (req, res) => {
  try {
    const inventoryItem = new Inventory({
      ...req.body,
      creadoPor: req.userId
    });

    const savedItem = await inventoryItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'El número de serie ya existe' });
    } else if (err.name === 'ValidationError') {
      res.status(400).json({ error: err.message });
    } else {
      console.error('Error al crear item:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Obtener todos los items (con filtros)
router.get('/', authenticate, async (req, res) => {
  try {
    const { tipo, status, cliente, facturado, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (tipo) query.tipo = tipo;
    if (status) query.status = status;
    if (cliente) query.cliente = new RegExp(cliente, 'i');
    if (facturado) query.facturado = facturado === 'true';

    const items = await Inventory.find(query)
      .populate('creadoPor', 'nombre email')
      .sort({ fechaCreacion: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Inventory.countDocuments(query);

    res.status(200).json({
      items,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (err) {
    console.error('Error al obtener items:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un item por ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('creadoPor', 'nombre email');
    
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error al obtener item:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar item
router.put('/:id', authenticate, async (req, res) => {
  try {
    // 1. Validar que el status esté presente y sea válido
    if (req.body.status && !['Por entregar', 'En progreso', 'Enviado', 'Entregado'].includes(req.body.status)) {
      return res.status(400).json({
        error: 'Valor de status inválido',
        details: 'Los valores permitidos son: Por entregar, En progreso, Enviado, Entregado'
      });
    }

    // 2. Actualizar el documento
    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
        context: 'query' // Importante para validaciones en updates
      }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json(updatedItem);
  } catch (err) {
    console.error('Error en actualización:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Error de validación',
        details: err.message,
        allowedStatusValues: ['Por entregar', 'En progreso', 'Enviado', 'Entregado']
      });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar item (solo admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
    
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.status(200).json({ 
      message: 'Item eliminado correctamente',
      deletedItemId: deletedItem._id 
    });
    
  } catch (err) {
    console.error('Error al eliminar item:', err);
    
    // Manejo específico de errores de MongoDB
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'ID de item inválido' });
    }
    
    res.status(500).json({ 
      error: 'Error al eliminar el item',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;