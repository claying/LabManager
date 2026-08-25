"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { venueSchema, type VenueInput } from "@pi-os/domain";
import { VENUE_CATEGORIES, VENUE_CATEGORY_LABELS } from "@pi-os/types";
import { useCreateVenue } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pi-os/ui/components/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@pi-os/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { toast } from "@pi-os/ui/components/sonner";
import type { Venue } from "@pi-os/types";

export function VenueFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (venue: Venue) => void;
}) {
  const createVenue = useCreateVenue();
  const form = useForm<VenueInput>({
    resolver: zodResolver(venueSchema),
    defaultValues: {
      name: "",
      short_name: null,
      category: "conference",
      website_url: null,
      notes: null,
    },
  });

  async function onSubmit(values: VenueInput) {
    try {
      const venue = await createVenue.mutateAsync(values);
      toast.success("Venue added");
      form.reset({
        name: "",
        short_name: null,
        category: "conference",
        website_url: null,
        notes: null,
      });
      onOpenChange(false);
      onCreated?.(venue);
    } catch (error) {
      toast.error("Couldn't add venue", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New venue</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="International Conference on Learning Representations"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="short_name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="ICLR" {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {VENUE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVenue.isPending}>
                {createVenue.isPending ? "Saving…" : "Add venue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
