import "server-only";
import prisma from "@/config/prisma";

export type ManagerSummary = {
  id: string;
  name: string;
  title: string;
  chiefId: string | null;
  departments: {
    id: string;
    name: string;
  }[];
};

export async function getManagers(): Promise<ManagerSummary[]> {
  return prisma.manager.findMany({
    select: {
      id: true,
      name: true,
      title: true,
      chiefId: true,
      departments: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}