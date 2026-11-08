//import supabase client
import{supabase} from "./supabaseClient.js";

//check authentication
export async function checkUserAuthentication(){

    const{data:{user}, error} = await supabase.auth.getUser();

    if(error || !user){
        console.error("User not authenticated.", error);
        return null;
    }

    return user;

}

//checkUserRole
export async function checkUserRole(requiredRole){

    //check authentication first
    const user = await checkUserAuthentication();

    if(!user){
        console.log("No auathenticated user found.");
        return null;
    }

    const{data: member, error} = await supabase
    .from ('staff')
    .select('role')
    .eq('id', user.id)
    .single();

    //check database error
    if(error || !member){
        console.error('Failed to retrieve role', error);
        return null;
    }

    const actualRole = member.role?.trim().toLowerCase();
    const expectedRole = requiredRole.trim().toLowerCase();

    if(actualRole != expectedRole){
        console.error(`Role mismtached: expected ${expectedRole}, recieved ${actualRole}`);
        return;
    }

    console.log("Role successfully verified:", actualRole);

    return user;
     
}

//signOut
export async function signOut() {
    const {error} = await supabase.auth.signOut();

    if(error){
        console.error("Sign out -- error ", error);
        throw error;
    }
    return true;
}
