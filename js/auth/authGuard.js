//import supabase client
import { supabase } from "../config/supabaseClient.js";

//check authentication
export async function checkUserAuthentication() {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        console.error("User not authenticated.", error);
        return null;
    }

    return user;
}

//checkUserRole
export async function checkUserRole(requiredRole) {
    //check authentication first
    const user = await checkUserAuthentication();

    if (!user) {
        console.log("Not an authenticated user.");
        return null;
    }

    const { data: member, error } = await supabase
        .from("staff")
        .select("role")
        .eq("id", user.id)
        .single();

    //check database error
    if (error || !member || !member.role) {
        console.error("Failed to retrieve role", error);
        return null;
    }

    const allowedRole = member.role.trim().toLowerCase();

    const actualRole = Array.isArray(requiredRole)
    ? requiredRole.map((r) => r.trim().toLowerCase())
    : [requiredRole.trim().toLowerCase()];

    if (!allowedRole.includes(actualRole)) {
        console.error(`Role mismtached: expected ${expectedRole.join(" ")}, recieved ${actualRole}`);
        return;
    }

    console.log("Role successfully verified:", actualRole);

    return user;
}

//signOut
export async function signOut() {
    const { error } = await supabase.auth.signOut();

    // const {data, error: errortwo} = await supabase.auth.getUser(); 

    // if (!data) {
    //     console.log("SIGNED OUT");
    // } else {
    //     console.log("NOT SIGNED OUT");
    // }

    if (error) {
        console.error("Sign out -- error ", error);
        throw error;
    }
    
    console.log("User successfully signed out.");
    return true;
}
