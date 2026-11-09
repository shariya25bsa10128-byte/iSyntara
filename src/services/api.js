
export const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("isyntara_token");

    // FormData must not receive an application/json Content-Type.
    // The browser automatically sets the multipart boundary.
    const isFormData =
        typeof FormData !== "undefined" &&
        options.body instanceof FormData;

    const headers = {
        ...(options.body !== undefined && !isFormData
            ? { "Content-Type": "application/json" }
            : {}),

        ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),

        ...options.headers,
    };

    const normalizedEndpoint = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;

    const response = await fetch(
        `${API_URL}${normalizedEndpoint}`,
        {
            ...options,
            headers,
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data.message || "Something went wrong."
        );

        error.status = response.status;

        throw error;
    }

    return data;
}
