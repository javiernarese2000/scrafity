"use server";

import { articles, db } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function setArchivada(id: string, archivada: boolean) {
  await db
    .update(articles)
    .set({ archivada, updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${id}`);
}

export async function setTags(id: string, tags: string[]) {
  await db
    .update(articles)
    .set({ tags, updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${id}`);
}
