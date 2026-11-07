//import supabase client
import { supabase } from "./supabaseClient.js";    

 

// console.log("++++ ", supabase);

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
form.insertBefore(message, submit);

//function to display login messages
function displayMessage(text, type){
    message.textContent = text;
    message.className = type;
    message.style.display = text ? "block" : "none" ;
}

// const staffDashboard = './staffDashboard.html';
// const ownerDashboard = './ownerDashboard.html';


//handle signin form submission
form.addEventListener('submit', async (event) => {
    
    event.preventDefault();

    //retrieve email and password inputs
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;


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
        .maybeSingle();

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
    console.log("Authenticaton event", event);
    console.log("Current session", session);
});