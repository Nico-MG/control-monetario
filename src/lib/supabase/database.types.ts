export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      allowed_users: {
        Row: {
          email: string;
          username: string;
          username_key: string;
          created_at: string;
        };
        Insert: {
          email: string;
          username: string;
          username_key?: never;
          created_at?: string;
        };
        Update: {
          email?: string;
          username?: string;
          username_key?: never;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          category: string;
          type: "income" | "expense";
          amount: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date?: string;
          description: string;
          category: string;
          type: "income" | "expense";
          amount: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          description?: string;
          category?: string;
          type?: "income" | "expense";
          amount?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          category: string;
          amount: number;
          scheme: "fixed" | "variable";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          month: string;
          category: string;
          amount: number;
          scheme?: "fixed" | "variable";
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          category?: string;
          amount?: number;
          scheme?: "fixed" | "variable";
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      budget_history: {
        Row: {
          id: string;
          user_id: string;
          budget_id: string | null;
          month: string;
          category: string;
          action: "created" | "updated" | "deleted";
          previous_amount: number | null;
          amount: number | null;
          previous_notes: string | null;
          notes: string | null;
          scheme: "fixed" | "variable";
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          budget_id?: string | null;
          month: string;
          category: string;
          action: "created" | "updated" | "deleted";
          previous_amount?: number | null;
          amount?: number | null;
          previous_notes?: string | null;
          notes?: string | null;
          scheme: "fixed" | "variable";
          recorded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          budget_id?: string | null;
          month?: string;
          category?: string;
          action?: "created" | "updated" | "deleted";
          previous_amount?: number | null;
          amount?: number | null;
          previous_notes?: string | null;
          notes?: string | null;
          scheme?: "fixed" | "variable";
          recorded_at?: string;
        };
        Relationships: [];
      };
      monthly_goals: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          goal_type: "savings" | "investment";
          percentage: number;
          saved_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          month: string;
          goal_type: "savings" | "investment";
          percentage: number;
          saved_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          goal_type?: "savings" | "investment";
          percentage?: number;
          saved_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_amount: number;
          saved_amount: number;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          target_amount: number;
          saved_amount?: number;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          target_amount?: number;
          saved_amount?: number;
          due_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
