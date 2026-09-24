-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "ai_chat_sessions" DROP CONSTRAINT "ai_chat_sessions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_chat_messages" DROP CONSTRAINT "ai_chat_messages_session_id_fkey";

-- DropTable
DROP TABLE "ai_chat_sessions";

-- DropTable
DROP TABLE "ai_chat_messages";

-- DropEnum
DROP TYPE "MessageRole";

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "parts" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_checkpoints" (
    "thread_id" TEXT NOT NULL,
    "checkpoint_ns" TEXT NOT NULL DEFAULT '',
    "checkpoint_id" TEXT NOT NULL,
    "parent_checkpoint_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "checkpoint" BYTEA NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_checkpoints_pkey" PRIMARY KEY ("thread_id","checkpoint_ns","checkpoint_id")
);

-- CreateTable
CREATE TABLE "ai_checkpoint_writes" (
    "thread_id" TEXT NOT NULL,
    "checkpoint_ns" TEXT NOT NULL DEFAULT '',
    "checkpoint_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" BYTEA NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "ai_checkpoint_writes_pkey" PRIMARY KEY ("thread_id","checkpoint_ns","checkpoint_id","task_id","idx")
);

-- CreateIndex
CREATE INDEX "ai_conversations_tenant_id_user_id_last_message_at_idx" ON "ai_conversations"("tenant_id", "user_id", "last_message_at");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_checkpoints_tenant_id_idx" ON "ai_checkpoints"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_checkpoint_writes_tenant_id_idx" ON "ai_checkpoint_writes"("tenant_id");

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

