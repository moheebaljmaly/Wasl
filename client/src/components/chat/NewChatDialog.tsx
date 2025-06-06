
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Profile, Conversation } from '@/types';
import { toast } from '@/hooks/use-toast';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export function NewChatDialog({ open, onOpenChange, onConversationCreated }: NewChatDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm) {
      searchUsers();
    } else {
      fetchUsers();
    }
  }, [searchTerm]);

  const fetchUsers = async () => {
    if (!user) return;

    try {
      setSearchLoading(true);
      // For now, we'll skip loading all users and only show search functionality
      setUsers([]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "خطأ في جلب المستخدمين",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!user || !searchTerm.trim()) return;

    try {
      setSearchLoading(true);
      
      // Try searching by username first
      try {
        const profile = await apiClient.searchProfile(searchTerm);
        setUsers([profile as Profile]);
        return;
      } catch (usernameError) {
        // If username search fails, try email search if it looks like an email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(searchTerm)) {
          try {
            const response = await fetch(`/api/profiles/search-by-email?email=${encodeURIComponent(searchTerm)}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : ''}`,
              }
            });
            if (response.ok) {
              const profile = await response.json();
              setUsers([profile as Profile]);
              return;
            }
          } catch (emailError) {
            console.error('Email search error:', emailError);
          }
        }
        
        // If both searches fail, show error
        setUsers([]);
        toast({
          title: "المستخدم غير موجود",
          description: "تأكد من اسم المستخدم أو البريد الإلكتروني",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
      toast({
        title: "خطأ في البحث",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const createOrGetConversation = async (otherUser: Profile) => {
    if (!user) return;

    setLoading(true);

    try {
      const conversation = await apiClient.createConversation(otherUser.username);
      onConversationCreated(conversation);
      onOpenChange(false);
      setSearchTerm('');
      
      toast({
        title: "تم إنشاء المحادثة",
        description: `بدأت محادثة مع ${otherUser.full_name || 'مستخدم'}`,
      });
      
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "خطأ في إنشاء المحادثة",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 space-x-reverse">
            <MessageCircle className="h-5 w-5" />
            <span>محادثة جديدة</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="البحث بـ اسم المستخدم أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 text-right"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">جاري البحث...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون'}
                </p>
              </div>
            ) : (
              filteredUsers.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => createOrGetConversation(profile)}
                >
                  <Avatar>
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {profile.full_name?.split(' ').map(n => n[0]).join('') || 
                       profile.username?.[0]?.toUpperCase() || '؟'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {profile.full_name || profile.username || 'مستخدم غير معروف'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      @{profile.username}
                    </p>
                  </div>

                  {loading && (
                    <div className="text-sm text-gray-500">جاري الإنشاء...</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
