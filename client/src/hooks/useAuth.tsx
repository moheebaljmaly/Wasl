
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@/types';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, username: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      apiClient.setToken(token);
      const { user: currentUser } = await apiClient.getCurrentUser();
      setUser(currentUser);
      setSession({
        access_token: token,
        user: currentUser
      });
      
      // حفظ بيانات الاعتماد إذا كان "تذكرني" مفعل
      if (localStorage.getItem('rememberMe') === 'true') {
        const credentials = {
          userId: currentUser.id,
          token,
          lastLogin: new Date().toISOString(),
          rememberMe: true
        };
        localStorage.setItem('authCredentials', JSON.stringify(credentials));
      }
    } catch (error) {
      // Token invalid, clear it
      apiClient.clearToken();
      localStorage.removeItem('authCredentials');
      localStorage.removeItem('rememberMe');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, rememberMe = false) => {
    setLoading(true);
    
    try {
      // حفظ حالة "تذكرني"
      localStorage.setItem('rememberMe', rememberMe.toString());
      
      const response = await apiClient.signIn(email, password);
      
      apiClient.setToken(response.token);
      setUser(response.user);
      setSession(response.session);
      
      if (rememberMe) {
        const credentials = {
          userId: response.user.id,
          token: response.token,
          lastLogin: new Date().toISOString(),
          rememberMe: true
        };
        localStorage.setItem('authCredentials', JSON.stringify(credentials));
      }
      
      setLoading(false);
      return { error: null };
    } catch (error: any) {
      setLoading(false);
      let errorMessage = 'فشل في تسجيل الدخول';
      
      if (error.message) {
        if (error.message.includes('Invalid email or password')) {
          errorMessage = 'بريد إلكتروني أو كلمة مرور خاطئة';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'المستخدم غير موجود - يرجى إنشاء حساب جديد';
        } else if (error.message.includes('connection')) {
          errorMessage = 'مشكلة في الاتصال - يرجى التحقق من الإنترنت';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'انتهت مهلة الطلب - يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = 'خطأ في قاعدة البيانات - يرجى المحاولة مرة أخرى';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "خطأ في تسجيل الدخول",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const signUp = async (email: string, username: string, password: string, fullName: string) => {
    setLoading(true);
    
    try {
      const response = await apiClient.signUp(email, username, password, fullName);
      
      apiClient.setToken(response.token);
      setUser(response.user);
      setSession(response.session);
      
      setLoading(false);
      toast({
        title: "تم التسجيل بنجاح",
        description: "مرحباً بك! تم إنشاء حسابك بنجاح",
      });
      return { error: null };
    } catch (error: any) {
      setLoading(false);
      let errorMessage = 'فشل في إنشاء الحساب';
      
      if (error.message) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          if (error.message.includes('email')) {
            errorMessage = 'هذا البريد الإلكتروني مستخدم بالفعل';
          } else if (error.message.includes('username')) {
            errorMessage = 'اسم المستخدم مستخدم بالفعل';
          } else {
            errorMessage = 'البيانات مستخدمة بالفعل';
          }
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = 'خطأ في قاعدة البيانات - يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('connection')) {
          errorMessage = 'مشكلة في الاتصال - يرجى التحقق من الإنترنت';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'انتهت مهلة الطلب - يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('password')) {
          errorMessage = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف';
        } else if (error.message.includes('email')) {
          errorMessage = 'يرجى إدخال بريد إلكتروني صحيح';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "خطأ في التسجيل",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.signOut();
    } catch (error) {
      // Continue with sign out even if API call fails
    }
    
    // مسح بيانات الاعتماد المحفوظة
    apiClient.clearToken();
    localStorage.removeItem('authCredentials');
    localStorage.removeItem('rememberMe');
    
    setUser(null);
    setSession(null);
    
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك لاحقاً!",
    });
  };

  const refreshUser = async () => {
    try {
      const { user: currentUser } = await apiClient.getCurrentUser();
      setUser(currentUser);
      if (session) {
        setSession({
          ...session,
          user: currentUser
        });
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
