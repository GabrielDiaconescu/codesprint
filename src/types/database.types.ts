export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: Json
          icon_key: string
          id: string
          is_active: boolean
          name: Json
          rule: Json
          slug: string
          sort_order: number
          updated_at: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: Json
          icon_key: string
          id?: string
          is_active?: boolean
          name: Json
          rule: Json
          slug: string
          sort_order?: number
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: Json
          icon_key?: string
          id?: string
          is_active?: boolean
          name?: Json
          rule?: Json
          slug?: string
          sort_order?: number
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      app_config: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          event_id: string
          event_type: string
          payload: Json
          processed_at: string | null
          received_at: string
          user_id: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          user_id?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          description: Json
          icon_key: string | null
          id: string
          is_active: boolean
          language: string
          order_index: number
          slug: string
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          icon_key?: string | null
          id?: string
          is_active?: boolean
          language?: string
          order_index?: number
          slug: string
          title: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          icon_key?: string | null
          id?: string
          is_active?: boolean
          language?: string
          order_index?: number
          slug?: string
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          bonus_xp: number
          challenge_date: string
          created_at: string
          question_ids: string[]
        }
        Insert: {
          bonus_xp?: number
          challenge_date: string
          created_at?: string
          question_ids: string[]
        }
        Update: {
          bonus_xp?: number
          challenge_date?: string
          created_at?: string
          question_ids?: string[]
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answers: Json
          created_at: string
          exam_id: string
          expires_at: string | null
          id: string
          passed: boolean | null
          question_ids: string[]
          score_pct: number | null
          skill_breakdown: Json
          started_at: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          exam_id: string
          expires_at?: string | null
          id?: string
          passed?: boolean | null
          question_ids: string[]
          score_pct?: number | null
          skill_breakdown?: Json
          started_at?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          exam_id?: string
          expires_at?: string | null
          id?: string
          passed?: boolean | null
          question_ids?: string[]
          score_pct?: number | null
          skill_breakdown?: Json
          started_at?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string
          description: Json
          id: string
          is_active: boolean
          pass_threshold_pct: number
          question_count: number
          requires_entitlement:
            | Database["public"]["Enums"]["entitlement_id"]
            | null
          slug: string
          time_limit_minutes: number | null
          title: Json
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: Json
          id?: string
          is_active?: boolean
          pass_threshold_pct?: number
          question_count: number
          requires_entitlement?:
            | Database["public"]["Enums"]["entitlement_id"]
            | null
          slug: string
          time_limit_minutes?: number | null
          title: Json
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: Json
          id?: string
          is_active?: boolean
          pass_threshold_pct?: number
          question_count?: number
          requires_entitlement?:
            | Database["public"]["Enums"]["entitlement_id"]
            | null
          slug?: string
          time_limit_minutes?: number | null
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_weekly: {
        Row: {
          updated_at: string
          user_id: string
          week_start: string
          xp: number
        }
        Insert: {
          updated_at?: string
          user_id: string
          week_start: string
          xp?: number
        }
        Update: {
          updated_at?: string
          user_id?: string
          week_start?: string
          xp?: number
        }
        Relationships: []
      }
      lesson_contents: {
        Row: {
          blocks: Json
          content_hash: string | null
          created_at: string
          lesson_id: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          content_hash?: string | null
          created_at?: string
          lesson_id: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          content_hash?: string | null
          created_at?: string
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_contents_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_hash: string | null
          created_at: string
          estimated_minutes: number
          id: string
          is_active: boolean
          module_id: string
          order_index: number
          review_status: Database["public"]["Enums"]["review_status"]
          slug: string
          summary: Json
          title: Json
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          module_id: string
          order_index: number
          review_status?: Database["public"]["Enums"]["review_status"]
          slug: string
          summary?: Json
          title: Json
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          module_id?: string
          order_index?: number
          review_status?: Database["public"]["Enums"]["review_status"]
          slug?: string
          summary?: Json
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: Json
          estimated_minutes: number
          id: string
          is_active: boolean
          is_premium_override: boolean | null
          order_index: number
          slug: string
          title: Json
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: Json
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_premium_override?: boolean | null
          order_index: number
          slug: string
          title: Json
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: Json
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          is_premium_override?: boolean | null
          order_index?: number
          slug?: string
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ads_consent_status: string
          analytics_consent: boolean
          avatar_key: string
          birth_year: number | null
          created_at: string
          daily_goal_minutes: number
          display_name: string | null
          experience_level: string | null
          id: string
          is_anonymous: boolean
          last_seen_at: string
          leaderboard_hidden: boolean
          locale: string
          motivation: string | null
          onboarding_completed_at: string | null
          reminder_time: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          ads_consent_status?: string
          analytics_consent?: boolean
          avatar_key?: string
          birth_year?: number | null
          created_at?: string
          daily_goal_minutes?: number
          display_name?: string | null
          experience_level?: string | null
          id: string
          is_anonymous?: boolean
          last_seen_at?: string
          leaderboard_hidden?: boolean
          locale?: string
          motivation?: string | null
          onboarding_completed_at?: string | null
          reminder_time?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          ads_consent_status?: string
          analytics_consent?: boolean
          avatar_key?: string
          birth_year?: number | null
          created_at?: string
          daily_goal_minutes?: number
          display_name?: string | null
          experience_level?: string | null
          id?: string
          is_anonymous?: boolean
          last_seen_at?: string
          leaderboard_hidden?: boolean
          locale?: string
          motivation?: string | null
          onboarding_completed_at?: string | null
          reminder_time?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_answer_keys: {
        Row: {
          accepted_answers: Json
          answer: Json
          created_at: string
          match_mode: Database["public"]["Enums"]["answer_match_mode"]
          question_id: string
          updated_at: string
        }
        Insert: {
          accepted_answers?: Json
          answer: Json
          created_at?: string
          match_mode?: Database["public"]["Enums"]["answer_match_mode"]
          question_id: string
          updated_at?: string
        }
        Update: {
          accepted_answers?: Json
          answer?: Json
          created_at?: string
          match_mode?: Database["public"]["Enums"]["answer_match_mode"]
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          code_snippet: string | null
          content_hash: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: Json
          hint: Json | null
          id: string
          is_active: boolean
          is_challenge_eligible: boolean
          is_exam_eligible: boolean
          is_premium: boolean
          lesson_id: string
          metadata: Json
          order_index: number
          payload: Json
          prompt: Json
          review_status: Database["public"]["Enums"]["review_status"]
          skill_tags: string[]
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          code_snippet?: string | null
          content_hash?: string | null
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: Json
          hint?: Json | null
          id?: string
          is_active?: boolean
          is_challenge_eligible?: boolean
          is_exam_eligible?: boolean
          is_premium?: boolean
          lesson_id: string
          metadata?: Json
          order_index?: number
          payload?: Json
          prompt: Json
          review_status?: Database["public"]["Enums"]["review_status"]
          skill_tags?: string[]
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          code_snippet?: string | null
          content_hash?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: Json
          hint?: Json | null
          id?: string
          is_active?: boolean
          is_challenge_eligible?: boolean
          is_exam_eligible?: boolean
          is_premium?: boolean
          lesson_id?: string
          metadata?: Json
          order_index?: number
          payload?: Json
          prompt?: Json
          review_status?: Database["public"]["Enums"]["review_status"]
          skill_tags?: string[]
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      rewarded_ad_grants: {
        Row: {
          granted_at: string
          id: string
          local_date: string
          reward_type: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          local_date: string
          reward_type: string
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          local_date?: string
          reward_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_activity: {
        Row: {
          created_at: string
          lessons_completed: number
          local_date: string
          qualified: boolean
          questions_answered: number
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          created_at?: string
          lessons_completed?: number
          local_date: string
          qualified?: boolean
          questions_answered?: number
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          created_at?: string
          lessons_completed?: number
          local_date?: string
          qualified?: boolean
          questions_answered?: number
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      user_daily_challenge_claims: {
        Row: {
          completed_at: string
          local_date: string
          question_ids: string[]
          user_id: string
          xp_awarded: number
        }
        Insert: {
          completed_at?: string
          local_date: string
          question_ids?: string[]
          user_id: string
          xp_awarded?: number
        }
        Update: {
          completed_at?: string
          local_date?: string
          question_ids?: string[]
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          entitlement: Database["public"]["Enums"]["entitlement_id"]
          expires_at: string | null
          is_active: boolean
          product_id: string | null
          store: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          entitlement: Database["public"]["Enums"]["entitlement_id"]
          expires_at?: string | null
          is_active?: boolean
          product_id?: string | null
          store?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          entitlement?: Database["public"]["Enums"]["entitlement_id"]
          expires_at?: string | null
          is_active?: boolean
          product_id?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          completed_at: string | null
          is_perfect: boolean
          lesson_id: string
          questions_correct: number
          questions_total: number
          started_at: string
          status: Database["public"]["Enums"]["lesson_progress_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          is_perfect?: boolean
          lesson_id: string
          questions_correct?: number
          questions_total?: number
          started_at?: string
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          is_perfect?: boolean
          lesson_id?: string
          questions_correct?: number
          questions_total?: number
          started_at?: string
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_attempts: {
        Row: {
          attempt_no: number
          context: Database["public"]["Enums"]["answer_context"]
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          submitted_answer: Json | null
          user_id: string
        }
        Insert: {
          attempt_no?: number
          context: Database["public"]["Enums"]["answer_context"]
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          submitted_answer?: Json | null
          user_id: string
        }
        Update: {
          attempt_no?: number
          context?: Database["public"]["Enums"]["answer_context"]
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          submitted_answer?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          last_qualifying_date: string | null
          lessons_completed: number
          lives: number
          lives_updated_at: string
          longest_streak: number
          questions_answered: number
          questions_correct: number
          updated_at: string
          user_id: string
          xp_total: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_qualifying_date?: string | null
          lessons_completed?: number
          lives?: number
          lives_updated_at?: string
          longest_streak?: number
          questions_answered?: number
          questions_correct?: number
          updated_at?: string
          user_id: string
          xp_total?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_qualifying_date?: string | null
          lessons_completed?: number
          lives?: number
          lives_updated_at?: string
          longest_streak?: number
          questions_answered?: number
          questions_correct?: number
          updated_at?: string
          user_id?: string
          xp_total?: number
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          counts_for_leaderboard: boolean
          created_at: string
          id: string
          source_id: string
          source_type: string
          user_id: string
          week_start: string
        }
        Insert: {
          amount: number
          counts_for_leaderboard?: boolean
          created_at?: string
          id?: string
          source_id: string
          source_type: string
          user_id: string
          week_start?: string
        }
        Update: {
          amount?: number
          counts_for_leaderboard?: boolean
          created_at?: string
          id?: string
          source_id?: string
          source_type?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      achievement_rule_met: {
        Args: { p_rule: Json; p_user_id: string }
        Returns: boolean
      }
      age_from_birth_year: { Args: { p_birth_year: number }; Returns: number }
      apply_entitlements: {
        Args: { p_entitlements: Json; p_user_id: string }
        Returns: Json
      }
      award_practice_xp: {
        Args: { p_question_id: string; p_user_id: string }
        Returns: number
      }
      award_xp: {
        Args: {
          p_amount: number
          p_counts_for_leaderboard?: boolean
          p_source_id: string
          p_source_type: string
          p_user_id: string
        }
        Returns: number
      }
      can_access_module: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_daily_challenge: { Args: never; Returns: Json }
      complete_lesson: { Args: { p_lesson_id: string }; Returns: Json }
      config_bool: {
        Args: { p_default: boolean; p_key: string }
        Returns: boolean
      }
      config_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      config_numeric: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      consume_life: {
        Args: {
          p_context: Database["public"]["Enums"]["answer_context"]
          p_user_id: string
        }
        Returns: number
      }
      current_streak_for: { Args: { p_user_id: string }; Returns: number }
      daily_challenge_questions: {
        Args: { p_date: string; p_user_id: string }
        Returns: string[]
      }
      delete_stale_anonymous_users: {
        Args: { p_days?: number }
        Returns: number
      }
      display_name_problem: { Args: { p_name: string }; Returns: string }
      entitlement_state: { Args: { p_user_id: string }; Returns: Json }
      evaluate_achievements: {
        Args: { p_rule_types: string[]; p_user_id: string }
        Returns: Json
      }
      evaluate_streak: { Args: { p_user_id: string }; Returns: number }
      exam_question_set: {
        Args: { p_exam_id: string; p_user_id: string }
        Returns: string[]
      }
      exam_questions: {
        Args: { p_attempt_id: string; p_locale: string }
        Returns: Json
      }
      exam_results: {
        Args: {
          p_attempt_id: string
          p_locale?: string
          p_unlocked?: Json
          p_xp_awarded?: number
        }
        Returns: Json
      }
      exam_unavailable_reason: {
        Args: { p_exam_id: string; p_user_id: string }
        Returns: string
      }
      get_achievements: { Args: { p_locale?: string }; Returns: Json }
      get_app_config: { Args: never; Returns: Json }
      get_daily_challenge: { Args: { p_locale?: string }; Returns: Json }
      get_entitlements: { Args: never; Returns: Json }
      get_exam_overview: { Args: { p_locale?: string }; Returns: Json }
      get_exam_results: {
        Args: { p_attempt_id: string; p_locale?: string }
        Returns: Json
      }
      get_home_summary: { Args: { p_locale?: string }; Returns: Json }
      get_leaderboard: { Args: { p_limit?: number }; Returns: Json }
      get_lesson: {
        Args: { p_lesson_id: string; p_locale?: string }
        Returns: Json
      }
      get_practice_set: {
        Args: { p_locale?: string; p_mode?: string; p_size?: number }
        Returns: Json
      }
      get_progress_summary: { Args: { p_locale?: string }; Returns: Json }
      get_user_stats: { Args: never; Returns: Json }
      grade_answer: {
        Args: { p_question_id: string; p_submitted: Json }
        Returns: boolean
      }
      has_entitlement: {
        Args: {
          p_entitlement: Database["public"]["Enums"]["entitlement_id"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_ad_free: { Args: { p_user_id: string }; Returns: boolean }
      is_minor: { Args: { p_user_id: string }; Returns: boolean }
      iso_week_start: { Args: { p_at?: string }; Returns: string }
      leaderboard_eligible: { Args: { p_user_id: string }; Returns: boolean }
      leaderboard_xp_today: { Args: { p_user_id: string }; Returns: number }
      lives_state: { Args: { p_user_id: string }; Returns: Json }
      local_date_for: {
        Args: { p_at?: string; p_timezone: string }
        Returns: string
      }
      localize_deep: {
        Args: { p_locale?: string; p_value: Json }
        Returns: Json
      }
      localized_text: {
        Args: { p_locale?: string; p_value: Json }
        Returns: string
      }
      mark_billing_event_processed: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      mistake_count: { Args: { p_user_id: string }; Returns: number }
      module_requires_premium: {
        Args: { p_module_id: string }
        Returns: boolean
      }
      normalize_answer_text: {
        Args: {
          p_mode: Database["public"]["Enums"]["answer_match_mode"]
          p_text: string
        }
        Returns: string
      }
      practice_xp_today: { Args: { p_user_id: string }; Returns: number }
      question_xp: {
        Args: { p_attempt_no: number; p_question_id: string }
        Returns: number
      }
      record_billing_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_payload: Json
          p_user_id: string
        }
        Returns: Json
      }
      regenerate_lives: { Args: { p_user_id: string }; Returns: number }
      reject_underage_account: { Args: never; Returns: undefined }
      report_user: {
        Args: { p_note?: string; p_reason: string; p_reported_user_id: string }
        Returns: undefined
      }
      require_auth_uid: { Args: never; Returns: string }
      save_exam_progress: {
        Args: { p_answers: Json; p_attempt_id: string }
        Returns: undefined
      }
      set_display_name: { Args: { p_name: string }; Returns: Json }
      start_exam: {
        Args: { p_exam_id: string; p_locale?: string }
        Returns: Json
      }
      submit_answer: {
        Args: {
          p_answer: Json
          p_context?: Database["public"]["Enums"]["answer_context"]
          p_locale?: string
          p_question_id: string
        }
        Returns: Json
      }
      submit_exam: {
        Args: { p_answers?: Json; p_attempt_id: string; p_locale?: string }
        Returns: Json
      }
      sync_session: {
        Args: { p_timezone?: string }
        Returns: {
          ads_consent_status: string
          analytics_consent: boolean
          avatar_key: string
          birth_year: number | null
          created_at: string
          daily_goal_minutes: number
          display_name: string | null
          experience_level: string | null
          id: string
          is_anonymous: boolean
          last_seen_at: string
          leaderboard_hidden: boolean
          locale: string
          motivation: string | null
          onboarding_completed_at: string | null
          reminder_time: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      touch_daily_activity: {
        Args: {
          p_lessons?: number
          p_questions?: number
          p_user_id: string
          p_xp?: number
        }
        Returns: undefined
      }
      update_profile: {
        Args: { p_patch: Json }
        Returns: {
          ads_consent_status: string
          analytics_consent: boolean
          avatar_key: string
          birth_year: number | null
          created_at: string
          daily_goal_minutes: number
          display_name: string | null
          experience_level: string | null
          id: string
          is_anonymous: boolean
          last_seen_at: string
          leaderboard_hidden: boolean
          locale: string
          motivation: string | null
          onboarding_completed_at: string | null
          reminder_time: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      answer_context: "lesson" | "practice" | "challenge" | "exam"
      answer_match_mode:
        | "exact"
        | "trimmed"
        | "whitespace_insensitive"
        | "case_insensitive"
      difficulty_level: "easy" | "medium" | "hard"
      entitlement_id: "no_ads" | "premium"
      lesson_progress_status: "in_progress" | "completed"
      question_type:
        | "multiple_choice"
        | "multiple_select"
        | "true_false"
        | "predict_output"
        | "fill_blank"
        | "code_ordering"
        | "debugging"
        | "concept_matching"
        | "coding_challenge"
      review_status: "draft" | "reviewed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      answer_context: ["lesson", "practice", "challenge", "exam"],
      answer_match_mode: [
        "exact",
        "trimmed",
        "whitespace_insensitive",
        "case_insensitive",
      ],
      difficulty_level: ["easy", "medium", "hard"],
      entitlement_id: ["no_ads", "premium"],
      lesson_progress_status: ["in_progress", "completed"],
      question_type: [
        "multiple_choice",
        "multiple_select",
        "true_false",
        "predict_output",
        "fill_blank",
        "code_ordering",
        "debugging",
        "concept_matching",
        "coding_challenge",
      ],
      review_status: ["draft", "reviewed"],
    },
  },
} as const

