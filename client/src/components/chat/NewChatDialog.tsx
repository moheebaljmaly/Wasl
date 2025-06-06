
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
      console.log('جلب جميع المستخدمين...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .order('full_name');

      if (error) {
        console.error('خطأ في جلب المستخدمين:', error);
        throw error;
      }

      console.log('تم جلب المستخدمين:', data);
      setUsers(data || []);
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
      console.log('البحث عن المستخدمين بالكلمة:', searchTerm);
      
      // البحث في الاسم الكامل أو البريد الإلكتروني
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .or(`full_name.ilike.%${searchTerm}%`)
        .order('full_name');

      if (profilesError) {
        console.error('خطأ في البحث في profiles:', profilesError);
        throw profilesError;
      }

      // البحث في جدول auth.users للبريد الإلكتروني (إذا كان متاحاً)
      // نظراً لأن auth.users غير متاح مباشرة، سنبحث فقط في profiles
      console.log('نتائج البحث:', profilesData);
      setUsers(profilesData || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "خطأ في البحث",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const createOrGetConversation = async (otherUserId: string) => {
    if (!user) return;

    setLoading(true);

    try {
      console.log('إنشاء أو البحث عن محادثة مع المستخدم:', otherUserId);
      
      // البحث عن محادثة موجودة
      const { data: existingConversation, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('خطأ في البحث عن المحادثة:', searchError);
        throw searchError;
      }

      let conversation;

      if (existingConversation) {
        console.log('تم العثور على محادثة موجودة:', existingConversation);
        conversation = existingConversation;
      } else {
        console.log('إنشاء محادثة جديدة...');
        // إنشاء محادثة جديدة
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant_1: user.id,
            participant_2: otherUserId
          })
          .select()
          .single();

        if (createError) {
          console.error('خطأ في إنشاء المحادثة:', createError);
          throw createError;
        }
        
        console.log('تم إنشاء محادثة جديدة:', newConversation);
        conversation = newConversation;
      }

      // إضافة بيانات المشارك الآخر
      const { data: otherUser, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      if (userError) {
        console.error('خطأ في جلب بيانات المستخدم:', userError);
        throw userError;
      }

      const conversationWithDetails = {
        ...conversation,
        other_participant: otherUser
      };

      console.log('المحادثة النهائية:', conversationWithDetails);
      onConversationCreated(conversationWithDetails);
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
              placeholder="البحث بالاسم أو البريد الإلكتروني..."
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
                    <p className="text-sm text-gray-500">
                      ID: {profile.id.slice(0, 8)}...
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
