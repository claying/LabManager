"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { grantSchema, type GrantInput } from "@pi-os/domain";
import type { Person } from "@pi-os/types";
import { GRANT_STATUSES, GRANT_STATUS_LABELS } from "@pi-os/types";
import { useCreateGrant } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Textarea } from "@pi-os/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pi-os/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@pi-os/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { toast } from "@pi-os/ui/components/sonner";
import { PersonSelect } from "../shared/person-select";

const defaultValues: GrantInput = {
  title: "",
  funder: null,
  program: null,
  status: "idea",
  deadline: null,
  start_date: null,
  end_date: null,
  amount: null,
  currency: "USD",
  pi_person_id: null,
  description: null,
  notes: null,
};

export function GrantFormDialog({
  people,
  open,
  onOpenChange,
}: {
  people: Person[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createGrant = useCreateGrant();
  const form = useForm<GrantInput>({ resolver: zodResolver(grantSchema), defaultValues });

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: GrantInput) {
    try {
      await createGrant.mutateAsync(values);
      toast.success("Grant added");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save grant", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New grant</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="NSF CAREER: Structural Foundations of Protein Design"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="funder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funder</FormLabel>
                    <FormControl>
                      <Input placeholder="NSF" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <FormControl>
                      <Input placeholder="CAREER" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRANT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {GRANT_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="1000"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pi_person_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PI</FormLabel>
                    <PersonSelect people={people} value={field.value} onChange={field.onChange} />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGrant.isPending}>
                {createGrant.isPending ? "Saving…" : "Save grant"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
