import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://trace_9_user:Y1NKJSO3kaW0FmIpSdqzA6eo10DCIOlQ@dpg-d50mnure5dus73dih2fg-a.oregon-postgres.render.com/trace_9',
  ssl: { rejectUnauthorized: false }
});

async function makePremium() {
  try {
    const email = 'surajaryancuj14@gmail.com';
    
    // Update user to premium
    const result = await pool.query(
      `UPDATE users 
       SET is_premium = true, updated_at = now() 
       WHERE email = $1 
       RETURNING email, name, is_premium, updated_at`,
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found. Creating new premium user...');
      
      // Create new premium user
      const createResult = await pool.query(
        `INSERT INTO users (email, name, is_premium, avatar_seed, picture) 
         VALUES ($1, $2, true, 'Felix', $3)
         RETURNING email, name, is_premium, created_at`,
        [
          email, 
          'Suraj', 
          'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf'
        ]
      );
      
      console.log('✅ Premium user created:', createResult.rows[0]);
    } else {
      console.log('✅ User updated to premium:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

makePremium();