"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { invitePlayerToTeam } from "@/lib/teams/membership";

interface SearchResult {
  id: string;
  name: string;
  profile_image_url: string | null;
}

interface InvitePlayerFormProps {
  teamId: string;
  existingMemberIds: string[];
}

export function InvitePlayerForm({
  teamId,
  existingMemberIds,
}: InvitePlayerFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      const supabase = createClient();
      const { data, error: searchError } = await supabase.rpc(
        "search_profiles_for_invite",
        { p_query: query.trim() }
      );

      if (searchError) {
        setError(searchError.message);
        setResults([]);
      } else {
        setResults((data as SearchResult[]) ?? []);
      }

      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  async function handleInvite(playerId: string, playerName: string) {
    setInvitingId(playerId);
    setError(null);
    setSuccess(null);

    const { error: inviteError } = await invitePlayerToTeam(
      createClient(),
      teamId,
      playerId
    );

    if (inviteError) {
      setError(inviteError.message);
      setInvitingId(null);
      return;
    }

    setSuccess(`Invited ${playerName}.`);
    setInvitingId(null);
    router.refresh();
  }

  const existingIds = new Set(existingMemberIds);

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="player-search" className="sr-only">
          Search players by name
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="player-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players by name..."
          className="pl-9"
          autoComplete="off"
          aria-busy={isSearching}
        />
      </div>

      {isSearching ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </p>
      ) : null}

      {query.trim().length >= 2 && !isSearching && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players found.</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {results.map((player) => {
            const alreadyMember = existingIds.has(player.id);

            return (
              <li
                key={player.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{player.name}</span>
                <Button
                  size="sm"
                  variant={alreadyMember ? "secondary" : "default"}
                  disabled={alreadyMember || invitingId !== null}
                  onClick={() => handleInvite(player.id, player.name)}
                >
                  {invitingId === player.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <UserPlus />
                  )}
                  {alreadyMember ? "On team" : "Invite"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-muted-foreground" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
