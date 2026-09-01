import Link from "next/link";
import { MapPin, Shield, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatSportLabel,
  getSkillLevelLabel,
  getTeamTypeLabel,
} from "@/lib/teams/parse";
import type { Team, TeamMemberStatus } from "@/lib/types/team";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  team: Team;
  membershipStatus?: TeamMemberStatus | null;
  isOwnTeam?: boolean;
  canChallenge?: boolean;
}

export function TeamCard({
  team,
  membershipStatus = null,
  isOwnTeam = false,
  canChallenge = false,
}: TeamCardProps) {
  const isActiveMember = membershipStatus === "active" || isOwnTeam;
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {team.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logo_url}
                alt={`${team.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <Shield className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg leading-tight">{team.name}</CardTitle>
            <CardDescription className="mt-1 capitalize">
              {formatSportLabel(team.sport)}
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
            {getTeamTypeLabel(team.team_type)}
          </span>
          <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
            {getSkillLevelLabel(team.skill_level)}
          </span>
          {isActiveMember ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Your team
            </span>
          ) : membershipStatus === "pending" ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Request pending
            </span>
          ) : membershipStatus === "invited" ? (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Invited
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{team.location ?? "Location not specified"}</span>
          </div>
          <p className={cn("line-clamp-3 text-sm text-muted-foreground")}>
            {team.description ?? "No description provided yet."}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/teams/${team.id}`}>View team</Link>
          </Button>
          {isActiveMember ? (
            <Button variant="secondary" size="sm" className="flex-1" disabled>
              Your team
            </Button>
          ) : membershipStatus === "pending" || membershipStatus === "invited" ? (
            <Button asChild variant="secondary" size="sm" className="flex-1">
              <Link href={`/teams/${team.id}`}>View status</Link>
            </Button>
          ) : canChallenge ? (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/teams/${team.id}?intent=challenge#challenge-form`}>
                <Swords />
                Challenge
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
