// global variables -- to connect the superbase with this project
const SUPABASE_URL = 'https://ctfmdagftjbjmrxcvifw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vlMtSjFVVXrntElJYlrUzA_wPpJ1_TO';
const db = supabase.createClient('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY');

// const db = supabase.createClient(
//     'https://ctfmdagftjbjmrxcvifw.supabase.co',
//     'sb_publishable_vlMtSjFVVXrntElJYlrUzA_wPpJ1_TO'
// );

// <!doctype html>
// <meta charset="utf-8">
// <title>Supabase test</title>
// <h2>1. Search products</h2>
// <input id="q" value="auckland wises"><button id="search">Search</button>
 
// <h2>2. Log in</h2>
// <input id="email" placeholder="email">
// <input id="pass" type="password" placeholder="password">
// <button id="login">Log in</button>
 
// <h2>3. Invite staff (sends a real email)</h2>
// <input id="invite" placeholder="email to invite"><button id="send">Invite</button>
 
// <h2>Result</h2>
// <pre id="out"></pre>
 
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
// <script>
//     const db = supabase.createClient(
//         'https://ctfmdagftjbjmrxcvifw.supabase.co',
//         'sb_publishable_vlMtSjFVVXrntElJYlrUzA_wPpJ1_TO'
//     );
//     const $ = id => document.getElementById(id);
//     const show = x => $('out').textContent = JSON.stringify(x, null, 2);
 
//     $('search').onclick = async () => {
//         let query = db.from('products').select('id, title, price');
//         for (const word of $('q').value.trim().split(/\s+/)) {
//             query = query.ilike('raw_title', `%${word}%`);
//         }
//         const { data, error } = await query.limit(10);
//         show(error || data);
//     };
 
//     $('login').onclick = async () => {
//         const { data, error } = await db.auth.signInWithPassword({
//             email: $('email').value, password: $('pass').value
//         });
//         show(error ? error.message : { loggedInAs: data.user.email });
//     };
 
//     $('send').onclick = async () => {
//         const { data, error } = await db.functions.invoke('invite-staff', {
//             body: { email: $('invite').value }
//         });
//         show(error && error.context ? await error.context.json() : error || data);
//     };
// </script>
 
 
// <!doctype html>
// <meta charset="utf-8">
// <title>Set your password</title>
// <h2>Set your password</h2>
// <input id="pass" type="password" placeholder="New password (8+ characters)">
// <button id="save">Save password</button>
// <p id="msg"></p>
 
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
// <script>
// const db = supabase.createClient(
//   'https://ctfmdagftjbjmrxcvifw.supabase.co',
//   'sb_publishable_vlMtSjFVVXrntElJYlrUzA_wPpJ1_TO'
// );
// const msg = document.getElementById('msg');
 
// document.getElementById('save').onclick = async () => {
//   const password = document.getElementById('pass').value;
//   if (password.length < 8) { msg.textContent = 'Use at least 8 characters.'; return; }
 
//   const { data: { session } } = await db.auth.getSession();
//   if (!session) { msg.textContent = 'This link has expired. Ask for a new one.'; return; }
 
//   const { error } = await db.auth.updateUser({ password });
//   msg.textContent = error ? error.message : 'Password saved. You can now log in.';
// };
// </script>
 