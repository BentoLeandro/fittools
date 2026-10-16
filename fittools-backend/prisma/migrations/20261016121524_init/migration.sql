-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active');

-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('weight_loss', 'maintenance', 'muscle_gain', 'athletic_performance');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_health_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "height_cm" DECIMAL(5,2),
    "age" INTEGER,
    "sex" "Sex",
    "activity_level" "ActivityLevel",
    "fitness_goal" "FitnessGoal",
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_health_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_health_profiles_user_id_key" ON "user_health_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "user_health_profiles" ADD CONSTRAINT "user_health_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraints (o Prisma nao declara CHECK no schema.prisma; adicionados manualmente)
-- Colunas sao nullable (perfil pode ser parcial), por isso cada CHECK aceita NULL.
ALTER TABLE "user_health_profiles"
  ADD CONSTRAINT "chk_weight_kg" CHECK ("weight_kg" IS NULL OR ("weight_kg" >= 30 AND "weight_kg" <= 300)),
  ADD CONSTRAINT "chk_height_cm" CHECK ("height_cm" IS NULL OR ("height_cm" >= 120 AND "height_cm" <= 230)),
  ADD CONSTRAINT "chk_age" CHECK ("age" IS NULL OR ("age" >= 14 AND "age" <= 100));
