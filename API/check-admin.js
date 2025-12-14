import db from "./database.js";

const checkAdmin = async () => {
  try {
    const rows = await db.all('SELECT email, fullName, isAdmin FROM users WHERE email = ?', ['jfilhencal@gmail.com']);
    console.log('Admin user check:', JSON.stringify(rows, null, 2));
    
    if (rows.length === 0) {
      console.log('User not found! Creating admin...');
    } else {
      const user = rows[0];
      console.log(`User found: ${user.fullName} (${user.email})`);
      console.log(`isAdmin status: ${user.isAdmin} (should be 1)`);
      
      if (user.isAdmin !== 1) {
        console.log('Fixing admin status...');
        await db.run('UPDATE users SET isAdmin = 1 WHERE email = ?', ['jfilhencal@gmail.com']);
        console.log('Admin status updated!');
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
};

checkAdmin();
