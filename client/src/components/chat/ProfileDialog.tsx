import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageCircle, User } from "lucide-react";
import { Profile } from "@/types";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
}

export function ProfileDialog({ open, onOpenChange, profile }: ProfileDialogProps) {
  if (!profile) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">الملف الشخصي</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* صورة المستخدم */}
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {profile.full_name?.charAt(0) || profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* معلومات المستخدم */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">
              {profile.full_name || profile.username}
            </h3>
            
            {profile.full_name && (
              <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span className="text-sm">@{profile.username}</span>
              </div>
            )}
          </div>

          {/* شارات المعلومات */}
          <div className="flex flex-col space-y-3 w-full">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">البريد الإلكتروني</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">تاريخ الانضمام</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* حالة النشاط */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <Badge variant="secondary" className="text-xs">
              متصل الآن
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}