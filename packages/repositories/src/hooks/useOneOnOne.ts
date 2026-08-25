import { useQuery } from "@tanstack/react-query";
import { getOneOnOnePrepData } from "../repositories/oneOnOneRepository";

export function useOneOnOnePrep(personId: string | undefined) {
  return useQuery({
    queryKey: ["one-on-one", "prep", personId ?? ""],
    queryFn: () => getOneOnOnePrepData(personId as string),
    enabled: Boolean(personId),
  });
}
