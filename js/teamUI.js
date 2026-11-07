//display message
export function displayMessage(message, type){
    const messageElement = document.getElementById("invite-message");
    if(!messageElement) return;
    messageElement.textContent = message;
    messageElement.className = `invite-message ${type}`;
    messageElement.style.display = "block";
}

//display team members -- function
export  function displayTeamMembers(members, currentUserId) {
    const teamMemberList = document.getElementById("team-member-list");

    //clear existing content
    teamMemberList.innerHTML = " ";

    //check whether member exist
    if(!members || members.length === 0){
        teamMemberList.textContent = "No team member found";
        return;
    }

    //create a document fragment 
    const fragment = document.createDocumentFragment(); 

    //loop through all team members
    members.forEach(member => {

        //main container
        const memberElement = document.createElement("div");
        memberElement.className = "member";

        //avatar
        const avatar = document.createElement("div");
        avatar.className = ("member-avatar");
        avatar.textContent = member.email.charAt(0).toUpperCase();

        //member-info
        const memberInfo = document.createElement("div");
        memberInfo.className = "member-info";

        const memberEmail = document.createElement("p");
        memberEmail.className = "member-email";
        memberEmail.textContent = member.email;

        const memberStatus = document.createElement("span");
        memberStatus.className = "member-status";
        memberStatus.textContent = currentUserId === member.id ? "Signed in now" : "Team member";

        memberInfo.append(memberEmail, memberStatus);

        //role-badge
        const roleBadge = document.createElement("span");
        roleBadge.className = "role-badge";
        roleBadge.textContent = member.role.charAt(0).toUpperCase() + member.role.slice(1);

        //combine all elements in container
        memberElement.append(avatar, memberInfo, roleBadge);

        // add to fragment
        fragment.appendChild(memberElement);

    });

    //display all members
    teamMemberList.appendChild("team-member-list");

}

//inivitation button -- loading state
export function setInviteLoading(isLoading){
    const inviteButton = document.querySelector("invite-button");
    inviteButton.disabled = isLoading;
    inviteButton.textContent = isLoading ? "Sending inivation" : "Send invite";
}

//clear invite form
export function clearInviteForm(){
    const inviteForm = document.getElementById("invite-form");
    inviteForm.reset();
}