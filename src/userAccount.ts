import bcrypt from "bcrypt"


const saltRounds = 10;
const plainPassword = 'cortinova24user';

bcrypt.hash(plainPassword, saltRounds, (err: any, hash: any) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    // Guarda 'hash' en la base de datos en lugar de la contraseña en texto plano
    console.log('Hashed password:', hash);
  }
});
