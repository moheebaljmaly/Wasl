
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const createOrGetConversation = async (otherUserId: string) => {
    if (!user) return;

    setLoading(true);

    try {
      // البحث عن محادثة موجودة
      const { data: existingConversation, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      let conversation;

      if (existingConversation) {
        conversation = existingConversation;
      } else {
        // إنشاء محادثة جديدة
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant_1: user.id,
            participant_2: otherUserId
          })
          .select()
          .single();

        if (createError) throw createError;
        conversation = newConversation;
      }

      // إضافة بيانات المشارك الآخر
      const { data: otherUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      const conversationWithDetails = {
        ...conversation,
        other_participant: otherUser
      };

      onConversationCreated(conversationWithDetails);
      onOpenChange(false);
      
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

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              placeholder="البحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 text-right"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">لا يوجد مستخدمون</p>
              </div>
            ) : (
              filteredUsers.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => createOrGetConversation(profile.id)}
                >
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback>
                      {profile.full_name?.split(' ').map(n => n[0]).join('') || '؟'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {profile.full_name || 'مستخدم غير معروف'}
                    </h3>
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
