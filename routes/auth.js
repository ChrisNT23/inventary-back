import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, pais, password } = req.body;
    // Validación mejorada
    const requiredFields = ['nombre', 'apellido', 'fechaNacimiento', 'email', 'pais', 'password'];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Faltan campos obligatorios: ${missingFields.join(', ')}` 
      });
    }

    // Validar formato email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Validar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Validar edad mínima (18 años)
    const birthDate = new Date(fechaNacimiento);
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    
    if (age < 18) {
      return res.status(400).json({ error: 'Debes tener al menos 18 años para registrarte' });
    }

    const salt = await bcrypt.genSalt(10); // Genera un salt de 10 rondas
    
    // 2. Hashear la contraseña con el salt
    const hashedPassword = await bcrypt.hash(password, salt); // Usa el salt generado

    // 3. Crear usuario con el hash correcto
    const user = new User({
      nombre,
      apellido,
      fechaNacimiento,
      email,
      pais,
      password: password // Usa el hash generado con salt
    });

    await user.save();
    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    console.error('Error en registro:', err);
    
    // Manejo específico para errores de MongoDB
    if (err.name === 'MongoServerError' && err.code === 11000) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Login de usuario (existente)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email }).select('+password'); // Asegura que incluya el campo password
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Respuesta completa con todos los datos necesarios
    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        pais: user.pais,
        fechaNacimiento: user.fechaNacimiento // Opcional si lo necesitas
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});


router.post('/verify-password', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  
  const isValid = await bcrypt.compare(password, user.password);
  res.json({
    userExists: !!user,
    passwordMatch: isValid,
    storedHash: user.password
  });
});


export default router;