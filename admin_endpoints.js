// Add this to your server.js file for easy premium user management

// Admin endpoint to promote user to premium (add after other routes)
app.post('/api/admin/promote-premium', async (req, res) => {
  try {
    const { email, adminKey } = req.body;
    
    // Simple admin key check (set ADMIN_KEY in your environment)
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // Update user to premium
    const result = await runQuery(
      `UPDATE users 
       SET is_premium = true, updated_at = now() 
       WHERE email = $1 
       RETURNING email, name, is_premium, updated_at`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`[admin] Promoted ${email} to premium`);
    res.json({ 
      success: true, 
      user: result.rows[0],
      message: `${email} promoted to premium successfully` 
    });
    
  } catch (error) {
    console.error('[admin/promote-premium] error:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Admin endpoint to check user status
app.get('/api/admin/user-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { adminKey } = req.query;
    
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await runQuery(
      'SELECT email, name, is_premium, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
    
  } catch (error) {
    console.error('[admin/user-status] error:', error);
    res.status(500).json({ error: 'Failed to get user status' });
  }
});