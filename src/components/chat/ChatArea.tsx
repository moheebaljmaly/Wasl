
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Send, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Conversation, Message } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface ChatAreaProps {
  conversation: Conversation | null;
  onBack: () => void;
}

export function ChatArea({ conversation, onBack }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "تم استعادة الاتصال",
        description: "يمكنك الآن إرسال الرسائل",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "اتصالك بالإنترنت ضعيف",
        description: "ستحفظ الرسائل محلياً حتى استعادة الاتصال",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!conversation) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          status,
          is_offline,
          created_at,
          sender:profiles(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // تحويل البيانات للنوع المطلوب
      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        status: msg.status as 'sending' | 'sent' | 'failed' | 'delivered',
        is_offline: msg.is_offline,
        created_at: msg.created_at,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!conversation) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        async (payload) => {
          // جلب بيانات المرسل
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: Message = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            status: payload.new.status as 'sending' | 'sent' | 'failed' | 'delivered',
            is_offline: payload.new.is_offline,
            created_at: payload.new.created_at,
            sender
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    if (!isOnline) {
      // حفظ الرسالة محلياً للإرسال لاحقاً
      const offlineMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: user.id,
        content: messageContent,
        status: 'sending',
        is_offline: true,
        created_at: new Date().toISOString(),
        sender: undefined
      };

      setMessages(prev => [...prev, offlineMessage]);
      
      toast({
        title: "سيتم إرسال الرسالة عند استعادة الاتصال",
        description: "تم حفظ الرسالة محلياً",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: messageContent,
          status: 'sent'
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "فشل في إرسال الرسالة",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">مرحباً بك في وصل</h3>
          <p className="text-gray-500">اختر محادثة لبدء الدردشة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* رأس المحادثة */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden">
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <Avatar>
            <AvatarImage src={conversation.other_participant?.avatar_url || ''} />
            <AvatarFallback>
              {conversation.other_participant?.full_name?.split(' ').map(n => n[0]).join('') || '؟'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="font-medium text-gray-900">
              {conversation.other_participant?.full_name || 'مستخدم غير معروف'}
            </h2>
            <div className="flex items-center space-x-2 space-x-reverse">
              {isOnline ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-gray-500">
                {isOnline ? 'متصل' : 'غير متصل'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-start' : 'justify-end'}`}
          >
            <Card
              className={`max-w-xs lg:max-w-md p-3 ${
                message.sender_id === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                    locale: ar
                  })}
                </span>
                {message.sender_id === user?.id && (
                  <span className="text-xs opacity-70">
                    {message.status === 'sending' && '⏳'}
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'failed' && '❌'}
                  </span>
                )}
              </div>
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* منطقة الإدخال */}
      <div className="bg-white border-t p-4">
        {!isOnline && (
          <div className="mb-3 p-2 bg-orange-100 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 text-center">
              يجب الاتصال بالإنترنت لإرسال الرسائل
            </p>
          </div>
        )}
        
        <form onSubmit={sendMessage} className="flex space-x-2 space-x-reverse">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="flex-1 text-right"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
