import { supabase } from "./supabaseClient";    

//global variables
const form = document.getElementById('form');
const email = document.getElementById('email').value.trim();
const password = document.getElementById('password').value;
const submit = document.getElementById('submit');
const message = document.querySelector('.hint');

// const staffDashboardUrl = './staffDashboard.html';
// const ownerDashboardUrl = './ownerDashboard.html';

// checkSession -- function
async function checkSession(){
    const {error, data: {session}} = await supabase.auth.getSession();

    if(error){
        console.error("Failed to retrieve authentication session: ", error);
        return;
    }

    // const session = data.session;

    if(session){
        console.log("Email: ", session.user.email)
        // window.location.href = "./dashboard.html";
        // window.location.replace(staffDashboard.html);
    }else{
        console.log("User not logged in.");
    }
    
    console.log("Session checked !");
}

//initialized the checkSession function
checkSession();

//handle signin form submission
form.addEventListener('submit', async (event) => {
    
    event.preventDefault();
    
    try{
        //submit button disabled during processing
        submit.disabled = true;

        const{error, data} = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if(error){
            console.error("Login failed: ", error.message);
            return;
        }

        const user = data.user;


    }catch{

    }finally{

    }
});