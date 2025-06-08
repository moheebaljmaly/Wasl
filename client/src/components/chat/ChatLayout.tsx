
import { useState } from 'react';
import { ConversationsList } from './ConversationsList';
import { ChatArea } from './ChatArea';
import { NewChatDialog } from './NewChatDialog';
import { SettingsDialog } from './SettingsDialog';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Conversation } from '@/types';

export function ChatLayout() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedConversation(null);
  };

  const handleNewChat = () => {
    setShowNewChat(true);
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileChat(true);
    setShowNewChat(false);
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* قائمة المحادثات */}
      <div className={`w-full md:w-80 bg-white border-l ${showMobileChat ? 'hidden md:block' : 'block'}`}>
        <div className="h-full flex flex-col">
          {/* رأس الصفحة */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-white">وصل</h1>
              <p className="text-sm text-blue-100">Wasl</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="text-white hover:bg-white/20">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          <ConversationsList
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            selectedConversationId={selectedConversation?.id}
          />
        </div>
      </div>

      {/* منطقة الدردشة */}
      <div className={`flex-1 ${showMobileChat ? 'block' : 'hidden md:block'}`}>
        <ChatArea
          conversation={selectedConversation}
          onBack={handleBackToList}
        />
      </div>

      {/* نوافذ الحوار */}
      <NewChatDialog
        open={showNewChat}
        onOpenChange={setShowNewChat}
        onConversationCreated={handleConversationCreated}
      />

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </div>
  );
}
