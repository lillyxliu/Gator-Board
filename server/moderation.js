const express = require('express');
const pool = require('./db');
const router = express.Router();
const admins = () => (process.env.ADMIN_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
router.use(async (req,res,next) => {
  if (!req.session.userId) return res.status(401).json({error:'Please log in.'});
  if (!admins().includes(String(req.session.userId))) return res.status(403).json({error:'Administrator access required.'});
  next();
});
router.get('/users', async (req,res) => {
  try {
    const result=await pool.query('SELECT id, username, is_banned, ban_reason FROM users ORDER BY id DESC LIMIT 200');
    res.json({users:result.rows});
  } catch {res.status(500).json({error:'Unable to load members.'});}
});
router.get('/reports',async(req,res)=>{
  try {const result=await pool.query('SELECT id, reported_id, reported_username, reason, details, created_at FROM fraud_reports ORDER BY created_at DESC LIMIT 100');res.json({reports:result.rows});}
  catch {res.status(500).json({error:'Unable to load reports.'});}
});
router.post('/users/:id/ban',async(req,res)=>{
  const id=Number(req.params.id), {banned,reason}=req.body;
  if (!Number.isSafeInteger(id)||id<=0||typeof banned!=='boolean'||(banned&&(typeof reason!=='string'||!reason.trim()||reason.length>500))) return res.status(400).json({error:'Provide a valid member and a ban reason (up to 500 characters).'});
  if (admins().includes(String(id))) return res.status(403).json({error:'Administrator accounts cannot be banned here.'});
  try {
    const result=await pool.query('UPDATE users SET is_banned=$2, ban_reason=$3 WHERE id=$1 RETURNING id, username, is_banned',[id,banned,banned?reason.trim():null]);
    if(!result.rows.length)return res.status(404).json({error:'Member not found.'});
    res.json({user:result.rows[0]});
  }catch{res.status(500).json({error:'Unable to update account.'});}
});
module.exports=router;
