import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clear expired tokens on authentication errors
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('auth_token');
      // Refresh the page to reset the auth state
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { skipAuthRedirect?: boolean }
): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    cache: 'no-store',
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    // For login/auth endpoints, don't auto-redirect - let the component handle the error
    if (!options?.skipAuthRedirect && (res.status === 401 || res.status === 403)) {
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    const text = (await res.text()) || res.statusText;
    let errorData: any = { message: text };
    try {
      errorData = JSON.parse(text);
    } catch {
      // If not JSON, use text as-is in message
    }
    
    // Create custom error with additional data
    const error: any = new Error(errorData.message || text);
    error.violations = errorData.violations;
    error.code = errorData.code;
    error.statusCode = res.status;
    throw error;
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('auth_token');
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      cache: 'no-store',
      headers: {
        ...headers,
        'Cache-Control': 'no-cache',
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && (res.status === 401 || res.status === 403)) {
      // Clear invalid/expired token
      localStorage.removeItem('auth_token');
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
