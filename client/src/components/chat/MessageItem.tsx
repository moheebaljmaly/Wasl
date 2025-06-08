import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Reply, Share, Trash2, MoreHorizontal } from 'lucide-react';
import { Message, Profile } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  otherParticipant?: Profile;
  onReply?: (message: Message) => void;
  onShare?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
}

export function MessageItem({ 
  message, 
  isOwn, 
  otherParticipant, 
  onReply, 
  onShare, 
  onDelete,
  className 
}: MessageItemProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const messageRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  // Handle touch/mouse events for swipe to reply
  const handleStart = (clientX: number) => {
    startX.current = clientX;
    isDragging.current = true;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current) return;
    
    const diff = clientX - startX.current;
    const maxSwipe = 80;
    
    // For own messages: swipe right to left for reply
    // For others: swipe left to right for reply
    if (isOwn) {
      setSwipeOffset(Math.max(Math.min(diff, 0), -maxSwipe));
    } else {
      setSwipeOffset(Math.min(Math.max(diff, 0), maxSwipe));
    }
  };

  const handleEnd = () => {
    isDragging.current = false;
    
    // Trigger reply if swiped enough
    if (Math.abs(swipeOffset) > 40 && onReply) {
      onReply(message);
    }
    
    // Reset swipe
    setSwipeOffset(0);
  };

  const handleLongPress = () => {
    setIsSelected(!isSelected);
    setShowActions(!showActions);
  };

  // Long press detection
  useEffect(() => {
    let pressTimer: NodeJS.Timeout;
    
    const handleMouseDown = () => {
      pressTimer = setTimeout(handleLongPress, 500);
    };
    
    const handleMouseUp = () => {
      clearTimeout(pressTimer);
    };
    
    const element = messageRef.current;
    if (element) {
      element.addEventListener('mousedown', handleMouseDown);
      element.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mouseleave', handleMouseUp);
      
      return () => {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mouseup', handleMouseUp);
        element.removeEventListener('mouseleave', handleMouseUp);
        clearTimeout(pressTimer);
      };
    }
  }, []);

  if (message.is_deleted) {
    return (
      <div className={cn(
        "flex mb-4",
        isOwn ? "justify-end" : "justify-start",
        className
      )}>
        <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 italic text-gray-500">
          تم حذف هذه الرسالة
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex mb-4 group",
      isOwn ? "justify-end" : "justify-start",
      isSelected && "message-selected",
      className
    )}>
      <div className="flex items-end space-x-2 space-x-reverse max-w-xs lg:max-w-md">
        {!isOwn && (
          <Avatar className="w-8 h-8">
            <AvatarImage src={otherParticipant?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {otherParticipant?.full_name?.split(' ').map(n => n[0]).join('') || 
               otherParticipant?.username?.[0]?.toUpperCase() || '؟'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div
          ref={messageRef}
          className={cn(
            "swipe-reply relative px-4 py-2 rounded-lg transition-all duration-200",
            isOwn ? "message-sent" : "message-received",
            showActions && "ring-2 ring-blue-300"
          )}
          style={{ transform: `translateX(${swipeOffset}px)` }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => isDragging.current && handleMove(e.clientX)}
          onMouseUp={handleEnd}
        >
          {/* Reply indicator */}
          {message.reply_to_id && (
            <div className="mb-2 p-2 bg-black/10 rounded text-xs opacity-70">
              ردًا على رسالة سابقة
            </div>
          )}
          
          <p className="text-sm">{message.content}</p>
          
          <div className={cn(
            "flex items-center justify-between mt-1 text-xs",
            isOwn ? "text-blue-100" : "text-gray-500"
          )}>
            <span>
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true,
                locale: ar
              })}
            </span>
            
            {isOwn && (
              <span className="ml-2">
                {message.status === 'sending' && '⏳'}
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'failed' && '❌'}
              </span>
            )}
          </div>
          
          {/* Swipe indicator */}
          {Math.abs(swipeOffset) > 20 && (
            <div className={cn(
              "absolute top-1/2 transform -translate-y-1/2 text-blue-500",
              isOwn ? "-right-8" : "-left-8"
            )}>
              <Reply className="w-4 h-4" />
            </div>
          )}
        </div>
        
        {/* Action menu */}
        {showActions && (
          <div className="flex items-center space-x-1 space-x-reverse">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReply?.(message)}
              className="h-8 w-8 p-0"
            >
              <Reply className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onShare?.(message)}
              className="h-8 w-8 p-0"
            >
              <Share className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onDelete?.(message.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف للجميع
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}