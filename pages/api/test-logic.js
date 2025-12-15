export default function handler(req, res) {
  console.log('=== TEST LOGIC API REACHED ===');
  console.log('Method:', req.method);
  console.log('User:', req.user);
  
  return res.status(200).json({ 
    success: true, 
    message: 'Test API is working',
    method: req.method,
    user: req.user || 'no user'
  });
}