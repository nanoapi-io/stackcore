import { createContext, useContext, useEffect, useState } from "react";
import { Loader, RefreshCw } from "lucide-react";
import { Button } from "../components/shadcn/Button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/shadcn/Card.tsx";

type CoreApiContextType = {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  getUserFromToken: () => { userId: number; email: string } | null;
  handleRequest: (
    url: string,
    method: string,
    body?: object,
    headers?: Record<string, string>,
  ) => Promise<Response>;
};

const initialState: CoreApiContextType = {
  isAuthenticated: false,
  token: null,
  login: () => {},
  logout: () => {},
  getUserFromToken: () => null,
  handleRequest: () => Promise.resolve({} as Response),
};

const CoreApiContext = createContext<CoreApiContextType>(initialState);

export function CoreApiProvider(
  { children, ...props }: { children: React.ReactNode },
) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  );

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    // redirect to login page
    const newSearchParams = new URLSearchParams(globalThis.location.search);
    newSearchParams.set("from", globalThis.location.pathname);
    globalThis.location.href = `/login?${newSearchParams.toString()}`;
  }

  function login(token: string) {
    localStorage.setItem("token", token);
    setToken(token);
  }

  function getUserFromToken() {
    if (!token) return null;

    try {
      // JWT tokens are base64 encoded with 3 parts separated by dots
      const [, payloadBase64] = token.split(".");
      // Decode the base64 payload
      const payload = JSON.parse(atob(payloadBase64));

      return {
        userId: Number(payload.userId), // subject claim contains user ID
        email: payload.email,
      };
    } catch (error) {
      console.error("Error decoding JWT token:", error);
      return null;
    }
  }

  async function handleRequest<T>(
    url: string,
    method: string,
    body?: object,
    headers: Record<string, string> = {
      "Content-Type": "application/json",
    },
  ) {
    const baseURL: string = import.meta.env.VITE_API_URL ||
      "http://localhost:4000";

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (url.startsWith("/")) {
      url = `${baseURL}${url}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      logout();
      throw new Error("Unauthorized");
    }

    return response;
  }

  const [ready, setReady] = useState(false);
  const [readyError, setReadyError] = useState<string | null>(null);

  async function checkAPIReady() {
    try {
      const response = await handleRequest("/health/liveness", "GET");
      if (response.status !== 200) {
        throw new Error("API is not ready");
      }
      setReady(true);
    } catch (error) {
      console.error("Error checking API readiness:", error);
      setReadyError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  useEffect(() => {
    checkAPIReady();
  }, []);

  if (readyError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">
              Something went wrong
            </CardTitle>
            <CardDescription>
              An unexpected error occurred while connecting to the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => globalThis.location.reload()}
              className="w-full"
            >
              <RefreshCw className="size-4" />
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ready === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Connecting to server</CardTitle>
            <CardDescription>
              Please wait while we establish a connection...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader className="size-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              This may take a few moments
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CoreApiContext.Provider
      {...props}
      value={{
        isAuthenticated: !!token,
        token,
        login,
        logout,
        getUserFromToken,
        handleRequest,
      }}
    >
      {children}
    </CoreApiContext.Provider>
  );
}

export const useCoreApi = () => {
  const context = useContext(CoreApiContext);

  if (!context) {
    throw new Error("useCoreApi must be used within CoreApiProvider");
  }

  return context;
};
