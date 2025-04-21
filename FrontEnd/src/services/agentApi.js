import { getClientId } from '../utils/clientId'; // Correct relative path from services/ to utils/
import { getDynamicServiceUrl } from '../urlHelpers'; // Import the helper function

// Use the dynamic URL helper, consistent with api.js
const API_BASE_URL = getDynamicServiceUrl('api');

/**
 * Sends a user message to the agentic backend endpoint and retrieves the AI response
 * and updated conversation context.
 * 
 * @param {string} userMessage - The message content from the user.
 * @param {object | null} user - The user object from AuthContext (contains user.id if logged in).
 * @param {boolean} isGuest - Flag indicating if the user is operating as a guest.
 * @param {string | null} currentAgentContext - The current agent conversation context (serialized JSON string or null).
 * @returns {Promise<{ai_response: string, updated_agent_context: string}>} - A promise resolving to the AI response and updated context.
 */
export async function sendAgentChatMessage(userMessage, user, isGuest, currentAgentContext) {
    console.log('🚀 Calling sendAgentChatMessage');
    const clientId = getClientId();
    const headers = {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId,
        // Add User-ID and Is-Guest headers conditionally based on auth state
    };

    if (user && user.id) {
        headers['X-User-ID'] = user.id;
        // Ensure isGuest is explicitly passed as a string 'true' or 'false'
        headers['X-Is-Guest'] = String(!!isGuest);
        console.log(`   Headers: UserID=${user.id}, ClientID=${clientId}, IsGuest=${headers['X-Is-Guest']}`);
    } else {
        // Handle case where user might be guest but not logged in (or user object missing id)
        headers['X-Is-Guest'] = 'true';
        console.log(`   Headers: ClientID=${clientId}, IsGuest=true (No User ID)`);
    }


    const body = JSON.stringify({
        user_message: userMessage,
        // Pass the received context, defaulting to null if it's empty/falsy
        agent_context: currentAgentContext || null
    });

    console.log(`   Sending to: ${API_BASE_URL}/agentic/agentchat`);
    // console.log(`   Body: ${body}`); // Be careful logging context in production

    try {
        const response = await fetch(`${API_BASE_URL}/agentic/agentchat`, {
            method: 'POST',
            headers,
            body,
            // credentials: 'include' // Keep if cookies are needed for other parts, maybe not for this endpoint? Check backend CORS. Let's include for now.
        });

        console.log(`   Agent API Response Status: ${response.status}`);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('   Agent API Error Response:', errorBody);
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        console.log('   Agent API Response Data:', data);
        return data; // Should contain { ai_response, updated_agent_context }

    } catch (error) {
        console.error('❌ Error calling sendAgentChatMessage:', error);
        // Re-throw the error so the calling component can handle it (e.g., display error message)
        throw error;
    }
}

// Potential future functions related to agentic interactions can be added here. 