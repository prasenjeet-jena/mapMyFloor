import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, X } from 'lucide-react';
import Fuse from 'fuse.js';
import { Room, RoomType } from '../../shared/types';

interface SearchBarProps {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
}

const getBadgeStyles = (type: RoomType) => {
  switch (type) {
    case RoomType.RECEPTION:
    case RoomType.LOBBY:
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case RoomType.MEETING_ROOM:
    case RoomType.CONFERENCE_ROOM:
    case RoomType.BOARDROOM:
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case RoomType.DESK_AREA:
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case RoomType.CAFETERIA:
    case RoomType.PANTRY:
    case RoomType.RECREATION:
      return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    case RoomType.RESTROOM:
      return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};

const formatRoomType = (type: RoomType) => {
  return type.replace('_', ' ');
};

export default function SearchBar({ rooms, onSelectRoom }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Room[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Fuse.js for fuzzy searching
  const fuse = useMemo(() => {
    return new Fuse(rooms, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'type', weight: 0.3 },
        { name: 'occupant', weight: 0.5 }
      ],
      threshold: 0.4
    });
  }, [rooms]);

  // Click outside to close dropdown hook
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    setActiveIndex(0);

    if (!val.trim()) {
      setResults([]);
      return;
    }

    const fuseResults = fuse.search(val);
    setResults(fuseResults.map((r) => r.item).slice(0, 8)); // Limit to top 8
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (room: Room) => {
    // Find complete room object from rooms array by matching id or name
    const fullRoom = rooms.find((r) => (r.id && r.id === room.id) || r.name === room.name) || room;
    onSelectRoom(fullRoom);
    setQuery(fullRoom.name);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search rooms, desks, or colleagues..."
          className="w-full bg-[#161922] border border-border text-white pl-9 pr-8 py-2 rounded-lg text-sm placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-lg transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Fuzzy Search Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-[#161922] border border-border rounded-lg shadow-2xl z-50 divide-y divide-border/40 select-none animate-fade-in">
          {results.map((room, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={room.id || idx}
                onClick={() => handleSelect(room)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`px-4 py-2.5 flex items-center justify-between gap-3 text-sm cursor-pointer transition-colors ${
                  isActive ? 'bg-accent/20 border-l-2 border-accent' : 'hover:bg-surface-alt'
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-white truncate">{room.name}</span>
                  {room.occupant && (
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span className="truncate">{room.occupant}</span>
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase shrink-0 font-sans tracking-wide ${getBadgeStyles(room.type)}`}>
                  {formatRoomType(room.type)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
