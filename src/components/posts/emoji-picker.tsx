"use client";

import { useState, useRef, useEffect } from "react";
import {
  Smile,
  Clock,
  Hand,
  Briefcase,
  Building2,
  Plane,
  Cpu,
  Leaf,
  Hash,
  LayoutGrid,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

interface EmojiDef {
  e: string;
  kw: string;
}

const CATEGORIES: { id: string; label: string; icon: React.ReactNode; entries: EmojiDef[] }[] = [
  {
    id: "recent",
    label: "Frequently Used",
    icon: <Clock className="size-4" />,
    entries: [
      { e: "\u{1F44D}", kw: "thumbs up yes good like" },
      { e: "\u{1F525}", kw: "fire hot lit" },
      { e: "\u{1F680}", kw: "rocket launch startup" },
      { e: "\u{1F4A1}", kw: "bulb idea light" },
      { e: "\u{1F4AF}", kw: "hundred percent perfect" },
      { e: "\u2728", kw: "sparkles magic new" },
      { e: "\u{2764}\u{FE0F}", kw: "heart love red" },
      { e: "\u{1F64F}", kw: "pray please thanks" },
      { e: "\u{1F3AF}", kw: "target goal bullseye" },
      { e: "\u{1F44F}", kw: "clap applause bravo" },
      { e: "\u{1F4AA}", kw: "muscle strong flex" },
      { e: "\u{1F914}", kw: "think thinking hmm" },
      { e: "\u{1F4C8}", kw: "chart up growth" },
      { e: "\u{1F91D}", kw: "handshake deal agree" },
      { e: "\u2714\uFE0F", kw: "check yes done" },
      { e: "\u{1F31F}", kw: "glowing star bright" },
    ],
  },
  {
    id: "smileys",
    label: "Smileys & People",
    icon: <Smile className="size-4" />,
    entries: [
      { e: "\u{1F600}", kw: "grin happy smile" },
      { e: "\u{1F603}", kw: "smile happy open" },
      { e: "\u{1F604}", kw: "laugh happy eyes" },
      { e: "\u{1F601}", kw: "grin beam" },
      { e: "\u{1F605}", kw: "sweat smile relief" },
      { e: "\u{1F602}", kw: "laugh cry tears joy" },
      { e: "\u{1F923}", kw: "rofl rolling laugh" },
      { e: "\u{1F60A}", kw: "blush smile warm" },
      { e: "\u{1F607}", kw: "angel halo innocent" },
      { e: "\u{1F642}", kw: "slight smile" },
      { e: "\u{1F643}", kw: "upside down silly" },
      { e: "\u{1F609}", kw: "wink" },
      { e: "\u{1F60D}", kw: "heart eyes love" },
      { e: "\u{1F929}", kw: "star struck excited wow" },
      { e: "\u{1F618}", kw: "kiss blow love" },
      { e: "\u{1F61C}", kw: "tongue wink playful" },
      { e: "\u{1F92D}", kw: "shy giggle hand mouth" },
      { e: "\u{1F917}", kw: "hug warm hands" },
      { e: "\u{1F914}", kw: "think thinking hmm" },
      { e: "\u{1F928}", kw: "raised eyebrow skeptic" },
      { e: "\u{1F610}", kw: "neutral straight face" },
      { e: "\u{1F611}", kw: "expressionless blank" },
      { e: "\u{1F644}", kw: "eye roll annoyed" },
      { e: "\u{1F60F}", kw: "smirk sly" },
      { e: "\u{1F60C}", kw: "relieved calm" },
      { e: "\u{1F62E}", kw: "open mouth surprised" },
      { e: "\u{1F631}", kw: "scream fear shocked" },
      { e: "\u{1F633}", kw: "flushed embarrassed" },
      { e: "\u{1F622}", kw: "cry sad tear" },
      { e: "\u{1F62D}", kw: "sobbing cry loud" },
      { e: "\u{1F621}", kw: "angry rage mad" },
      { e: "\u{1F624}", kw: "frustrated triumph huff" },
      { e: "\u{1F634}", kw: "sleep zzz tired" },
      { e: "\u{1F60E}", kw: "cool sunglasses" },
      { e: "\u{1F913}", kw: "nerd glasses geek" },
      { e: "\u{1F975}", kw: "hot face sweating" },
      { e: "\u{1F976}", kw: "cold face freezing" },
      { e: "\u{1F92F}", kw: "exploding head mind blown" },
      { e: "\u{1F973}", kw: "party celebrate hat" },
      { e: "\u{1F971}", kw: "yawn bored tired" },
      { e: "\u{1F978}", kw: "disguise incognito spy" },
      { e: "\u{1F47B}", kw: "ghost spooky" },
      { e: "\u{1F916}", kw: "robot bot ai machine" },
      { e: "\u{1F9D1}\u{200D}\u{1F4BB}", kw: "technologist developer coder person computer" },
      { e: "\u{1F9D1}\u{200D}\u{1F3EB}", kw: "teacher professor educator" },
      { e: "\u{1F9D1}\u{200D}\u{1F4BC}", kw: "office worker business professional" },
      { e: "\u{1F9D1}\u{200D}\u{1F52C}", kw: "scientist researcher lab" },
      { e: "\u{1F9D1}\u{200D}\u{1F3A8}", kw: "artist creative designer" },
    ],
  },
  {
    id: "hands",
    label: "Hands & Gestures",
    icon: <Hand className="size-4" />,
    entries: [
      { e: "\u{1F44D}", kw: "thumbs up yes good like" },
      { e: "\u{1F44E}", kw: "thumbs down no bad" },
      { e: "\u{1F44F}", kw: "clap applause bravo" },
      { e: "\u{1F64C}", kw: "raised hands celebrate" },
      { e: "\u{1F91D}", kw: "handshake deal agree" },
      { e: "\u{1F64F}", kw: "pray please thanks" },
      { e: "\u{270C}\u{FE0F}", kw: "peace victory" },
      { e: "\u{1F446}", kw: "point up above" },
      { e: "\u{1F447}", kw: "point down below" },
      { e: "\u{1F449}", kw: "point right next" },
      { e: "\u{1F448}", kw: "point left back" },
      { e: "\u{261D}\u{FE0F}", kw: "index up one important" },
      { e: "\u{1F4AA}", kw: "muscle strong flex" },
      { e: "\u{1F91E}", kw: "fingers crossed luck" },
      { e: "\u{270A}", kw: "fist bump power" },
      { e: "\u{1F918}", kw: "rock on horns metal" },
      { e: "\u{1F919}", kw: "call shaka hang loose" },
      { e: "\u{1F44B}", kw: "wave hello hi bye" },
      { e: "\u{1F44C}", kw: "ok perfect fine" },
      { e: "\u{1F596}", kw: "vulcan spock" },
      { e: "\u{1F90C}", kw: "pinched fingers italian" },
      { e: "\u{1F90F}", kw: "pinching small tiny" },
      { e: "\u{1F9E0}", kw: "brain smart mind" },
      { e: "\u{1F440}", kw: "eyes look see watch" },
      { e: "\u{1F4AC}", kw: "speech bubble chat talk" },
      { e: "\u{1F4AD}", kw: "thought bubble thinking" },
      { e: "\u{1F5E3}\u{FE0F}", kw: "speaking head voice" },
    ],
  },
  {
    id: "business",
    label: "Business & Finance",
    icon: <Briefcase className="size-4" />,
    entries: [
      { e: "\u{1F4BC}", kw: "briefcase business work job" },
      { e: "\u{1F4C8}", kw: "chart up growth trending increase" },
      { e: "\u{1F4C9}", kw: "chart down decline decrease" },
      { e: "\u{1F4CA}", kw: "chart bar graph data analytics" },
      { e: "\u{1F4B0}", kw: "money bag cash dollar revenue" },
      { e: "\u{1F4B5}", kw: "dollar bill money cash" },
      { e: "\u{1F4B3}", kw: "credit card payment" },
      { e: "\u{1F4B8}", kw: "money wings flying spend" },
      { e: "\u{1F4B9}", kw: "chart yen currency exchange" },
      { e: "\u{1F4B2}", kw: "dollar sign money" },
      { e: "\u{1F4C4}", kw: "document page paper contract" },
      { e: "\u{1F4DD}", kw: "memo note write pencil" },
      { e: "\u{1F4CB}", kw: "clipboard list tasks checklist" },
      { e: "\u{1F4C1}", kw: "folder file organize" },
      { e: "\u{1F4C2}", kw: "folder open file" },
      { e: "\u{1F4C5}", kw: "calendar date schedule" },
      { e: "\u{1F4C6}", kw: "calendar tearoff date" },
      { e: "\u{1F4C3}", kw: "page curl document" },
      { e: "\u{1F4CE}", kw: "paperclip attachment" },
      { e: "\u{1F3C6}", kw: "trophy award winner cup" },
      { e: "\u{1F3C5}", kw: "medal gold achievement" },
      { e: "\u{1F396}\u{FE0F}", kw: "military medal honor" },
      { e: "\u{1F381}", kw: "gift present box" },
      { e: "\u{1F4E6}", kw: "package box shipping product" },
      { e: "\u{1F4E8}", kw: "incoming email mail" },
      { e: "\u{1F4E9}", kw: "outgoing email mail sent" },
      { e: "\u{1F4E7}", kw: "email mail message" },
      { e: "\u{1F4E2}", kw: "megaphone announce loud" },
      { e: "\u{1F4E3}", kw: "megaphone cheering" },
      { e: "\u{1F4F0}", kw: "newspaper news press media" },
      { e: "\u{1F5DE}\u{FE0F}", kw: "rolled newspaper media press" },
      { e: "\u{1F4C0}", kw: "dvd disc data" },
    ],
  },
  {
    id: "buildings",
    label: "Buildings & Travel",
    icon: <Building2 className="size-4" />,
    entries: [
      { e: "\u{1F3E2}", kw: "office building business corporate" },
      { e: "\u{1F3E3}", kw: "post office building" },
      { e: "\u{1F3E4}", kw: "european post office" },
      { e: "\u{1F3E5}", kw: "hospital medical health" },
      { e: "\u{1F3E6}", kw: "bank finance money" },
      { e: "\u{1F3E8}", kw: "hotel travel lodging" },
      { e: "\u{1F3EB}", kw: "school education learning" },
      { e: "\u{1F3EC}", kw: "department store shopping" },
      { e: "\u{1F3ED}", kw: "factory manufacturing industry" },
      { e: "\u{1F3DB}\u{FE0F}", kw: "classical building government" },
      { e: "\u{1F3D7}\u{FE0F}", kw: "construction building crane" },
      { e: "\u{1F3D8}\u{FE0F}", kw: "houses neighborhood community" },
      { e: "\u{1F3D9}\u{FE0F}", kw: "cityscape skyline urban city" },
      { e: "\u{1F3DA}\u{FE0F}", kw: "house garden home remote" },
      { e: "\u{1F3E0}", kw: "house home" },
      { e: "\u{1F5FC}", kw: "tower tokyo landmark" },
      { e: "\u{1F30D}", kw: "earth globe world europe africa" },
      { e: "\u{1F30E}", kw: "globe americas world" },
      { e: "\u{1F30F}", kw: "globe asia world" },
      { e: "\u{1F5FA}\u{FE0F}", kw: "world map global" },
    ],
  },
  {
    id: "travel",
    label: "Transport & Travel",
    icon: <Plane className="size-4" />,
    entries: [
      { e: "\u{2708}\u{FE0F}", kw: "airplane plane flight travel" },
      { e: "\u{1F6EB}", kw: "airplane departure takeoff travel" },
      { e: "\u{1F6EC}", kw: "airplane arrival landing travel" },
      { e: "\u{1F680}", kw: "rocket launch startup fast space" },
      { e: "\u{1F6F8}", kw: "flying saucer ufo alien" },
      { e: "\u{1F683}", kw: "train railway transport" },
      { e: "\u{1F685}", kw: "bullet train fast speed" },
      { e: "\u{1F695}", kw: "taxi cab car ride" },
      { e: "\u{1F697}", kw: "car automobile vehicle" },
      { e: "\u{1F699}", kw: "suv car truck" },
      { e: "\u{1F6F4}", kw: "scooter kick" },
      { e: "\u{1F6B2}", kw: "bicycle bike cycling" },
      { e: "\u{1F6F3}\u{FE0F}", kw: "cruise ship boat travel" },
      { e: "\u{26F5}", kw: "sailboat boat wind" },
      { e: "\u{1F3D6}\u{FE0F}", kw: "beach umbrella vacation" },
      { e: "\u{1F5FB}", kw: "mountain fuji" },
      { e: "\u{26F0}\u{FE0F}", kw: "mountain peak summit" },
      { e: "\u{1F3D5}\u{FE0F}", kw: "camping tent outdoor" },
      { e: "\u{1F9F3}", kw: "luggage suitcase travel bag" },
      { e: "\u{1F6C2}", kw: "passport customs travel" },
      { e: "\u{23F0}", kw: "alarm clock time" },
      { e: "\u{23F1}\u{FE0F}", kw: "stopwatch timer speed" },
      { e: "\u{23F3}", kw: "hourglass time waiting" },
      { e: "\u{1F570}\u{FE0F}", kw: "mantelpiece clock time" },
    ],
  },
  {
    id: "tech",
    label: "Technology & AI",
    icon: <Cpu className="size-4" />,
    entries: [
      { e: "\u{1F4BB}", kw: "laptop computer work tech" },
      { e: "\u{1F5A5}\u{FE0F}", kw: "desktop computer monitor screen" },
      { e: "\u{1F4F1}", kw: "phone mobile smartphone" },
      { e: "\u{1F4F2}", kw: "phone arrow mobile calling" },
      { e: "\u{2328}\u{FE0F}", kw: "keyboard typing code" },
      { e: "\u{1F5A8}\u{FE0F}", kw: "printer print document" },
      { e: "\u{1F916}", kw: "robot ai bot machine artificial intelligence" },
      { e: "\u{1F9E0}", kw: "brain ai smart mind neural intelligence thinking" },
      { e: "\u{1F9EC}", kw: "dna genetics science biotech" },
      { e: "\u{1F52C}", kw: "microscope science research lab" },
      { e: "\u{1F52D}", kw: "telescope space explore discover" },
      { e: "\u{2699}\u{FE0F}", kw: "gear settings config automation" },
      { e: "\u{1F517}", kw: "link chain url connect" },
      { e: "\u{1F310}", kw: "globe web internet network world" },
      { e: "\u{1F4E1}", kw: "satellite antenna signal wireless" },
      { e: "\u{1F50C}", kw: "plug power electric connect" },
      { e: "\u{1F50B}", kw: "battery power energy charge" },
      { e: "\u{1F4A0}", kw: "diamond gem quality" },
      { e: "\u{1F527}", kw: "wrench tool fix" },
      { e: "\u{1F529}", kw: "nut bolt hardware" },
      { e: "\u{1F512}", kw: "lock secure private security" },
      { e: "\u{1F513}", kw: "unlock open access" },
      { e: "\u{1F511}", kw: "key access password auth" },
      { e: "\u{1F6E1}\u{FE0F}", kw: "shield security protect defense" },
      { e: "\u{1F4A1}", kw: "bulb idea light innovation" },
      { e: "\u{1F50D}", kw: "search magnify find look discover" },
      { e: "\u{1F4BE}", kw: "floppy disk save storage data" },
      { e: "\u{1F4BF}", kw: "cd disc optical" },
      { e: "\u{1F4E0}", kw: "fax machine retro" },
      { e: "\u{1F4F7}", kw: "camera photo image" },
      { e: "\u{1F3A5}", kw: "movie camera video film" },
      { e: "\u{1F399}\u{FE0F}", kw: "microphone podcast studio recording" },
      { e: "\u{1F3A7}", kw: "headphone audio music listen" },
      { e: "\u{1F4FA}", kw: "television tv screen media" },
      { e: "\u{1F4FB}", kw: "radio broadcast media" },
      { e: "\u{1F50E}", kw: "magnify search zoom detail" },
    ],
  },
  {
    id: "nature",
    label: "Nature & Weather",
    icon: <Leaf className="size-4" />,
    entries: [
      { e: "\u{1F33F}", kw: "herb leaf green" },
      { e: "\u{1F331}", kw: "seedling grow sprout" },
      { e: "\u{1F332}", kw: "tree evergreen pine" },
      { e: "\u{1F333}", kw: "deciduous tree oak" },
      { e: "\u{1F334}", kw: "palm tree tropical" },
      { e: "\u{1F335}", kw: "cactus desert" },
      { e: "\u{1F338}", kw: "cherry blossom flower" },
      { e: "\u{1F339}", kw: "rose flower red" },
      { e: "\u{1F33B}", kw: "sunflower yellow bright" },
      { e: "\u{1F33A}", kw: "hibiscus flower tropical" },
      { e: "\u{2600}\u{FE0F}", kw: "sun sunny bright" },
      { e: "\u{1F324}\u{FE0F}", kw: "sun behind cloud partly" },
      { e: "\u{26C5}", kw: "cloud sun partly cloudy" },
      { e: "\u{1F327}\u{FE0F}", kw: "rain cloud weather" },
      { e: "\u{26C8}\u{FE0F}", kw: "thunder lightning storm" },
      { e: "\u{1F308}", kw: "rainbow colors" },
      { e: "\u{26A1}", kw: "lightning bolt energy power" },
      { e: "\u{1F30A}", kw: "wave ocean water" },
      { e: "\u{1F525}", kw: "fire hot flame" },
      { e: "\u{1F43E}", kw: "paw prints animal" },
      { e: "\u{1F981}", kw: "lion king brave leader" },
      { e: "\u{1F985}", kw: "eagle bird freedom" },
      { e: "\u{1F422}", kw: "turtle slow steady patient" },
      { e: "\u{1F41D}", kw: "bee honey busy worker" },
      { e: "\u{1F98B}", kw: "butterfly transform change" },
      { e: "\u{1F40D}", kw: "snake python code" },
      { e: "\u{1F433}", kw: "whale big ocean" },
      { e: "\u{1F42C}", kw: "dolphin smart play" },
    ],
  },
  {
    id: "symbols",
    label: "Symbols & Punctuation",
    icon: <Hash className="size-4" />,
    entries: [
      { e: "\u2714\uFE0F", kw: "check yes done correct" },
      { e: "\u274C", kw: "cross no wrong delete" },
      { e: "\u2705", kw: "green check done complete" },
      { e: "\u274E", kw: "cross mark no" },
      { e: "\u26A0\uFE0F", kw: "warning caution alert" },
      { e: "\u2139\uFE0F", kw: "info information" },
      { e: "\u2049\uFE0F", kw: "exclamation question interrobang" },
      { e: "\u2757", kw: "exclamation mark important" },
      { e: "\u2753", kw: "question mark" },
      { e: "\u27A1\uFE0F", kw: "arrow right next forward" },
      { e: "\u2B05\uFE0F", kw: "arrow left back previous" },
      { e: "\u2B06\uFE0F", kw: "arrow up increase rise" },
      { e: "\u2B07\uFE0F", kw: "arrow down decrease drop" },
      { e: "\u{21A9}\u{FE0F}", kw: "arrow return reply back" },
      { e: "\u{1F504}", kw: "cycle refresh repeat loop" },
      { e: "\u{1F501}", kw: "repeat loop again" },
      { e: "\u{1F503}", kw: "reload refresh sync" },
      { e: "\u{1F4AF}", kw: "hundred perfect score" },
      { e: "\u2728", kw: "sparkles magic new shiny" },
      { e: "\u{1F31F}", kw: "glowing star bright" },
      { e: "\u{1F6A8}", kw: "siren alert emergency" },
      { e: "\u{1F514}", kw: "bell notification ring" },
      { e: "\u{1F515}", kw: "bell muted silent no notification" },
      { e: "\u{1F4CC}", kw: "pin pushpin location" },
      { e: "\u{2764}\u{FE0F}", kw: "heart love red" },
      { e: "\u{1F9E1}", kw: "orange heart" },
      { e: "\u{1F49B}", kw: "yellow heart" },
      { e: "\u{1F49A}", kw: "green heart" },
      { e: "\u{1F499}", kw: "blue heart" },
      { e: "\u{1F49C}", kw: "purple heart" },
      { e: "\u{1F5A4}", kw: "black heart" },
      { e: "\u{1F90D}", kw: "white heart" },
      { e: "\u{1F389}", kw: "party popper celebrate" },
      { e: "\u{1F38A}", kw: "confetti celebrate" },
      { e: "\u{1F3AF}", kw: "target goal bullseye focus" },
      { e: "\u{2B50}", kw: "star favorite gold" },
      { e: "\u2014", kw: "em dash punctuation long dash" },
      { e: "\u2022", kw: "bullet point dot list" },
      { e: "\u2013", kw: "en dash range" },
      { e: "\u2026", kw: "ellipsis dots three" },
      { e: "\u00AB", kw: "guillemet left quote" },
      { e: "\u00BB", kw: "guillemet right quote" },
      { e: "\u00A9", kw: "copyright" },
      { e: "\u00AE", kw: "registered trademark" },
      { e: "\u2122", kw: "trademark tm" },
      { e: "\u267E\uFE0F", kw: "infinity forever endless" },
      { e: "\u{1F4A4}", kw: "zzz sleep" },
    ],
  },
];

// Build flat searchable list (deduplicated)
const ALL_ENTRIES = (() => {
  const seen = new Set<string>();
  return CATEGORIES.flatMap((cat) =>
    cat.entries
      .filter((entry) => {
        if (seen.has(entry.e)) return false;
        seen.add(entry.e);
        return true;
      })
      .map((entry) => ({
        emoji: entry.e,
        keywords: `${cat.label.toLowerCase()} ${entry.kw}`,
      }))
  );
})();

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("recent");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
      setActiveTab("recent");
    }
  }, [open]);

  function handleSelect(emoji: string) {
    onSelect(emoji);
    setOpen(false);
  }

  function handleTabClick(id: string) {
    setActiveTab(id);
    setSearch("");
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const searchResults = isSearching
    ? ALL_ENTRIES.filter((e) => e.keywords.includes(query)).map((e) => e.emoji)
    : [];

  const activeCategory = CATEGORIES.find((c) => c.id === activeTab);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="xs" className="gap-1" />}
      >
        <Smile className="size-3" />
        Emoji
      </PopoverTrigger>
      <PopoverContent align="start" className="!p-0 !gap-0 w-[320px]">
        {/* Search bar */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Smile className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); inputRef.current?.focus(); }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        {!isSearching && (
          <div className="flex items-center border-b px-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTabClick("all")}
              className={`flex items-center justify-center shrink-0 p-2 transition-colors hover:bg-muted rounded-sm ${
                activeTab === "all"
                  ? "text-foreground border-b-2 border-primary -mb-px"
                  : "text-muted-foreground"
              }`}
              title="All Emojis"
            >
              <LayoutGrid className="size-4" />
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleTabClick(cat.id)}
                className={`flex items-center justify-center shrink-0 p-2 transition-colors hover:bg-muted rounded-sm ${
                  activeTab === cat.id
                    ? "text-foreground border-b-2 border-primary -mb-px"
                    : "text-muted-foreground"
                }`}
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )}

        {/* Emoji grid */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ height: "260px" }}
        >
          {isSearching ? (
            <div className="p-2">
              {searchResults.length > 0 ? (
                <>
                  <div className="px-1 pb-1 text-[11px] font-semibold text-muted-foreground">
                    Search Results
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(8, 1fr)",
                    }}
                  >
                    {searchResults.map((emoji, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelect(emoji)}
                        className="flex items-center justify-center rounded p-1 text-xl hover:bg-muted transition-colors cursor-pointer aspect-square"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No emojis found
                </p>
              )}
            </div>
          ) : activeTab === "all" ? (
            <div className="p-2">
              {CATEGORIES.filter((c) => c.id !== "recent").map((cat) => (
                <div key={cat.id} className="mb-3 last:mb-0">
                  <div className="px-1 pb-1 text-[11px] font-semibold text-muted-foreground sticky top-0 bg-popover z-10">
                    {cat.label}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(8, 1fr)",
                    }}
                  >
                    {cat.entries.map((entry, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelect(entry.e)}
                        className="flex items-center justify-center rounded p-1 text-xl hover:bg-muted transition-colors cursor-pointer aspect-square"
                      >
                        {entry.e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeCategory ? (
            <div className="p-2">
              <div className="px-1 pb-1 text-[11px] font-semibold text-muted-foreground">
                {activeCategory.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 1fr)",
                }}
              >
                {activeCategory.entries.map((entry, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(entry.e)}
                    className="flex items-center justify-center rounded p-1 text-xl hover:bg-muted transition-colors cursor-pointer aspect-square"
                  >
                    {entry.e}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
