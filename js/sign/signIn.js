//import supabase client
import { supabase } from "../config/supabaseClient.js";    

//global variables
const form = document.getElementById('form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submit = document.getElementById('submit');

//create element for login feedback
const message = document.createElement('p');
message.id = "login-message";
message.setAttribute("role","alert");

// form.appendChild()
// form.insertBefore(message, submit);

if (submit && submit.parentNode) {
    submit.parentNode.insertBefore(message, submit);
} else if (form) {
    form.appendChild(message);
}

//function to display login messages
function displayMessage(text, type){
    message.textContent = text;
    message.className = type;
    message.style.display = text ? "block" : "none" ;
}

// checkSession -- function
 async function checkSession(){

    const {error, data: {session}} = await supabase.auth.getSession();   //retrieve current session

    if(error){
        console.error("Failed to retrieve authentication session: ", error);
        return;
    }

    if(session){
        console.log("Email: ", session.user.email)
    }else{
        console.log("User not logged in.");
    }
    
    console.log("Session checked !");
}

//initialized the checkSession function
checkSession();

// Track if invited staff member clicked the invite link in their email
// let isInviteSession =
//     window.location.hash.includes("type=invite") ||
//     window.location.hash.includes("type=recovery");

// supabase.auth.onAuthStateChange((event, session) => {
//     console.log("Authentication event:", event);
//     if (
//         event === "INVITE_ACCEPTED" ||
//         event === "PASSWORD_RECOVERY" ||
//         (isInviteSession && session?.user)
//     ) {
//         isInviteSession = true;
//         if (emailInput && session?.user?.email) {
//             emailInput.value = session.user.email;
//             emailInput.readOnly = true;
//         }
//         if (submit) {
//             submit.textContent = "Set password & Sign in";
//         }
//         displayMessage("Welcome! Enter a new password to activate your staff account.", "success");
//     }
// });

//handle signin form submission
form.addEventListener('submit', async (event) => {
    
    event.preventDefault();

    //retrieve email and password inputs
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;


    if(!email || !password){
        displayMessage("Please, enter both email and password. Thanks", "error");
        console.error('Invalid email and password', error);
        return;
    }
    
    try{
        //submit button disabled during processing
        submit.disabled = true;
        displayMessage("Signing in...", "loading");

        let user = null;

        const{error, data} = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if(error){
            console.error("Login failed: ", error.message);
            displayMessage(error.message, "error");
            return;
        }

        user = data.user;

        //check user role
        const {data: store, error: storeError} = await supabase
        .from("staff")
        .select("id, role")  // is_active
        .eq("id", user.id)
        .maybeSingle();

        // to check database error
        if(storeError){
            throw storeError;
        }

        //to check wheather user exist in the staff table.
        if(!store){
            await supabase.auth.signOut();
            displayMessage("Access denied, your account is not registered.", "error");
            console.error("User ID not found in public.staff table:", user.id, user.email);            
            return;
        }

        const role = store.role?.trim().toLowerCase();

        //check user role
        if(store.role === "owner"){
            displayMessage('Welcome back, Owner','success');
            console.log('owner logged in');
            window.location.replace("./team.html");
            return;
        }

        else if(store.role === "staff"){
            displayMessage('Login successful, welcome', 'success');
            console.log('staff logged in');
            window.location.replace("./team.html");
            return;
        }

        else{
            await supabase.auth.signOut();
            displayMessage('Access denied: Invalid account permission.', 'error');
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
    console.log("Authenticaton event", event);
    console.log("Current session", session);
});