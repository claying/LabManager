import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeetingUpdatePatch } from "@pi-os/types";
import type { MeetingInput } from "@pi-os/domain";
import { queryKeys } from "./queryKeys";
import { meetingRepository } from "../repositories/meetingRepository";

export function useMeetings(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.meetings.list(projectId),
    queryFn: () => meetingRepository.list({ projectId }),
  });
}

export function useMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.meetings.detail(meetingId ?? ""),
    queryFn: () => meetingRepository.get(meetingId as string),
    enabled: Boolean(meetingId),
  });
}

export function useCreateMeeting(createdBy: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeetingInput) => meetingRepository.create(createdBy, input),
    onSuccess: (meeting) => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      void qc.invalidateQueries({ queryKey: queryKeys.inbox });
      if (meeting.project_id) {
        void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(meeting.project_id) });
        void qc.invalidateQueries({ queryKey: queryKeys.timeline(meeting.project_id) });
      }
    },
  });
}

export function useUpdateMeeting(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: MeetingUpdatePatch) => meetingRepository.update(meetingId, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(meetingId) });
      void qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useSetMeetingAttendees(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personIds: string[]) => meetingRepository.setAttendees(meetingId, personIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(meetingId) });
      void qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => meetingRepository.remove(meetingId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
