-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "productionUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_options" (
    "projectId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_options_pkey" PRIMARY KEY ("projectId","optionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_shareToken_key" ON "projects"("shareToken");

-- CreateIndex
CREATE INDEX "projects_productionUserId_idx" ON "projects"("productionUserId");

-- CreateIndex
CREATE INDEX "project_options_optionId_idx" ON "project_options"("optionId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_productionUserId_fkey" FOREIGN KEY ("productionUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_options" ADD CONSTRAINT "project_options_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_options" ADD CONSTRAINT "project_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
