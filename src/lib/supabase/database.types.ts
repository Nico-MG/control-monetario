export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          transaction_type: "income" | "expense";
          scheme: "fixed" | "variable";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          transaction_type?: "income" | "expense";
          scheme?: "fixed" | "variable";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          transaction_type?: "income" | "expense";
          scheme?: "fixed" | "variable";
          is_active?: boolean;
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
          comment: string | null;
          income_percentage: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          month: string;
          category: string;
          amount: number;
          scheme?: "fixed" | "variable";
          comment?: string | null;
          income_percentage?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          category?: string;
          amount?: number;
          scheme?: "fixed" | "variable";
          comment?: string | null;
          income_percentage?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      budget_category_status: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          category: string;
          is_closed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          month: string;
          category: string;
          is_closed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          category?: string;
          is_closed?: boolean;
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
    Functions: {
      update_finance_category: {
        Args: {
          p_category_id: string;
          p_name: string;
          p_transaction_type: "income" | "expense";
          p_scheme: "fixed" | "variable";
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
