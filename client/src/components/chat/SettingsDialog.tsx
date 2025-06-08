import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Bell, Moon, LogOut, Camera, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { AvatarEditor } from './AvatarEditor';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, signOut, refreshUser } = useAuth();

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "يرجى اختيار صورة أصغر من 5 ميجابايت",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAvatarUrl(result);
      setUploading(false);
      toast({
        title: "تم رفع الصورة",
        description: "لا تنس حفظ التغييرات",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = (imageData: string) => {
    setAvatarUrl(imageData);
    toast({
      title: "تم تحديث الصورة الشخصية",
      description: "لا تنس حفظ التغييرات",
    });
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await apiClient.updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl
      });
      
      await refreshUser();
      
      toast({
        title: "تم تحديث الملف الشخصي",
        description: "تم حفظ التغييرات بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    onOpenChange(false);
    await signOut();
  };

  const getUserInitials = (name?: string | null, username?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              الإعدادات
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="الصورة الشخصية" />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {getUserInitials(user?.full_name, user?.username)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Upload className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-gray-500">اسم المستخدم</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="text-right"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    الإشعارات
                  </p>
                  <p className="text-xs text-gray-500">تلقي إشعارات الرسائل الجديدة</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    الوضع المظلم
                  </p>
                  <p className="text-xs text-gray-500">تشغيل الثيم المظلم</p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AvatarEditor
        open={showAvatarEditor}
        onOpenChange={setShowAvatarEditor}
        onSave={handleAvatarSave}
        currentAvatar={avatarUrl}
      />
    </>
  );
}