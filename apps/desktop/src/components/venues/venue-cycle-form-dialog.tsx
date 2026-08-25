"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { venueCycleSchema, type VenueCycleInput } from "@pi-os/domain";
import { useVenues, useCreateVenueCycle } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
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
import { Plus } from "lucide-react";
import { VenueFormDialog } from "./venue-form-dialog";
import type { VenueCycleWithVenue } from "@pi-os/types";

const DEADLINE_FIELDS: { name: keyof VenueCycleInput; label: string }[] = [
  { name: "abstract_deadline", label: "Abstract deadline" },
  { name: "submission_deadline", label: "Submission deadline" },
  { name: "notification_date", label: "Notification date" },
  { name: "camera_ready_date", label: "Camera-ready date" },
];

export function VenueCycleFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (cycle: VenueCycleWithVenue) => void;
}) {
  const { data: venues = [] } = useVenues();
  const createCycle = useCreateVenueCycle();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);

  const form = useForm<VenueCycleInput>({
    resolver: zodResolver(venueCycleSchema),
    defaultValues: {
      cycle_label: "",
      abstract_deadline: null,
      submission_deadline: null,
      rebuttal_start: null,
      rebuttal_end: null,
      notification_date: null,
      camera_ready_date: null,
      event_start: null,
      event_end: null,
    },
  });

  async function onSubmit(values: VenueCycleInput) {
    if (!venueId) {
      toast.error("Choose a venue first");
      return;
    }
    try {
      const cycle = await createCycle.mutateAsync({ ...values, venue_id: venueId });
      const venue = venues.find((v) => v.id === venueId)!;
      toast.success("Venue cycle added");
      form.reset();
      onOpenChange(false);
      onCreated?.({
        ...cycle,
        venue: {
          id: venue.id,
          name: venue.name,
          short_name: venue.short_name,
          category: venue.category,
        },
      });
    } catch (error) {
      toast.error("Couldn't add venue cycle", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New venue cycle</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <FormLabel>Venue</FormLabel>
                <div className="flex items-center gap-2">
                  <Select value={venueId ?? undefined} onValueChange={setVenueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.short_name ?? v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setVenueDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <FormField
                control={form.control}
                name="cycle_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cycle</FormLabel>
                    <FormControl>
                      <Input placeholder="2027" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                {DEADLINE_FIELDS.map(({ name, label }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">{label}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={(field.value as string) ?? ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCycle.isPending}>
                  {createCycle.isPending ? "Saving…" : "Add cycle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <VenueFormDialog
        open={venueDialogOpen}
        onOpenChange={setVenueDialogOpen}
        onCreated={(v) => setVenueId(v.id)}
      />
    </>
  );
}
