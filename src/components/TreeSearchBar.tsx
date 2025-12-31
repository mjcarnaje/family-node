import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { Search, X, User, MapPin } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { FamilyMember } from "~/db/schema";

interface TreeSearchBarProps {
  allMembers: FamilyMember[];
  onMemberSelect: (memberId: string) => void;
  className?: string;
}

interface SearchResult {
  member: FamilyMember;
  matchField: "name" | "nickname" | "location";
  matchText: string;
}

// Fuzzy search function that matches partial strings case-insensitively
function fuzzySearch(query: string, text: string): boolean {
  if (!query || !text) return false;
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  return textLower.includes(queryLower);
}

// Get full display name
function getFullName(member: FamilyMember): string {
  const parts = [member.firstName];
  if (member.middleName) parts.push(member.middleName);
  parts.push(member.lastName);
  return parts.join(" ");
}

export function TreeSearchBar({
  allMembers,
  onMemberSelect,
  className,
}: TreeSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  // Search through members and return matches with match field info
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];

    const results: SearchResult[] = [];
    const query = searchQuery.trim();

    for (const member of allMembers) {
      // Check full name
      const fullName = getFullName(member);
      if (fuzzySearch(query, fullName)) {
        results.push({
          member,
          matchField: "name",
          matchText: fullName,
        });
        continue;
      }

      // Check nickname
      if (member.nickname && fuzzySearch(query, member.nickname)) {
        results.push({
          member,
          matchField: "nickname",
          matchText: member.nickname,
        });
        continue;
      }

      // Check birth place
      if (member.birthPlace && fuzzySearch(query, member.birthPlace)) {
        results.push({
          member,
          matchField: "location",
          matchText: member.birthPlace,
        });
        continue;
      }
    }

    // Sort results: name matches first, then nickname, then location
    const sortOrder = { name: 0, nickname: 1, location: 2 };
    results.sort((a, b) => sortOrder[a.matchField] - sortOrder[b.matchField]);

    return results.slice(0, 10); // Limit to 10 results
  }, [searchQuery, allMembers]);

  // Handle selecting a member from search results
  const handleSelectMember = useCallback(
    (memberId: string) => {
      // Clear search
      setSearchQuery("");
      setIsOpen(false);
      setSelectedIndex(0);

      // Notify parent to set focus member
      onMemberSelect(memberId);

      // Zoom to the selected node
      const node = reactFlowInstance.getNode(memberId);
      if (node) {
        // Center and zoom to the node with animation
        reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 100, {
          zoom: 1.2,
          duration: 500,
        });
      }
    },
    [onMemberSelect, reactFlowInstance]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || searchResults.length === 0) {
        if (event.key === "Escape") {
          setSearchQuery("");
          setIsOpen(false);
          inputRef.current?.blur();
        }
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelectMember(searchResults[selectedIndex].member.id);
          }
          break;
        case "Escape":
          event.preventDefault();
          setSearchQuery("");
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, searchResults, selectedIndex, handleSelectMember]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
      setIsOpen(true);
      setSelectedIndex(0);
    },
    []
  );

  // Handle clear button
  const handleClear = useCallback(() => {
    setSearchQuery("");
    setIsOpen(false);
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const selectedItem = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedItem?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  // Get gender-based styling
  const getGenderColor = (gender: string | null) => {
    switch (gender) {
      case "male":
        return "bg-blue-500";
      case "female":
        return "bg-pink-500";
      default:
        return "bg-purple-500";
    }
  };

  // Get match icon
  const getMatchIcon = (matchField: SearchResult["matchField"]) => {
    switch (matchField) {
      case "nickname":
        return <span className="text-[10px] italic">""</span>;
      case "location":
        return <MapPin className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3",
        className
      )}
      data-testid="tree-search-bar"
    >
      <div className="flex items-center gap-2 mb-2">
        <Search className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Search Members
        </h3>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search by name, nickname..."
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery && setIsOpen(true)}
            className="h-8 pl-8 pr-8 text-xs"
            data-testid="tree-search-input"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              title="Clear search"
              data-testid="tree-search-clear"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search results dropdown */}
        {isOpen && searchQuery && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg max-h-60 overflow-y-auto"
            data-testid="tree-search-results"
          >
            {searchResults.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No members found
              </div>
            ) : (
              <ul className="py-1">
                {searchResults.map((result, index) => (
                  <li
                    key={result.member.id}
                    data-index={index}
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10 dark:bg-primary/20"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                    onClick={() => handleSelectMember(result.member.id)}
                    data-testid={`tree-search-result-${result.member.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          getGenderColor(result.member.gender)
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {result.member.firstName} {result.member.lastName}
                        </div>
                        {result.matchField !== "name" && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            {getMatchIcon(result.matchField)}
                            <span className="truncate">
                              {result.matchField === "nickname"
                                ? `"${result.matchText}"`
                                : result.matchText}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Keyboard navigation hint */}
            {searchResults.length > 0 && (
              <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 flex items-center gap-2">
                <span>
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px]">
                    ↑↓
                  </kbd>{" "}
                  to navigate
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px]">
                    Enter
                  </kbd>{" "}
                  to select
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px]">
                    Esc
                  </kbd>{" "}
                  to close
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
