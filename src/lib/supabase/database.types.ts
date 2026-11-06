export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          month: string;
          category: string;
          amount: number;
          scheme?: "fixed" | "variable";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          category?: string;
          amount?: number;
          scheme?: "fixed" | "variable";
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
