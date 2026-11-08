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
const inviteForm = document.getElementById("invite-form");
const emailInput = document.getElementById("email");
const roleInput = document.getElementById("role");
const button = document.querySelector(".invite-button");
// const message = document.getElementById("invite-message");

//team-dashboard
async function initializeTeamDashboard() {
  try {
    //check - user is owner
    const user = await checkUserRole("owner");

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

// Email validation function
function validateEmail(email) {
  // Ensure the received value is a string
  if (typeof email !== "string") {
    console.error("Expected email to be a string:", email);
    return false;
  }

  // Remove unnecessary spaces
  email = email.trim().toLowerCase();

  // Email validation pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(email);
}

//send invitation
inviteForm.addEventListener("submit", async (event) => {
  //prevent from default form submission
  event.preventDefault();

  //get form values
  const email = String(emailInput.value || "").trim().toLowerCase();
  const role = roleInput.value;

  // check email validation
  if (!validateEmail(email)) {
    displayMessage("Invalid Email address.", "error");
    console.log("Invalid Email address.");
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

initializeTeamDashboard(); //initialize dashboard
