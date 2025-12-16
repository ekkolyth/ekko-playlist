-- +goose Up
-- +goose StatementBegin
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	"name" text NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"token_prefix" text NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"expires_at" timestamptz,
	"last_used_at" timestamptz
);

CREATE INDEX idx_api_tokens_user_id ON "api_tokens"(user_id);
CREATE INDEX idx_api_tokens_token_hash ON "api_tokens"(token_hash);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "api_tokens";
-- +goose StatementEnd


