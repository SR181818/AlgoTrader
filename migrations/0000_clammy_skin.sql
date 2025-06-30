CREATE TABLE "backtests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_name" text NOT NULL,
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"total_return" numeric(10, 4),
	"sharpe_ratio" numeric(10, 4),
	"max_drawdown" numeric(10, 4),
	"win_rate" numeric(10, 4),
	"results" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"strategy_id" integer,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"size" numeric(20, 8) NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"current_price" numeric(20, 8) NOT NULL,
	"pnl" numeric(20, 8) DEFAULT '0',
	"pnl_percent" numeric(10, 4) DEFAULT '0',
	"order_id" text,
	"is_live" boolean DEFAULT false,
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_simulation_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"account_name" text NOT NULL,
	"initial_balance" numeric(18, 8) DEFAULT '10000' NOT NULL,
	"current_balance" numeric(18, 8) DEFAULT '10000' NOT NULL,
	"total_pnl" numeric(18, 8) DEFAULT '0' NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"win_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_simulation_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"account_id" integer,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"order_type" text NOT NULL,
	"amount" text NOT NULL,
	"price" text,
	"stop_price" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"filled_quantity" text DEFAULT '0' NOT NULL,
	"filled_price" text,
	"fees" text DEFAULT '0' NOT NULL,
	"pnl" text,
	"strategy_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"filled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "live_simulation_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"account_id" integer,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"amount" text NOT NULL,
	"entry_price" text NOT NULL,
	"exit_price" text,
	"exit_time" timestamp,
	"status" text DEFAULT 'open' NOT NULL,
	"unrealized_pnl" text DEFAULT '0' NOT NULL,
	"realized_pnl" text DEFAULT '0' NOT NULL,
	"strategy_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"strategy_id" integer,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"order_id" text,
	"status" text DEFAULT 'filled',
	"is_live" boolean DEFAULT false,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_trading_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"currency" text NOT NULL,
	"balance" numeric(18, 8) DEFAULT '0' NOT NULL,
	"locked_balance" numeric(18, 8) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_trading_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"trade_id" text NOT NULL,
	"currency" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"balance_after" numeric(18, 8) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_data_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"price" numeric(18, 8) NOT NULL,
	"volume" numeric(18, 8) NOT NULL,
	"change_24h" numeric(8, 4) NOT NULL,
	"high_24h" numeric(18, 8) NOT NULL,
	"low_24h" numeric(18, 8) NOT NULL,
	"last_update" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"stop_loss" numeric(10, 4),
	"take_profit" numeric(10, 4),
	"risk_percentage" numeric(10, 4),
	"max_positions" integer DEFAULT 1,
	"entry_conditions" text,
	"exit_conditions" text,
	"is_active" boolean DEFAULT false,
	"total_trades" integer DEFAULT 0,
	"win_rate" numeric(10, 4) DEFAULT '0',
	"pnl" numeric(18, 8) DEFAULT '0',
	"max_drawdown" numeric(10, 4) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"price" numeric(18, 8) NOT NULL,
	"pnl" numeric(18, 8) DEFAULT '0',
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"algorand_address" text,
	"binance_api_key" text,
	"binance_api_secret" text,
	"is_paid_user" boolean DEFAULT false NOT NULL,
	"login_type" text DEFAULT 'traditional' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_algorand_address_unique" UNIQUE("algorand_address")
);
--> statement-breakpoint
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_positions" ADD CONSTRAINT "live_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_positions" ADD CONSTRAINT "live_positions_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_simulation_accounts" ADD CONSTRAINT "live_simulation_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_simulation_orders" ADD CONSTRAINT "live_simulation_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_simulation_orders" ADD CONSTRAINT "live_simulation_orders_account_id_live_simulation_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."live_simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_simulation_orders" ADD CONSTRAINT "live_simulation_orders_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_simulation_positions" ADD CONSTRAINT "live_simulation_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_simulation_positions" ADD CONSTRAINT "live_simulation_positions_account_id_live_simulation_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."live_simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_simulation_positions" ADD CONSTRAINT "live_simulation_positions_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_trades" ADD CONSTRAINT "live_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_trades" ADD CONSTRAINT "live_trades_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_trading_balances" ADD CONSTRAINT "manual_trading_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_trading_transactions" ADD CONSTRAINT "manual_trading_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;