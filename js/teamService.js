//import supabase client
import {supabase} from "./supabaseClient.js";

//get team members -- 
export async function getTeamMembers(){

    const{data, error} = await supabase
    .from("staff")
    .select("id, email, role")
    .order("created_at", {
        ascending: true
    });

    if(error){
        throw error;
        // console.log("Failed to retrive data from staff table: ", error);
    }

    return data;
}

// get user roles --
export async function getMemberRole(userID){

    const {data, error} = await supabase
    .from("staff")
    .select("role")
    .eq("id", userID)
    .single();

    if(error){
        throw error;
        // console.log("Failed to retrive role: ", error);
    }

    return data.role;

}

// invite team members
export async function inviteTeamMembers(email, role){

    const {error, data} = await supabase.functions.invoke(
        "invite-message",{
            body: {
                email: email,
                role: role
            }
        });

    if(error){
        throw error;
    }

    if(error?.data){
        throw new Error(data.error);
    }

    return data;
}