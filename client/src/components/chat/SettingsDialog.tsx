
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Bell, Moon, LogOut, Camera } from 'lucide-react';
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
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const { user, signOut, refreshUser } = useAuth();

  // Update fullName and avatarUrl when user data changes
  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user]);

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
      const updates: any = {};
      if (fullName.trim() !== user.full_name) {
        updates.full_name = fullName.trim();
      }
      if (avatarUrl !== user.avatar_url) {
        updates.avatar_url = avatarUrl;
      }

      if (Object.keys(updates).length > 0) {
        const updatedUser = await apiClient.updateProfile(updates);
        
        toast({
          title: "تم تحديث الملف الشخصي",
          description: "تم حفظ التغييرات بنجاح",
        });
        
        // إعادة تحميل الصفحة لضمان ظهور التحديثات للجميع
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({
          title: "لا توجد تغييرات",
          description: "لم يتم إجراء أي تعديلات",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "خطأ في التحديث",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 space-x-reverse">
            <Settings className="h-5 w-5" />
            <span>الإعدادات</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* قسم الحساب */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <User className="h-4 w-4" />
              <h3 className="font-medium">الحساب</h3>
            </div>

            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl || (user?.avatar_url ?? undefined)} />
                  <AvatarFallback>
                    {user?.username?.[0]?.toUpperCase() || user?.email?.split('@')[0][0]?.toUpperCase() || '؟'}
                  </AvatarFallback>
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
              
              <Button 
                onClick={handleUpdateProfile} 
                disabled={loading || (fullName.trim() === (user?.full_name || '') && avatarUrl === (user?.avatar_url || ''))}
                className="w-full"
              >
                {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* قسم التفضيلات */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Bell className="h-4 w-4" />
              <h3 className="font-medium">التفضيلات</h3>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">الإشعارات</Label>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Moon className="h-4 w-4" />
                <Label htmlFor="darkMode">الوضع الليلي</Label>
              </div>
              <Switch
                id="darkMode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </div>

          <Separator />

          {/* تسجيل الخروج */}
          <Button 
            variant="destructive" 
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
