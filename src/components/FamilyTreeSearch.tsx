import { useState } from "react";
import {
  Search,
  X,
  Users,
  BookOpen,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import {
  useFamilySearch,
  type SearchCategory,
} from "~/hooks/useFamilySearch";
import type {
  MemberSearchResult,
  StorySearchResult,
  EventSearchResult,
} from "~/data-access/family-search";

interface FamilyTreeSearchProps {
  familyTreeId: string;
  onMemberSelect?: (memberId: string) => void;
}

/**
 * Full-text search component for family tree members, stories, and events
 * Renders in a dialog with category filters and pagination
 */
export function FamilyTreeSearch({
  familyTreeId,
  onMemberSelect,
}: FamilyTreeSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    query,
    debouncedQuery,
    category,
    data,
    isLoading,
    isFetching,
    totalResults,
    isEmpty,
    hasNextPage,
    hasPrevPage,
    setQuery,
    setCategory,
    nextPage,
    prevPage,
    clearFilters,
  } = useFamilySearch({
    familyTreeId,
    debounceMs: 300,
  });

  const handleMemberClick = (memberId: string) => {
    if (onMemberSelect) {
      onMemberSelect(memberId);
      setIsOpen(false);
    }
  };

  const categories: { value: SearchCategory; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <Search className="h-3.5 w-3.5" /> },
    { value: "members", label: "Members", icon: <Users className="h-3.5 w-3.5" /> },
    { value: "stories", label: "Stories", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { value: "events", label: "Events", icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Family Tree</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members, stories, events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {query && (
              <button
                onClick={() => clearFilters()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat.value)}
                className="gap-1.5"
              >
                {cat.icon}
                {cat.label}
                {data && cat.value !== "all" && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-1 h-5 min-w-5 px-1.5 text-xs",
                      category === cat.value && "bg-primary-foreground/20"
                    )}
                  >
                    {cat.value === "members" && data.totalMembers}
                    {cat.value === "stories" && data.totalStories}
                    {cat.value === "events" && data.totalEvents}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
            {/* Loading State */}
            {(isLoading || isFetching) && debouncedQuery && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty State */}
            {isEmpty && !isLoading && !isFetching && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No results found for "{debouncedQuery}"
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Try different keywords or search categories
                </p>
              </div>
            )}

            {/* Initial State */}
            {!debouncedQuery && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Start typing to search your family tree
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Search across members, stories, and events
                </p>
              </div>
            )}

            {/* Results List */}
            {data && !isLoading && !isFetching && debouncedQuery && (
              <>
                {/* Members */}
                {(category === "all" || category === "members") &&
                  data.members.length > 0 && (
                    <div className="space-y-2">
                      {category === "all" && (
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Members ({data.totalMembers})
                        </h3>
                      )}
                      {data.members.map((member) => (
                        <MemberResultCard
                          key={member.id}
                          member={member}
                          onClick={() => handleMemberClick(member.id)}
                        />
                      ))}
                    </div>
                  )}

                {/* Stories */}
                {(category === "all" || category === "stories") &&
                  data.stories.length > 0 && (
                    <div className="space-y-2">
                      {category === "all" && (
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Stories ({data.totalStories})
                        </h3>
                      )}
                      {data.stories.map((story) => (
                        <StoryResultCard key={story.id} story={story} />
                      ))}
                    </div>
                  )}

                {/* Events */}
                {(category === "all" || category === "events") &&
                  data.events.length > 0 && (
                    <div className="space-y-2">
                      {category === "all" && (
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Events ({data.totalEvents})
                        </h3>
                      )}
                      {data.events.map((event) => (
                        <EventResultCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
              </>
            )}
          </div>

          {/* Pagination */}
          {data && totalResults > 0 && (hasNextPage || hasPrevPage) && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {totalResults} result{totalResults !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Card component for member search results
 */
function MemberResultCard({
  member,
  onClick,
}: {
  member: MemberSearchResult;
  onClick?: () => void;
}) {
  const fullName = [member.firstName, member.middleName, member.lastName]
    .filter(Boolean)
    .join(" ");

  const dates = [
    member.birthDate && `b. ${member.birthDate}`,
    member.deathDate && `d. ${member.deathDate}`,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            {member.profileImageUrl ? (
              <img
                src={member.profileImageUrl}
                alt={fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{fullName}</p>
              {member.nickname && (
                <Badge variant="secondary" className="text-xs">
                  "{member.nickname}"
                </Badge>
              )}
            </div>
            {dates && (
              <p className="text-sm text-muted-foreground">{dates}</p>
            )}
            {/* Headline with highlighted matches */}
            {member.headline && (
              <p
                className="text-sm text-muted-foreground mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: member.headline }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card component for story search results
 */
function StoryResultCard({ story }: { story: StorySearchResult }) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{story.title}</p>
              <Badge variant="outline" className="text-xs">
                {story.storyType}
              </Badge>
            </div>
            {story.eventDate && (
              <p className="text-sm text-muted-foreground">{story.eventDate}</p>
            )}
            {/* Headline with highlighted matches */}
            {story.headline && (
              <p
                className="text-sm text-muted-foreground mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: story.headline }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card component for event search results
 */
function EventResultCard({ event }: { event: EventSearchResult }) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{event.title}</p>
              <Badge variant="outline" className="text-xs">
                {event.eventType}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(event.eventDate || event.eventYear) && (
                <span>{event.eventDate || event.eventYear}</span>
              )}
              {event.location && (
                <>
                  <span>-</span>
                  <span className="truncate">{event.location}</span>
                </>
              )}
            </div>
            {/* Headline with highlighted matches */}
            {event.headline && (
              <p
                className="text-sm text-muted-foreground mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: event.headline }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
