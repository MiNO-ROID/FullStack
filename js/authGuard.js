//import supabase client
import{supabase} from ("./js/supabaseClient.js");

//check authentication
export async function checkUserAuthentication(){

    const{data, error} = await supabase.auth.getUser();

    if(error || !user.data){
        console.error("User not authenticated.", error);
        // window.location.href="./signIn.html";
        return null;
    }

    return user.data;

}

//checkUserRole
export async function checkUserRole(requiredRole){
    const user = await checkUserAuthentication();

    if(!user){
        return null;
    }

    const{data: member, error} = await supabase
    .from ('staff')
    // .select('id', 'role')
    .select('role')
    .eq('id', user.id)
    .single();

    if(error || !member){
        await supabase.auth.signOut();
        console.error('User not authenticated', error);
        // window.location.href="./signIn.html";
        return null;
    }

    if(member !== requiredRole){
        console.log("Role not matched");
        // window.location.href="./signIn.html";
        return null;
    }

    return user;
     
}

// checkSession -- function
export async function checkSession(){

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

export async function signOut() {
    const {error} = await supabase.auth.signOut();

    if(error){
        throw error;
        console.error("Sign out -- error ", error);
    }
    return true;
}

// authentication event listners
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Authenticaton event", event);
    console.log("Current session", session);
})