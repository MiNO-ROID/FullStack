//import supabase client
import { supabase } from "./supabaseClient.js";

//get team members --
export async function getTeamMembers() {
    const { data, error } = await supabase
        .from("staff")
        .select("id, email, role")
        .order("created_at", {
            ascending: true,
        });

    if (error) {
        console.log("Failed to retrive data from staff table: ", error);
        throw error;
    }

    return data;
}

// get user roles --
export async function getMemberRole(userID) {
    const { data, error } = await supabase
        .from("staff")
        .select("role")
        .eq("id", userID)
        .single();

    if (error) {
        console.log("Failed to retrive role: ", error);
        throw error;
    }

    return data.role;
}

// invite team members
export async function inviteTeamMembers(email, role) {
    const { error, data } = await supabase.functions.invoke("invite-staff", {
        body: {
            email: email,
            role: role,
        },
    });

    if (error) {
        let errorMessage = error.errorMessage;
        if (error.context) {
            try {
                const response = await error.context.json();
                errorMessage = response.error || errorMessage;
            } catch (parseError) {
                console.error("Could not read error response: ", parseError);
            }
        }

        throw new Error(errorMessage);
    }
    return data;
}
