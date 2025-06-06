
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Conversation } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ConversationsListProps {
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  selectedConversationId?: string;
}

export function ConversationsList({ onSelectConversation, onNewChat, selectedConversationId }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // جلب المحادثات مع بيانات المشارك الآخر وآخر رسالة
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages:messages(
            id,
            content,
            created_at,
            sender_id
          )
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // إضافة بيانات المشارك الآخر وآخر رسالة
      const conversationsWithDetails = await Promise.all(
        conversationsData?.map(async (conv) => {
          const otherParticipantId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          
          // جلب بيانات المشارك الآخر
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherParticipantId)
            .single();

          // الحصول على آخر رسالة
          const lastMessage = conv.messages?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          return {
            ...conv,
            other_participant: profile,
            last_message: lastMessage
          };
        }) || []
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_participant?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">جاري تحميل المحادثات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* رأس القائمة */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">المحادثات</h1>
          <Button onClick={onNewChat} size="sm" className="rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="البحث في المحادثات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-right"
          />
        </div>
      </div>

      {/* قائمة المحادثات */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد محادثات</h3>
            <p className="text-gray-500 mb-4">ابدأ محادثة جديدة لتظهر هنا</p>
            <Button onClick={onNewChat}>
              <Plus className="h-4 w-4 ml-2" />
              محادثة جديدة
            </Button>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`m-2 p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedConversationId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="flex items-center space-x-3 space-x-reverse">
                <Avatar>
                  <AvatarImage src={conversation.other_participant?.avatar_url || ''} />
                  <AvatarFallback>
                    {conversation.other_participant?.full_name?.split(' ').map(n => n[0]).join('') || '؟'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.other_participant?.full_name || 'مستخدم غير معروف'}
                    </h3>
                    {conversation.last_message && (
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                          addSuffix: true,
                          locale: ar
                        })}
                      </span>
                    )}
                  </div>
                  
                  {conversation.last_message ? (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conversation.last_message.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-1">لا توجد رسائل</p>
                  )}
                </div>
                
                {/* شارة الرسائل غير المقروءة - سيتم تطويرها لاحقاً */}
                {false && (
                  <Badge variant="default" className="rounded-full">
                    2
                  </Badge>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
