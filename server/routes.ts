import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertProfileSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getProfile(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, username, password, full_name } = insertProfileSchema.extend({
        full_name: z.string().optional()
      }).parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getProfileByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "المستخدم موجود بالفعل" });
      }

      // Check if username already exists
      const existingUsername = await storage.getProfileByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createProfile({
        email,
        username,
        password: hashedPassword,
        full_name: full_name || null
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { ...user, password: undefined },
        token,
        session: { access_token: token, user: { ...user, password: undefined } }
      });
    } catch (error: any) {
      let errorMessage = "فشل في إنشاء الحساب";
      
      if (error.message) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          if (error.message.includes('email')) {
            errorMessage = "هذا البريد الإلكتروني مستخدم بالفعل";
          } else if (error.message.includes('username')) {
            errorMessage = "اسم المستخدم مستخدم بالفعل";
          } else {
            errorMessage = "البيانات مستخدمة بالفعل";
          }
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = "خطأ في قاعدة البيانات - يرجى المحاولة مرة أخرى";
        } else if (error.message.includes('validation')) {
          errorMessage = "البيانات المدخلة غير صحيحة";
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(400).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string()
      }).parse(req.body);

      // Find user
      const user = await storage.getProfileByEmail(email);
      if (!user) {
        return res.status(400).json({ error: "بريد إلكتروني أو كلمة مرور خاطئة" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "بريد إلكتروني أو كلمة مرور خاطئة" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { ...user, password: undefined },
        token,
        session: { access_token: token, user: { ...user, password: undefined } }
      });
    } catch (error: any) {
      let errorMessage = "فشل في تسجيل الدخول";
      
      if (error.message) {
        if (error.message.includes('validation')) {
          errorMessage = "البيانات المدخلة غير صحيحة";
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = "خطأ في قاعدة البيانات - يرجى المحاولة مرة أخرى";
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(400).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/signout", authenticateToken, async (req, res) => {
    res.json({ message: "Signed out successfully" });
  });

  app.get("/api/auth/user", authenticateToken, async (req: any, res) => {
    res.json({ user: { ...req.user, password: undefined } });
  });

  // Conversations routes
  app.get("/api/conversations", authenticateToken, async (req: any, res) => {
    try {
      const conversations = await storage.getConversationsForUser(req.user.id);
      
      // Get conversation details with other participant, last message, and unread count
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          const otherParticipantId = conv.participant_1 === req.user.id ? conv.participant_2 : conv.participant_1;
          const otherParticipant = await storage.getProfile(otherParticipantId);
          
          // Get last message
          const messages = await storage.getMessagesForConversation(conv.id);
          const lastMessage = messages[messages.length - 1];
          
          // Get unread messages count
          const unreadCount = await storage.getUnreadMessagesCount(conv.id, req.user.id);
          
          return {
            ...conv,
            other_participant: otherParticipant ? { ...otherParticipant, password: undefined } : null,
            last_message: lastMessage || null,
            unread_count: unreadCount
          };
        })
      );

      res.json(conversationsWithDetails);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", authenticateToken, async (req: any, res) => {
    try {
      const { participant_username } = z.object({
        participant_username: z.string().min(1)
      }).parse(req.body);

      // Find the other participant
      const otherParticipant = await storage.getProfileByUsername(participant_username);
      if (!otherParticipant) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      if (otherParticipant.id === req.user.id) {
        return res.status(400).json({ error: "لا يمكن إنشاء محادثة مع نفسك" });
      }

      // Check if conversation already exists
      const existingConversations = await storage.getConversationsForUser(req.user.id);
      const existingConv = existingConversations.find(conv => 
        (conv.participant_1 === req.user.id && conv.participant_2 === otherParticipant.id) ||
        (conv.participant_1 === otherParticipant.id && conv.participant_2 === req.user.id)
      );

      if (existingConv) {
        return res.json({
          ...existingConv,
          other_participant: { ...otherParticipant, password: undefined }
        });
      }

      // Create new conversation
      const conversation = await storage.createConversation({
        participant_1: req.user.id,
        participant_2: otherParticipant.id
      });

      res.json({
        ...conversation,
        other_participant: { ...otherParticipant, password: undefined }
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create conversation" });
    }
  });

  // Messages routes
  app.get("/api/conversations/:conversationId/messages", authenticateToken, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      
      // Verify user is part of this conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || (conversation.participant_1 !== req.user.id && conversation.participant_2 !== req.user.id)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await storage.getMessagesForConversation(conversationId);
      
      // Mark messages as read when user opens conversation
      await storage.markMessagesAsRead(conversationId, req.user.id);
      
      // Add sender info to messages
      const messagesWithSender = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getProfile(message.sender_id);
          return {
            ...message,
            sender: sender ? { ...sender, password: undefined } : null
          };
        })
      );

      res.json(messagesWithSender);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:conversationId/messages", authenticateToken, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const { content, status = "sent", is_offline = false } = z.object({
        content: z.string().min(1),
        status: z.enum(["sending", "sent", "failed", "delivered"]).optional(),
        is_offline: z.boolean().optional()
      }).parse(req.body);

      // Verify user is part of this conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || (conversation.participant_1 !== req.user.id && conversation.participant_2 !== req.user.id)) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Create message
      const message = await storage.createMessage({
        conversation_id: conversationId,
        sender_id: req.user.id,
        content,
        status,
        is_offline
      });

      // Update conversation updated_at
      await storage.updateConversation(conversationId, {});

      // Add sender info
      const messageWithSender = {
        ...message,
        sender: { ...req.user, password: undefined }
      };

      res.json(messageWithSender);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  // Profiles route for searching users by username
  app.get("/api/profiles/search", authenticateToken, async (req: any, res) => {
    try {
      const { username } = z.object({
        username: z.string().min(1)
      }).parse(req.query);

      const profile = await storage.getProfileByUsername(username);
      if (!profile) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      res.json({ ...profile, password: undefined });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "فشل البحث" });
    }
  });

  // Profiles route for searching users by email
  app.get("/api/profiles/search-by-email", authenticateToken, async (req: any, res) => {
    try {
      const { email } = z.object({
        email: z.string().email()
      }).parse(req.query);

      const profile = await storage.getProfileByEmail(email);
      if (!profile) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      res.json({ ...profile, password: undefined });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "فشل البحث" });
    }
  });

  // Update profile route
  app.patch("/api/profiles/me", authenticateToken, async (req: any, res) => {
    try {
      const { full_name, avatar_url } = z.object({
        full_name: z.string().optional(),
        avatar_url: z.string().optional()
      }).parse(req.body);

      const updates: any = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;

      const updatedProfile = await storage.updateProfile(req.user.id, updates);
      if (!updatedProfile) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      res.json({ ...updatedProfile, password: undefined });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "فشل تحديث الملف الشخصي" });
    }
  });

  // Delete message route
  app.delete("/api/messages/:messageId", authenticateToken, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "الرسالة غير موجودة" });
      }

      // Check if user is the sender
      if (message.sender_id !== req.user.id) {
        return res.status(403).json({ error: "لا يمكنك حذف هذه الرسالة" });
      }

      // Mark message as deleted
      await storage.updateMessage(messageId, { is_deleted: true });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "فشل حذف الرسالة" });
    }
  });

  // Block user route
  app.post("/api/profiles/:userId/block", authenticateToken, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      if (userId === req.user.id) {
        return res.status(400).json({ error: "لا يمكنك حظر نفسك" });
      }

      const userToBlock = await storage.getProfile(userId);
      if (!userToBlock) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Update user's blocked status
      await storage.updateProfile(userId, { is_blocked: true });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "فشل حظر المستخدم" });
    }
  });

  // Delete conversation route
  app.delete("/api/conversations/:conversationId", authenticateToken, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "المحادثة غير موجودة" });
      }

      // Check if user is part of this conversation
      if (conversation.participant_1 !== req.user.id && conversation.participant_2 !== req.user.id) {
        return res.status(403).json({ error: "لا يمكنك حذف هذه المحادثة" });
      }

      // Mark all messages in conversation as deleted
      const messages = await storage.getMessagesForConversation(conversationId);
      await Promise.all(
        messages.map(message => storage.updateMessage(message.id, { is_deleted: true }))
      );
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "فشل حذف المحادثة" });
    }
  });

  // Update online status
  app.post("/api/profiles/me/online", authenticateToken, async (req: any, res) => {
    try {
      const { is_online } = z.object({
        is_online: z.boolean()
      }).parse(req.body);

      await storage.updateProfile(req.user.id, { 
        is_online,
        last_seen: new Date()
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "فشل تحديث حالة الاتصال" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
