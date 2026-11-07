//Import required modules
import { supabase } from "./supabaseClient.js";
import { checkUserRole, signOut } from "./authGuard.js";
import { getTeamMembers, inviteTeamMembers } from "./teamService.js";
import {
  displayTeamMembers,
  setInviteLoading,
  clearInviteForm,
  displayMessage,
} from "./teamUI.js";

// DOM elements
const inviteForm = document.querySelector("invite-form");
const emailInput = document.getElementById("email");
const roleInput = document.getElementById("role");
// const button = document.querySelector("invite-button");
// const message = document.getElementById("invite-message");

//team-dashboard
async function initializeTeamDashboard() {
  try {
    //check - user is owner
    const user = await checkUserRole();

    //if user isn't owner
    if (!user) {
      // window.location.replace("./signIn.html");
      return;
    }

    console.log("Owner authenticated.", user.email);

    await loadTeamMembers(user.id);

  } catch (error) {
    console.error("Dashboard initialization failed: ", error);
    // window.location.replace("./signIn.html");
  }
}

//display team members -- function
async function loadTeamMembers(currentUserId) {
  try {
    //get team members from teamService
    const members = await getTeamMembers();

    //display team members from teamUI
    displayTeamMembers(members, currentUserId);

    console.log("team members loaded successfully.");
  } catch (error) {
    console.error("Failed to load team members: ", error);
    displayMessage("Unable to load team members.", "error");
  }
}

// validate email
async function validateEmail() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

//send invitation
inviteForm.addEventListener("submit", async (event) => {
  //prevent from default form submission
  event.preventDefault();

  //get form values
  const email = emailInput.value.trim().toLowerCase();
  const role = roleInput.value;

  // check email validation
  if (!validateEmail(email)) {
    displayMessage("Invalid Email addreess.", "error");
    console.log("Invalid Email addreess.");
    return;
  }

  //check validate roles
  if (!["staff", "owner"].includes(role)) {
    console.log("Invalid role selected.");
    displayMessage("Please, select role valid role", "error");
    return;
  }

  try {
    //show loading state
    setInviteLoading(true);

    displayMessage("Sending invitation ...", "loading");

    //send invitation through teamService
    const result = await inviteTeamMembers(email, role);

    //display success message
    displayMessage("Invitation sent successfully.", "success");

    //clear invitation form - refresh
    clearInviteForm();

    console.log("Invitation response.", result);
  } catch (error) {
    console.error("Invitation failed:", error);
    displayMessage(error.message || "Failed to send invitation.", "error");
  } finally {
    //restore invitation button
    setInviteLoading(false);
  }
});

// //sign-out 
// async function handleSignOut(){
//     try{
//         await signOut();
//         window.location.replace("./signIn.html");
//     }catch(error){
//         console.error("Sign-out failed: ", error);
//     }
// }

// //eventlistners
// signOutBtn.addEventListener("click", handleSignOut);

initializeTeamDashboard(); //initialize dashboard
