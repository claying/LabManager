import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, Github, GraduationCap, MessageCircle, Pencil, Star } from "lucide-react";
import { usePerson, usePersonProfile, useIsFavorite, useToggleFavorite } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";
import {
  HealthBadge,
  MilestoneStatusBadge,
  PublicationStatusBadge,
} from "@pi-os/ui/components/domain/status-badge";
import { TopBar } from "../components/app-shell/topbar";
import { PersonFormDialog } from "../components/people/person-form-dialog";
import { OneOnOneDialog } from "../components/people/one-on-one-dialog";
import { AlumniContinuityCard } from "../components/people/alumni-continuity-card";
import { RelatedSummary } from "../components/shared/related-summary";
import { usePersonRelated } from "@pi-os/repositories";
import { openExternalLink } from "../lib/native/links";

export default function PersonProfilePage() {
  const { id = "" } = useParams();
  const { data: person, isLoading } = usePerson(id);
  const { data: profile } = usePersonProfile(id);
  const { data: related } = usePersonRelated(id);
  const isFavorite = useIsFavorite("person", id);
  const toggleFavorite = useToggleFavorite();
  const [editOpen, setEditOpen] = useState(false);
  const [oneOnOneOpen, setOneOnOneOpen] = useState(false);

  if (isLoading || !person) {
    return (
      <>
        <TopBar />
        <main className="flex-1 space-y-4 p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar>
        <p className="text-foreground truncate text-sm font-medium">{person.name}</p>
      </TopBar>
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PersonAvatar name={person.name} avatarUrl={person.avatar_url} size="lg" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-foreground text-2xl font-semibold">{person.name}</h1>
                <Badge variant="secondary">{person.role}</Badge>
                {person.status !== "active" && (
                  <Badge variant="muted" className="capitalize">
                    {person.status}
                  </Badge>
                )}
              </div>
              {person.bio && <p className="text-muted-foreground max-w-xl text-sm">{person.bio}</p>}
              <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                {person.start_date && (
                  <span>
                    Started{" "}
                    {new Date(person.start_date).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
                {person.expected_graduation && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> Expected{" "}
                    {new Date(person.expected_graduation).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                {person.github_url && (
                  <button
                    onClick={() => openExternalLink(person.github_url!)}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                  >
                    <Github className="h-3.5 w-3.5" /> GitHub <ExternalLink className="h-3 w-3" />
                  </button>
                )}
                {person.google_scholar_url && (
                  <button
                    onClick={() => openExternalLink(person.google_scholar_url!)}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                  >
                    Scholar <ExternalLink className="h-3 w-3" />
                  </button>
                )}
                {person.website_url && (
                  <button
                    onClick={() => openExternalLink(person.website_url!)}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => toggleFavorite.mutate({ entityType: "person", entityId: person.id })}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className="text-muted-foreground hover:text-warning p-1.5"
            >
              <Star className={isFavorite ? "fill-warning text-warning h-4 w-4" : "h-4 w-4"} />
            </button>
            <Button size="sm" onClick={() => setOneOnOneOpen(true)}>
              <MessageCircle className="h-3.5 w-3.5" /> Start 1:1
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </div>

        <RelatedSummary data={related} />

        {person.status === "alumni" && <AlumniContinuityCard personId={person.id} />}

        {(person.research_interests.length > 0 || person.skills.length > 0) && (
          <div className="flex flex-wrap gap-6">
            {person.research_interests.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Research interests
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {person.research_interests.map((i) => (
                    <Badge key={i} variant="secondary">
                      {i}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {person.skills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {person.skills.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title={`Active Projects (${profile?.activeProjects.length ?? 0})`}>
            {profile?.activeProjects.length ? (
              profile.activeProjects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-2 py-1.5 text-sm hover:underline"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {profile.ledProjects.some((lp) => lp.id === p.id) && (
                      <Star className="text-warning h-3 w-3 shrink-0" />
                    )}
                    {p.title}
                  </span>
                  <HealthBadge health={p.health} />
                </Link>
              ))
            ) : (
              <EmptyRow text="No active projects." />
            )}
          </SectionCard>

          <SectionCard title={`Publications (${profile?.publications.length ?? 0})`}>
            {profile?.publications.length ? (
              profile.publications.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="truncate">{p.title}</span>
                  <PublicationStatusBadge status={p.status} />
                </div>
              ))
            ) : (
              <EmptyRow text="No publications yet." />
            )}
          </SectionCard>

          <SectionCard title={`Upcoming Milestones (${profile?.upcomingMilestones.length ?? 0})`}>
            {profile?.upcomingMilestones.length ? (
              profile.upcomingMilestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="truncate">{m.title}</span>
                  <MilestoneStatusBadge status={m.status} />
                </div>
              ))
            ) : (
              <EmptyRow text="No upcoming milestones." />
            )}
          </SectionCard>

          <SectionCard title={`Action Items (${profile?.actionItems.length ?? 0})`}>
            {profile?.actionItems.length ? (
              profile.actionItems.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="truncate">{a.title}</span>
                  <span className="text-muted-foreground text-xs capitalize">
                    {a.status.replace("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <EmptyRow text="No action items assigned." />
            )}
          </SectionCard>

          <SectionCard title={`Recent Meetings (${profile?.recentMeetings.length ?? 0})`}>
            {profile?.recentMeetings.length ? (
              profile.recentMeetings.slice(0, 6).map((m) => (
                <div key={m.id} className="py-1.5 text-sm">
                  <p className="truncate">{m.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(m.meeting_date).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <EmptyRow text="No recent meetings." />
            )}
          </SectionCard>

          <SectionCard title={`Recent Updates (${profile?.recentUpdates.length ?? 0})`}>
            {profile?.recentUpdates.length ? (
              profile.recentUpdates.slice(0, 6).map((u) => (
                <Link
                  key={u.id}
                  to={`/projects/${u.project_id}`}
                  className="block py-1.5 text-sm hover:underline"
                >
                  <p className="truncate">{u.summary}</p>
                  <p className="text-muted-foreground text-xs">
                    {u.project_title} · {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyRow text="No updates posted." />
            )}
          </SectionCard>
        </div>
      </main>

      <PersonFormDialog person={person} open={editOpen} onOpenChange={setEditOpen} />
      <OneOnOneDialog person={person} open={oneOnOneOpen} onOpenChange={setOneOnOneOpen} />
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <h3 className="text-foreground mb-2 text-sm font-semibold">{title}</h3>
        <div className="divide-border divide-y">{children}</div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-muted-foreground py-3 text-sm">{text}</p>;
}
