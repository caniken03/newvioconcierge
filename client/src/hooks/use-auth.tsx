import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'client_admin' | 'client_user';
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    companyName: string;
  };
}

interface LoginCredentials {
  email: string;
  password: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Get current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return response.json();
    },
    onSuccess: async (data) => {
      // Store token FIRST (atomic operation)
      localStorage.setItem('auth_token', data.token);
      
      // Clear ALL cached data completely and wait for it to finish
      await queryClient.clear();
      
      // Force remove any potential stale query data
      queryClient.removeQueries();
      
      // Set fresh auth state after cache is completely clean
      queryClient.setQueryData(['/api/auth/me'], data.user);
      
      // Small delay to ensure cache operations complete before navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Navigate to home page AFTER clean state is established
      navigate('/', { replace: true });
      
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    queryClient.setQueryData(['/api/auth/me'], null);
    queryClient.clear();
    
    // Navigate to login page for consistent UX
    navigate('/');
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return {
    user: user as User | null,
    isLoading,
    error,
    login: loginMutation.mutate,
    loginLoading: loginMutation.isPending,
    logout,
    isAuthenticated: !!user,
  };
}
