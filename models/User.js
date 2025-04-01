import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';


const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  fechaNacimiento: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  pais: { type: String, required: true },
  password: { type: String, required: true }
}, { timestamps: true });

// Hash de contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  // Solo hashear si la contraseña fue modificada
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('User', UserSchema);