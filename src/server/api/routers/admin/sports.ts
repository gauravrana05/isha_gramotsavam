import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { db } from "@/lib/db";

export const adminSportsRouter = createTRPCRouter({
  getAllSports: protectedProcedure.query(async () => {
    const sports = await db.sport.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return sports;
  }),
});
