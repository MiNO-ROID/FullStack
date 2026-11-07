//Import supabse client
import{supabase} from "./supabaseClient.js";

// DOM elements
const inviteForm = document.getElementById("invite-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const role = document.getElementById("role");
const button = document.getElementById("submit");
const message = document.getElementById("invite-message");

//display message
function displayMessage(message, type){
    message.textContent = message;
    message.className = `invite-message ${type}`;
}

//display team members -- function
async function loadTeamMembers() {
    
}