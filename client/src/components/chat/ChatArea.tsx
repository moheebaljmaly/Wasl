
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, ArrowRight, Wifi, WifiOff, MoreVertical, Trash2, UserX, Reply, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Conversation, Message } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { ProfileDialog } from './ProfileDialog';
import { MessageItem } from './MessageItem';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ChatAreaProps {
  conversation: Conversation | null;
  onBack: () => void;
}

export function ChatArea({ conversation, onBack }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
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
      const messagesData = await apiClient.getMessages(conversation.id);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Real-time functionality can be added later with WebSockets if needed
  // For now, we'll rely on periodic refresh or manual refresh

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
      const sentMessage = await apiClient.sendMessage(conversation.id, messageContent, {
        status: 'sent',
        is_offline: false
      });

      // Add the sent message to the local state
      setMessages(prev => [...prev, sentMessage]);

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
            <AvatarImage src={conversation.other_participant?.avatar_url ?? undefined} />
            <AvatarFallback>
              {conversation.other_participant?.full_name?.split(' ').map(n => n[0]).join('') || 
               conversation.other_participant?.username?.[0]?.toUpperCase() || '؟'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 cursor-pointer" onClick={() => setShowProfileDialog(true)}>
            <h2 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
              {conversation.other_participant?.full_name || conversation.other_participant?.username || 'مستخدم غير معروف'}
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

          {/* قائمة الخيارات */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-red-600 cursor-pointer">
                <UserX className="h-4 w-4 mr-2" />
                حظر المستخدم
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                حذف المحادثة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* تنبيه عدم الاتصال */}
      {!isOnline && (
        <Alert className="mx-4 mt-4 bg-orange-50 border-orange-200">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            يجب الاتصال بالإنترنت لإرسال الرسائل. ستحفظ الرسائل محلياً حتى استعادة الاتصال.
          </AlertDescription>
        </Alert>
      )}

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.sender_id === user?.id}
            otherParticipant={conversation?.other_participant}
            onReply={setReplyingTo}
            onShare={(msg) => {
              navigator.share?.({
                text: msg.content,
                title: 'رسالة من ' + (conversation?.other_participant?.full_name || 'وصل')
              }).catch(() => {
                navigator.clipboard.writeText(msg.content);
                toast({ title: "تم نسخ الرسالة" });
              });
            }}
            onDelete={async (messageId) => {
              try {
                await apiClient.request(`/messages/${messageId}`, { method: 'DELETE' });
                setMessages(prev => prev.map(m => 
                  m.id === messageId ? { ...m, is_deleted: true } : m
                ));
                toast({ title: "تم حذف الرسالة" });
              } catch (error) {
                toast({ title: "فشل حذف الرسالة", variant: "destructive" });
              }
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* منطقة الإدخال */}
      <div className="bg-white border-t p-4">
        {/* مؤشر الرد */}
        {replyingTo && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Reply className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                رد على: {replyingTo.content.slice(0, 50)}...
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setReplyingTo(null)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <form onSubmit={sendMessage} className="flex space-x-2 space-x-reverse">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={replyingTo ? "اكتب ردك..." : "اكتب رسالتك..."}
            className="flex-1 text-right"
            disabled={loading || !isOnline}
          />
          <Button type="submit" disabled={loading || !newMessage.trim() || !isOnline}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Profile Dialog */}
      <ProfileDialog 
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        profile={conversation?.other_participant || null}
      />
    </div>
  );
}
