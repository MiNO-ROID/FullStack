// global variables -- includes url and publishable key--to connect with supabase
const db = supabase.createClient(
    'https://ctfmdagftjbjmrxcvifw.supabase.co',
    'sb_publishable_vlMtSjFVVXrntElJYlrUzA_wPpJ1_TO'
);

//global variables
const form = document.getElementById('form');
const email = document.getElementById('email').value.trim();
const password = document.getElementById('password').value;
const submit = document.getElementById('submit');

// checkSession -- function
async function checkSession(){
    const {error, data} = await db.auth.getSession();

    if(error){
        console.error("Failed to retrieve authentication session: ", error);
        return;
    }

    const session = data.session;

    if(session){
        console.log("User logged in.");
        console.log("Email: ", session.user.email)
    }else{
        console.log("User not logged in.");
    }
    
    console.log("Session checked !");
}

//initialized the checkSession function
checkSession();

async function handleSignIn(){
    try{
        //submit button disabled during processing
        submit.disabled = true;

        const{error, data} = await db.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if(error){
            console.error("Login failed: ", error.message);
            return;
        }

    }catch{

    }finally{

    }
} 