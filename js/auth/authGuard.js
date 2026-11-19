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
export async function checkUserRole(requiredRoles) {
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
        .maybeSingle();

    // 2. Fallback: check by email if ID didn't match
    if (!member && user.email) {
        const { data: memberByEmail } = await supabase
        .from("staff")
        .select("id, email, role")
        .ilike("email", user.email.trim())
        .maybeSingle();
        
        if (memberByEmail) {
            member = memberByEmail;
        }
    }

    //check database error
    if (error || !member || !member.role) {
        console.error("Failed to retrieve role", error);
        return null;
    }

    const actualRole = String(member.role).trim().toLowerCase();

    // Always convert requiredRoles into an array so .includes() and .join() never crash
    const allowedRoles = (Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles])
    .map((role) => String(role).trim().toLowerCase());

    if (!allowedRoles.includes(actualRole)) {
        console.error(`Role mismatched: expected ${allowedRoles.join(" or ")}, recieved ${actualRole}`);
        return null;
    }

    console.log("Role successfully verified:", actualRole);
    user.role = actualRole;
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
