//import supabase client
import { supabase } from "./supabaseClient";    

//global variables
const form = document.getElementById('form');
const email = document.getElementById('email').value.trim().toLowerCase();
const password = document.getElementById('password').value;
const submit = document.getElementById('submit');

//create element for login feedback
const message = document.createElement('p');
message.id = "login-message";
message.setAttribute("role","alert");
form.insertBefore('message', 'submit');

//function to display login messages
function displayMessage(){
    message.textContent = text;
    message.className = type;
    message.style.display = text ? "block" : "none" ;
}

// const staffDashboard = './staffDashboard.html';
// const ownerDashboard = './ownerDashboard.html';

// checkSession -- function
async function checkSession(){

    const {error, data: {session}} = await supabase.auth.getSession();   //retrieve current session

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

    if(!email || !password){
        displayMessage("Please, enter both email and password. Thanks", "error");
        console.error('Please, enter valid email and password', error);
        return;
    }
    
    try{
        //submit button disabled during processing
        submit.disabled = true;
        displayMessage("", "");

        const{error, data} = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if(error){
            console.error("Login failed: ", error.message);
            return;
        }

        const user = data.user;

        //check user authorization
        const {data: store, error: storeError} = await supabase
        .from("staff")
        .select("id, role")  // is_active
        .eq("id", user.id)
        .single();

        // to check database error
        if(storeError){
            throw storeError;
        }

        //to check wheather user exist in the staff table.
        if(!store){
            await supabase.auth.signOut();
            displayMessage("Access denied, your account is not registered.", "error");
            console.log("access denied");
            return;
        }

        //check user role
        if(store.role === "owner"){
            displayMessage('Welcome back, Owner','success');
            console.log('owner logged in');
            // window.location.replace.ownerDashboard();
            return;
        }

        else if(store.role === "staff"){
            displayMessage('Login successful, welcome', 'success');
            console.log('staff logged in');
            // window.location.replace.staffDashboard();
            return;
        }

        else{
            await supabase.auth.signOut();
            displayMessage('Access denied, Invalid account permission', 'error');
            console.log("invalid account permission.");
        }

    }catch(error){

        console.error("Login error: ", error);
        displayMessage("Unable to login, Please check your credentials or try again.", "error");

    }finally{

        submit.disabled = false;

    }
});

// authentication event listners
supabase.auth.onAuthStateChange((event, session) => {
    // console.log("Authenticaton event", event);
    console.log("Current session", session);
});