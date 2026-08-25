"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { personSchema, type PersonInput } from "@pi-os/domain";
import type { Person } from "@pi-os/types";
import { PERSON_ROLES, PERSON_STATUSES } from "@pi-os/types";
import { useCreatePerson, useUpdatePerson } from "@pi-os/repositories";
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

function defaultsFor(person?: Person): PersonInput {
  return {
    name: person?.name ?? "",
    email: person?.email ?? null,
    role: person?.role ?? "PhD",
    status: person?.status ?? "active",
    start_date: person?.start_date ?? null,
    end_date: person?.end_date ?? null,
    expected_graduation: person?.expected_graduation ?? null,
    research_interests: person?.research_interests ?? [],
    skills: person?.skills ?? [],
    bio: person?.bio ?? null,
    website_url: person?.website_url ?? null,
    github_url: person?.github_url ?? null,
    google_scholar_url: person?.google_scholar_url ?? null,
    notes: person?.notes ?? null,
  };
}

export function PersonFormDialog({
  person,
  open,
  onOpenChange,
}: {
  person?: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const isEdit = Boolean(person);

  const form = useForm<PersonInput>({
    resolver: zodResolver(personSchema),
    defaultValues: defaultsFor(person),
  });

  useEffect(() => {
    if (open) form.reset(defaultsFor(person));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person]);

  async function onSubmit(values: PersonInput) {
    try {
      if (isEdit && person) {
        await updatePerson.mutateAsync({ personId: person.id, patch: values });
        toast.success("Person updated");
      } else {
        await createPerson.mutateAsync(values);
        toast.success("Person added");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save person", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const pending = createPerson.isPending || updatePerson.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit person" : "Add person"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Alice Kim" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERSON_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
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
                        {PERSON_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expected_graduation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected graduation</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="research_interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Research interests (comma separated)</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value.join(", ")}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="protein design, generative models"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
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
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : isEdit ? "Save changes" : "Add person"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
