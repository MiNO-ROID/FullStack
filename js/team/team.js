//Import required modules
import { checkUserRole, signOut} from "../auth/authGuard.js";
import { getTeamMembers, inviteTeamMembers } from "../team/teamService.js";
import {
  displayTeamMembers,
  setInviteLoading,
  clearInviteForm,
  displayMessage,
} from "../team/teamUI.js";

// DOM elements
const inviteSection = document.querySelector(".invite-section");
const inviteForm = document.getElementById("invite-form");
const emailInput = document.getElementById("email");
const roleInput = document.getElementById("role");
const logOutBtn = document.getElementById("logOut-btn");

let currentUser = null;

//team-dashboard
async function initializeTeamDashboard() {
  try {
    //check - user is owner
    currentUser = await checkUserRole(["owner", "staff"]);

    //if user isn't owner
    if (!currentUser) {
      window.location.replace("./signIn.html");
      return;
    }

    console.log("Team page authenticated:", currentUser.email, "Role:", currentUser.role);

    //hide invite-form if the logged-in user is staff
    if(currentUser.role !== "owner" && inviteSection){
      inviteSection.style.display = "none";
    }

    await loadTeamMembers(currentUser.id);

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
inviteForm?.addEventListener("submit", async (event) => {
  //prevent from default form submission
  event.preventDefault();

  if(currentUser?.role !== "owner"){
    displayMessage("Only owner can invite staff members.");
    return;
  }

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
    displayMessage("Please, select a valid role", "error");
    return;
  }

  try {
    //show loading state
    setInviteLoading(true);

    displayMessage("Sending invitation...", "loading");

    //send invitation through teamService
    const result = await inviteTeamMembers(email, role);

    //display success message
    displayMessage("Invitation sent successfully.", "success");

    //clear invitation form - refresh
    clearInviteForm();

    // Load team members
    await loadTeamMembers(currentUser.id);

    console.log("Invitation response.", result);

  } catch (error) {
    console.error("Invitation failed:", error);
    displayMessage(error.message || "Failed to send invitation.", "error");
  } finally {
    //restore invitation button
    setInviteLoading(false);
  }
});

// Sign out
logOutBtn?.addEventListener("click", async (event) => {

  event.preventDefault();

  try{
    console.log("Signing out...");
    await signOut();
    //redirect to sign-in page after session is cleared.
    window.location.replace("./signIn.html");
  }catch(error){
    console.error("Failed to sign out: ", error);
    window.location.replace("./signIn.html")
  }
});

initializeTeamDashboard(); //initialize dashboard
