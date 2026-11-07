//import supabase client
import{supabase} from ("./js/supabaseClient.js");

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
        return null;
    }

    const{data: member, error} = await supabase
    .from ('staff')
    .select('role')
    .eq('id', user.id)
    .single();

    //check database error
    if(error || !member){
        console.error('User not authenticated', error);
        return null;
    }

    //check member role
    if(member.role !== requiredRole){
        console.log("Role not matched");
        return null;
    }

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
