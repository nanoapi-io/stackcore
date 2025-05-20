import { createContext, useContext, useState } from "react";

type CoreApiContextType = {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
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
    globalThis.location.href = "/login";
  }

  function login(token: string) {
    localStorage.setItem("token", token);
    setToken(token);
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

  return (
    <CoreApiContext.Provider
      {...props}
      value={{ isAuthenticated: !!token, token, login, logout, handleRequest }}
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
