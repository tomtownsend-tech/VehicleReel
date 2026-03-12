-- CreateTable
CREATE TABLE "deletion_logs" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "reasonCategory" TEXT NOT NULL,
    "reasonText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deletion_logs_pkey" PRIMARY KEY ("id")
);
