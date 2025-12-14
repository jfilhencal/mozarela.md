import db from "./database.js";
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function createAdmin() {
  try {
    console.log('🧹 Limpando base de dados...');
    
    // Limpar todas as tabelas
    await db.run('DELETE FROM sessions');
    await db.run('DELETE FROM cases');
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM items');
    
    console.log('✅ Base de dados limpa!');
    
    console.log('👤 Criando utilizador admin...');
    
    // Dados do admin
    const adminData = {
      id: randomUUID(),
      email: 'jfilhencal@gmail.com',
      fullName: 'Jorge Almeida',
      clinicName: 'Admin',
      isAdmin: 1
    };
    
    // Password
    const defaultPassword = 'das_iscas';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const data = JSON.stringify(adminData);
    
    await db.run(
      'INSERT INTO users (id, email, password, fullName, clinicName, data, isAdmin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [adminData.id, adminData.email, hashedPassword, adminData.fullName, adminData.clinicName, data, 1]
    );
    
    console.log('✅ Utilizador admin criado com sucesso!');
    console.log('');
    console.log('📋 Credenciais:');
    console.log('   Email: jfilhencal@gmail.com');
    console.log('   Password: das_iscas');
    console.log('');
    console.log('⚠️  IMPORTANTE: Muda a password após o primeiro login!');
    console.log('');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

createAdmin();
