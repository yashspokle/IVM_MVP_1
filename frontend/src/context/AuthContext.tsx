import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "../services/api";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("grocero_user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    const response = await api.post(
      "/auth/login",
      {
        email,
        password,
      }
    );

    const { token, user } = response.data;

    localStorage.setItem(
      "grocero_token",
      token
    );

    localStorage.setItem(
      "grocero_user",
      JSON.stringify(user)
    );

    setUser(user);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

  const signUp = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    await api.post(
      "/auth/register",
      {
        name: email.split("@")[0],
        email,
        password,
      }
    );

    return await signIn(
      email,
      password
    );
  } catch (error) {
    console.error(error);
    return false;
  }
};

  const signOut = () => {
    localStorage.removeItem("grocero_user");
    localStorage.removeItem("grocero_inventory");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext must be used inside AuthProvider"
    );
  }

  return context;
}