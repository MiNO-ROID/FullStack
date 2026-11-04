//import supabase client
import{supabase} from ("./js/supabaseClient.js");

//check authentication
export async function checkAuthentication(){

    const{data, error} = await supabase.auth.getUser();

    if(error || !user.data){
        console.error("User not authenticated.", error);
        window.location.href="./signIn.html";
        return null;
    }

    return user.data;

}

//checkUserRole
export async function checkUserRole(requiredRole){
    const user = await checkAuthentication();

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
        window.location.href="./signIn.html";
        return null;
    }

    if(member !== requiredRole){
        console.log("Role not matched");
        window.location.href="./signIn.html";
        return null;
    }

    return user;
     
}