import { pgTable, text, serial, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Profiles table (replaces Supabase auth.users)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  full_name: text("full_name"),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  participant_1: uuid("participant_1").notNull().references(() => profiles.id),
  participant_2: uuid("participant_2").notNull().references(() => profiles.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id").notNull().references(() => conversations.id),
  sender_id: uuid("sender_id").notNull().references(() => profiles.id),
  content: text("content").notNull(),
  status: text("status").notNull().default("sent"), // 'sending' | 'sent' | 'failed' | 'delivered'
  is_offline: boolean("is_offline").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  sentMessages: many(messages),
  conversations1: many(conversations, { relationName: "participant1" }),
  conversations2: many(conversations, { relationName: "participant2" }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1: one(profiles, {
    fields: [conversations.participant_1],
    references: [profiles.id],
    relationName: "participant1",
  }),
  participant2: one(profiles, {
    fields: [conversations.participant_2],
    references: [profiles.id],
    relationName: "participant2",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
  sender: one(profiles, {
    fields: [messages.sender_id],
    references: [profiles.id],
  }),
}));

// Insert schemas
export const insertProfileSchema = createInsertSchema(profiles).pick({
  email: true,
  password: true,
  full_name: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  participant_1: true,
  participant_2: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversation_id: true,
  sender_id: true,
  content: true,
  status: true,
  is_offline: true,
});

// Types
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Legacy compatibility
export const users = profiles;
export const insertUserSchema = insertProfileSchema;
export type InsertUser = InsertProfile;
export type User = Profile;
