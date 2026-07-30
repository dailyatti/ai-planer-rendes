import { PriorityLevel, ViewType } from './planner';

export type AssistantAction =
  | {
      type: 'navigation';
      target: ViewType | 'stats';
    }
  | {
      type: 'create_task';
      data: {
        title: string;
        description?: string;
        date?: string;
        priority?: PriorityLevel;
      };
    }
  | {
      type: 'create_note';
      data: {
        title: string;
        content: string;
      };
    }
  | {
      type: 'create_goal';
      data: {
        title: string;
        description?: string;
        targetDate?: string;
        priority?: PriorityLevel;
      };
    }
  | {
      type: 'create_transaction';
      data: {
        amount: number;
        currency?: string;
        category?: string;
        description?: string;
        type?: 'income' | 'expense';
      };
    }
  | {
      type: 'create_payable';
      data: {
        description: string;
        amount: number;
        currency?: string;
        category?: string;
        payee?: string;
        dueDate?: string;
        kind: 'bill' | 'subscription';
        autoPay?: boolean;
        period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
      };
    }
  | {
      type: 'complete_task';
      data: {
        title: string;
      };
    }
  | {
      type: 'update_goal_progress';
      data: {
        title: string;
        progress: number;
      };
    }
  | {
      type: 'mark_payable_paid';
      data: {
        description: string;
      };
    }
  | {
      type: 'schedule_pending';
    }
  | {
      type: 'toggle_theme';
      target?: 'light' | 'dark';
    }
  | {
      type: 'pomodoro';
      target?: string;
    };

export interface AssistantPlan {
  reply: string;
  actions: AssistantAction[];
}
